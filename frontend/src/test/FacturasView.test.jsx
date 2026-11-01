import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { FacturasView } from '../views/FacturasView';
import * as AuthContext from '../context/AuthContext';
import api from '../services/api';

vi.mock('../services/api');

describe('FacturasView Component Tests', () => {
  const mockClientes = [
    { id: 1, nombreCompleto: 'Juan Pérez', documentoIdentidad: '12345678-K' }
  ];

  const mockCitas = [
    {
      id: 10,
      pacienteId: 1,
      paciente: { id: 1, nombre: 'Max', especie: 'Perro', clienteId: 1, cliente: { id: 1, nombreCompleto: 'Juan Pérez', documentoIdentidad: '12345678-K' } },
      especialidadId: 5,
      especialidad: { id: 5, nombre: 'Consulta General', costoBase: 25000 },
      usuario: { id: 2, nombreCompleto: 'Dra. Laura Torres' },
      fechaHora: '2026-09-02T10:00:00',
      estado: 'Completada'
    }
  ];

  const mockInsumos = [
    { id: 20, nombreProducto: 'Antiséptico', tipo: 'Fármaco', stockActual: 15, precioUnitario: 3000 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { nombre: 'Admin', rol: 'Administrador' },
      hasRole: () => true,
      isAdmin: true
    });

    api.get.mockImplementation((url) => {
      if (url === '/api/v1/facturas') return Promise.resolve({ data: [] });
      if (url === '/api/v1/clientes') return Promise.resolve({ data: mockClientes });
      if (url === '/api/v1/citas') return Promise.resolve({ data: mockCitas });
      if (url === '/api/v1/insumos') return Promise.resolve({ data: mockInsumos });
      if (url === '/api/v1/consultas') return Promise.resolve({ data: [] });
      if (url === '/api/v1/detallefac') return Promise.resolve({ data: [] });
      if (url === '/api/v1/especialidades') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
  });

  it('debe renderizar FacturasView sin pantalla en blanco ni errores de montaje', async () => {
    render(<FacturasView />);

    await waitFor(() => {
      expect(screen.getByText(/Gestión de Facturación y Cobros/i)).toBeInTheDocument();
    });
  });

  it('debe abrir el modal de facturación y permitir seleccionar la cita médica', async () => {
    render(<FacturasView />);

    await waitFor(() => {
      expect(screen.getByText(/Emitir Factura/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Emitir Factura/i));

    await waitFor(() => {
      expect(screen.getByText(/2. Selección de Cita Médica Registrada/i)).toBeInTheDocument();
    });
  });
});
