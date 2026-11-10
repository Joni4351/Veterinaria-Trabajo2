import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardView } from '../views/DashboardView';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Prueba', role: 'Administrador' } }) }));
vi.mock('../components/VeterinaryPet3D', () => ({ default: () => null }));
beforeEach(() => vi.clearAllMocks());

it('carga estadísticas y vistas previas con una sola solicitud, sin descargar seis listados', async () => {
  api.get.mockResolvedValue({ data: {
    estadisticas: { pacientes: 120, clientes: 50, citas: 30, facturas: 10, insumos: 45, consultas: 25 },
    citasRecientes: [{ id: 1, estado: 'Confirmada', paciente: { nombre: 'Luna', cliente: { nombreCompleto: 'Dueño', documentoIdentidad: '12.345.678-5' } } }],
    insumosBajoStock: [{ id: 1, nombreProducto: 'Insumo limitado', stockActual: 2 }]
  } });
  render(<MemoryRouter><DashboardView /></MemoryRouter>);
  await screen.findByText('Luna');
  expect(screen.getByText('120')).toBeInTheDocument();
  expect(screen.getByText('Insumo limitado')).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(api.get).toHaveBeenCalledWith('/api/v1/dashboard', expect.objectContaining({ signal: expect.any(AbortSignal) }));
});

it('cancela la carga al abandonar el dashboard', async () => {
  api.get.mockImplementation(() => new Promise(() => {}));
  const { unmount } = render(<MemoryRouter><DashboardView /></MemoryRouter>);
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
  const signal = api.get.mock.calls[0][1].signal;
  expect(signal.aborted).toBe(false);
  unmount();
  expect(signal.aborted).toBe(true);
});
