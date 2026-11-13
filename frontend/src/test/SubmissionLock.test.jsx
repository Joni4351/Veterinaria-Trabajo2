import React from 'react';
import { expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { AccessibleForm, SubmitButton } from '../components/AccessibleForm';
import { ConfirmModal } from '../components/ConfirmModal';
import { useAsyncActionLock } from '../hooks/useAsyncActionLock';

it('bloquea envíos simultáneos incluso si se envía el formulario directamente y respeta otros motivos de bloqueo', async () => {
  let finish;
  const save = vi.fn(() => new Promise(resolve => { finish = resolve; }));
  render(<AccessibleForm aria-label="Registro" onSubmit={save}><SubmitButton>Registrar</SubmitButton><SubmitButton disabled>No disponible</SubmitButton></AccessibleForm>);
  const form = screen.getByRole('form', { name: 'Registro' });
  const button = screen.getByRole('button', { name: 'Registrar' });
  fireEvent.click(button);
  fireEvent.submit(form); fireEvent.submit(form);
  expect(save).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();
  expect(button).toHaveTextContent('Procesando…');
  expect(form).toHaveAttribute('aria-busy', 'true');
  await act(async () => finish());
  expect(button).toBeEnabled();
  expect(button).toHaveTextContent('Registrar');
  expect(screen.getByRole('button', { name: 'No disponible' })).toBeDisabled();
  fireEvent.click(button);
  expect(save).toHaveBeenCalledTimes(2);
  await act(async () => finish());
});

it('libera el bloqueo ante un error para permitir un reintento', async () => {
  let reject;
  const action = vi.fn(() => new Promise((_, fail) => { reject = fail; }));
  const { result } = renderHook(() => useAsyncActionLock());
  let operation;
  act(() => { operation = result.current.run(action).catch(error => error.message); });
  expect(result.current.pending).toBe(true);
  await act(async () => { reject(new Error('Sin conexión')); expect(await operation).toBe('Sin conexión'); });
  expect(result.current.pending).toBe(false);
  await act(async () => { await result.current.run(() => 'Reintentado'); });
  expect(result.current.pending).toBe(false);
});

it('bloquea confirmaciones y cancelación mientras la acción está pendiente', async () => {
  let finish;
  const confirm = vi.fn(() => new Promise(resolve => { finish = resolve; }));
  const cancel = vi.fn();
  render(<ConfirmModal isOpen title="Registro" confirmText="Confirmar registro" onConfirm={confirm} onCancel={cancel} />);
  const button = screen.getByRole('button', { name: 'Confirmar registro' });
  fireEvent.click(button); fireEvent.click(button);
  fireEvent.keyDown(button, { key: 'Escape' });
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  expect(cancel).not.toHaveBeenCalled();
  await act(async () => finish());
  await waitFor(() => expect(button).toBeEnabled());
});
