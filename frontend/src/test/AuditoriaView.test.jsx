import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuditoriaView } from '../views/AuditoriaView';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));
const event = { id: 8, fechaHora: '2026-11-08T12:00:00Z', usuarioNombre: 'Admin de prueba', usuarioId: 1, accion: 'MODIFICAR', entidad: 'Insumos', registroId: 2, origen: 'API', operacionId: 'b33a26d1-1111-4111-8111-123456789012' };
const mount = () => render(<MemoryRouter><AuditoriaView /></MemoryRouter>);
beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: { role: 'Administrador' }, loading: false });
  api.get.mockImplementation(url => Promise.resolve({ data: url.endsWith('/entidades') ? ['Insumos', 'Pacientes'] : url.endsWith('/8') ? { ...event, valoresAnteriores: { StockActual: 10 }, valoresNuevos: { StockActual: 8 } } : { registros: [event], total: 1 } }));
});
it('muestra historial, abre valores y filtra la operación relacionada', async () => {
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }));
  expect(await screen.findByText('StockActual')).toBeInTheDocument();
  expect(screen.getByText('10', { selector: 'td' })).toBeInTheDocument();
  expect(screen.getByText('8', { selector: 'td' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver cambios de esta operación' }));
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/v1/admin/auditoria', expect.objectContaining({ params: expect.objectContaining({ operacionId: event.operacionId }) })));
});
it('permite filtrar por acción y responsable', async () => {
  mount(); await screen.findByRole('button', { name: 'Ver detalle' });
  fireEvent.change(screen.getByLabelText('Acción'), { target: { value: 'ELIMINAR' } });
  fireEvent.change(screen.getByLabelText('Responsable'), { target: { value: 'María' } });
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/v1/admin/auditoria', expect.objectContaining({ params: expect.objectContaining({ accion: 'ELIMINAR', usuario: 'María', pagina: 1 }) })));
});
it('impide consultar el historial a otro rol', () => {
  useAuth.mockReturnValue({ user: { role: 'Veterinario' }, loading: false });
  mount(); expect(api.get).not.toHaveBeenCalled();
});
