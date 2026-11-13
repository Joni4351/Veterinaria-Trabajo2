import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SuccessNotification } from '../components/SuccessNotification';
import { notifySuccess } from '../services/notifications';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('solo muestra confirmaciones explícitas y permite cerrarlas', () => {
  render(<SuccessNotification />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  act(() => notifySuccess('Cliente registrado correctamente.'));
  expect(screen.getByRole('status')).toHaveTextContent('Cliente registrado correctamente.');
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar confirmación' }));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('mantiene la notificación mientras se interactúa y la retira después', () => {
  render(<SuccessNotification />);
  act(() => notifySuccess('Paciente actualizado correctamente.'));
  fireEvent.mouseEnter(screen.getByRole('status'));
  act(() => vi.advanceTimersByTime(10000));
  expect(screen.getByRole('status')).toBeInTheDocument();
  fireEvent.mouseLeave(screen.getByRole('status'));
  act(() => vi.advanceTimersByTime(8000));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('renueva el aviso para operaciones consecutivas sin acumular temporizadores', () => {
  render(<SuccessNotification />);
  act(() => notifySuccess('Cita registrada correctamente.'));
  act(() => vi.advanceTimersByTime(7000));
  act(() => notifySuccess('Cita actualizada correctamente.'));
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole('status')).toHaveTextContent('Cita actualizada correctamente.');
  act(() => vi.advanceTimersByTime(7000));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('ignora eventos vacíos o ajenos a las confirmaciones de éxito', () => {
  render(<SuccessNotification />);
  act(() => {
    notifySuccess(' ');
    window.dispatchEvent(new CustomEvent('vet:success', { detail: { message: null } }));
    window.dispatchEvent(new CustomEvent('vet:forbidden', { detail: { mensaje: 'Denegado' } }));
  });
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
