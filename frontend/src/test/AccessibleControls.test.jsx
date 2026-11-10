import React, { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AccessibleDialog } from '../components/AccessibleDialog';
import { AccessibleForm, RequiredIndicator } from '../components/AccessibleForm';

it('mantiene el foco en el diálogo y lo devuelve al control inicial', () => {
  function Example() {
    const [open, setOpen] = useState(false);
    return <><button onClick={() => setOpen(true)}>Abrir</button>{open && <AccessibleDialog aria-label="Prueba" onClose={() => setOpen(false)}><button>Primero</button><button>Último</button></AccessibleDialog>}</>;
  }
  render(<Example />);
  const open = screen.getByRole('button', { name: 'Abrir' }); open.focus(); fireEvent.click(open);
  const first = screen.getByRole('button', { name: 'Primero' }), last = screen.getByRole('button', { name: 'Último' });
  last.focus(); fireEvent.keyDown(last, { key: 'Tab' }); expect(first).toHaveFocus();
  fireEvent.keyDown(first, { key: 'Tab', shiftKey: true }); expect(last).toHaveFocus();
  fireEvent.keyDown(last, { key: 'Escape' }); expect(open).toHaveFocus(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('marca los campos obligatorios sin cambiar su nombre accesible y enfoca el primer error', async () => {
  function Example() {
    const [invalid, setInvalid] = useState(false);
    return <AccessibleForm noValidate onSubmit={() => setInvalid(true)}><label htmlFor="field">Nombre<RequiredIndicator /></label><input id="field" required aria-invalid={invalid} aria-describedby={invalid ? 'field-error' : undefined} />{invalid && <span id="field-error" role="alert">Ingrese el nombre.</span>}<button>Guardar</button></AccessibleForm>;
  }
  render(<Example />);
  const field = screen.getByRole('textbox', { name: 'Nombre', exact: true });
  expect(field).toBeRequired();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(field).toHaveFocus());
  expect(field).toHaveAccessibleDescription('Ingrese el nombre.');
});
it('un diálogo bloqueado no propaga Escape a la navegación del fondo', () => {
  const background = vi.fn(); window.addEventListener('keydown', background);
  const { unmount } = render(<AccessibleDialog aria-label="Guardando"><button>Esperar</button></AccessibleDialog>);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Esperar' }), { key: 'Escape' });
  expect(background).not.toHaveBeenCalled(); expect(screen.getByRole('dialog')).toBeInTheDocument();
  unmount(); window.removeEventListener('keydown', background);
});
