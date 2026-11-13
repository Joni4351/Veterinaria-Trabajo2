import React from 'react';
import { expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ClientesView } from '../views/ClientesView';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ isAdmin: false, hasRole: roles => roles.includes('Recepcionista') }) }));

it('recepción ve alta y edición, puede guardar y no dispone de eliminación', async () => {
  const client = { id: 8, documentoIdentidad: '12.345.678-5', nombreCompleto: 'Cliente prueba', telefono: '+56912345678', email: 'cliente@example.invalid' };
  api.get.mockResolvedValue({ data: [client] }); api.put.mockResolvedValue({ data: client });
  render(<ClientesView />);
  expect(screen.getByRole('button', { name: 'Nuevo Cliente' })).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'Editar cliente Cliente prueba' }));
  expect(screen.queryByRole('button', { name: /Eliminar cliente/ })).not.toBeInTheDocument();
  fireEvent.change(within(screen.getByRole('dialog')).getByLabelText(/Nombre Completo/), { target: { value: 'Cliente actualizado' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios', exact: true }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/v1/clientes/8', expect.objectContaining({ nombreCompleto: 'Cliente actualizado' })));
});
