import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PacientesView } from '../views/PacientesView';
import * as AuthContext from '../context/AuthContext';
import { pacientesService } from '../services/pacientesService';
import { clientesService } from '../services/clientesService';

// Mock de servicios
vi.mock('../services/pacientesService');
vi.mock('../services/clientesService');

describe('PacientesView CRUD Component Tests', () => {
  const mockPacientes = [
    {
      id: 1,
      nombre: 'Firulais',
      especie: 'Canino',
      raza: 'Golden Retriever',
      peso: 28.5,
      clienteId: 10,
      alergias: 'Polen',
      cliente: { id: 10, nombreCompleto: 'Carlos Gómez' }
    },
    {
      id: 2,
      nombre: 'Michi',
      especie: 'Felino',
      raza: 'Siamés',
      peso: 4.2,
      clienteId: 20,
      alergias: null,
      cliente: { id: 20, nombreCompleto: 'Ana Martínez' }
    }
  ];

  const mockClientes = [
    { id: 10, nombreCompleto: 'Carlos Gómez', documentoIdentidad: '12345678-9' },
    { id: 20, nombreCompleto: 'Ana Martínez', documentoIdentidad: '98765432-1' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { name: 'Admin User', role: 'Administrador' },
      hasRole: () => true,
      isAdmin: true,
    });
    pacientesService.getAll.mockResolvedValue(mockPacientes);
    clientesService.getAll.mockResolvedValue(mockClientes);
  });

  it('debe mostrar el estado de carga mientras se obtienen los datos', () => {
    pacientesService.getAll.mockReturnValue(new Promise(() => {}));
    clientesService.getAll.mockResolvedValue([]);

    render(<PacientesView />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/catálogo de pacientes/i)).toBeInTheDocument();
  });

  it('debe mostrar el estado vacío (EmptyState) si la lista de pacientes está vacía', async () => {
    pacientesService.getAll.mockResolvedValueOnce([]);

    render(<PacientesView />);

    await waitFor(() => {
      expect(screen.getByText(/no se encontraron pacientes/i)).toBeInTheDocument();
    });
  });

  it('debe renderizar la lista de pacientes con sus columnas en la tabla', async () => {
    render(<PacientesView />);

    await waitFor(() => {
      expect(screen.getByText('Firulais')).toBeInTheDocument();
      expect(screen.getByText('Michi')).toBeInTheDocument();
      expect(screen.getByText('Golden Retriever')).toBeInTheDocument();
      expect(screen.getByText('Carlos Gómez')).toBeInTheDocument();
    });
  });

  it('debe abrir el modal de creación y validar campos requeridos con Zod', async () => {
    const user = userEvent.setup();
    render(<PacientesView />);

    await waitFor(() => {
      expect(screen.getByText('Firulais')).toBeInTheDocument();
    });

    const newBtn = screen.getByRole('button', { name: /nuevo paciente/i });
    await user.click(newBtn);

    const modal = screen.getByRole('dialog');
    expect(within(modal).getByRole('heading', { name: /registrar nuevo paciente/i })).toBeInTheDocument();

    // Guardar con nombre vacío
    const saveBtn = within(modal).getByRole('button', { name: /registrar paciente/i });
    fireEvent.submit(saveBtn.closest('form'));

    await waitFor(() => {
      expect(within(modal).getByText(/el nombre del paciente es obligatorio/i)).toBeInTheDocument();
    });

    expect(pacientesService.create).not.toHaveBeenCalled();
  });

  it('debe crear un nuevo paciente correctamente al completar el formulario', async () => {
    const user = userEvent.setup();
    pacientesService.create.mockResolvedValueOnce({
      id: 3,
      nombre: 'Rocky',
      especie: 'Canino',
      raza: 'Bulldog',
      peso: 22.0,
      clienteId: 10,
      alergias: 'Ninguna'
    });

    render(<PacientesView />);

    await waitFor(() => {
      expect(screen.getByText('Firulais')).toBeInTheDocument();
    });

    const newBtn = screen.getByRole('button', { name: /nuevo paciente/i });
    await user.click(newBtn);

    const modal = screen.getByRole('dialog');

    // Llenar campos requeridos y opcionales dentro del modal
    await user.type(within(modal).getByLabelText(/nombre del paciente/i), 'Rocky');
    await user.selectOptions(within(modal).getByLabelText(/especie/i), 'Canino');
    await user.type(within(modal).getByLabelText(/raza/i), 'Bulldog');
    await user.type(within(modal).getByLabelText(/peso/i), '22');
    await user.selectOptions(within(modal).getByLabelText(/dueño/i), '10');

    const saveBtn = within(modal).getByRole('button', { name: /registrar paciente/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(pacientesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Rocky',
          especie: 'Canino',
          raza: 'Bulldog',
          peso: 22,
          clienteId: 10
        })
      );
    });
  });

  it('debe solicitar confirmación con ConfirmModal antes de eliminar un paciente', async () => {
    render(<PacientesView />);

    await waitFor(() => {
      expect(screen.getByText('Firulais')).toBeInTheDocument();
    });

    // Encontrar botón de eliminar para Firulais
    const deleteBtn = screen.getByRole('button', { name: /eliminar paciente firulais/i });
    fireEvent.click(deleteBtn);

    // Debe mostrar el diálogo de confirmación accesible
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/¿eliminar paciente\?/i)).toBeInTheDocument();
    expect(screen.getByText(/¿está seguro de que desea eliminar a "firulais"\?/i)).toBeInTheDocument();

    // Cancelar no llama al servicio
    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelBtn);

    expect(pacientesService.delete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('debe llamar a delete y refrescar la lista al confirmar eliminación', async () => {
    pacientesService.delete.mockResolvedValueOnce({ success: true });

    render(<PacientesView />);

    await waitFor(() => {
      expect(screen.getByText('Firulais')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /eliminar paciente firulais/i });
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByRole('button', { name: /sí, eliminar/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(pacientesService.delete).toHaveBeenCalledWith(1);
    });
  });
});
