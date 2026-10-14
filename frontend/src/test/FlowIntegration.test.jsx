import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { AuthProvider } from '../context/AuthContext';
import api from '../services/api';

// Mock de la instancia api de axios
vi.mock('../services/api');

describe('E2E Full Flow Integration Test: Login -> Crear Recurso -> Listar Recurso', () => {
  let mockPacientesDb;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockPacientesDb = [
      {
        id: 1,
        nombre: 'Luna',
        especie: 'Felino',
        raza: 'Angora',
        peso: 3.5,
        clienteId: 10,
        alergias: null,
        cliente: { id: 10, nombreCompleto: 'Juan Pérez', documentoIdentidad: '11223344-5' }
      }
    ];

    const mockClientes = [
      { id: 10, nombreCompleto: 'Juan Pérez', documentoIdentidad: '11223344-5' }
    ];

    // Interceptar llamadas API de login, pacientes y clientes
    api.post.mockImplementation((url, body) => {
      if (url.includes('/usuarios/login') || url.includes('/login')) {
        return Promise.resolve({
          data: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkFkbWluaXN0cmFkb3IgUHJpbmNpcGFsIiwiZW1haWwiOiJhZG1pbkB2ZXRlcmluYXJpYS5jb20iLCJyb2xlIjoiQWRtaW5pc3RyYWRvciIsImV4cCI6OTk5OTk5OTk5OX0.test',
            usuario: {
              id: 1,
              nombre: 'Administrador Principal',
              email: 'admin@veterinaria.com',
              rol: 'Administrador'
            }
          }
        });
      }
      if (url.includes('/api/v1/pacientes')) {
        const nuevo = {
          id: mockPacientesDb.length + 1,
          ...body,
          cliente: mockClientes.find(c => c.id === Number(body.clienteId)) || { nombreCompleto: 'Juan Pérez' }
        };
        mockPacientesDb.push(nuevo);
        return Promise.resolve({ data: nuevo });
      }
      return Promise.reject(new Error(`Unhandled POST: ${url}`));
    });

    api.get.mockImplementation((url) => {
      if (url.includes('/api/v1/pacientes')) {
        return Promise.resolve({ data: [...mockPacientesDb] });
      }
      if (url.includes('/api/v1/clientes')) {
        return Promise.resolve({ data: mockClientes });
      }
      if (url.includes('/api/v1/citas') || url.includes('/api/v1/facturas') || url.includes('/api/v1/insumos') || url.includes('/api/v1/consultas')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('debe completar el flujo integral de negocio: Login -> Crear Paciente -> Listar Paciente en Tabla', async () => {
    const user = userEvent.setup();

    // Renderizar aplicación completa con MemoryRouter iniciando en /login
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );

    // ==========================================
    // PASO 1: FLUJO DE LOGIN Y AUTENTICACIÓN JWT
    // ==========================================
    expect(screen.getByRole('heading', { name: /clínica veterinaria/i })).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const loginButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'admin@veterinaria.com');
    await user.type(passwordInput, 'Admin123*');
    await user.click(loginButton);

    // Debe autenticarse y cargar el Topbar y Sidebar del Dashboard
    await waitFor(() => {
      expect(screen.getByText('Administrador Principal')).toBeInTheDocument();
      expect(screen.getByText('Rol: Administrador')).toBeInTheDocument();
    });

    // ==========================================
    // PASO 2: NAVEGACIÓN A MÓDULO PACIENTES
    // ==========================================
    const pacientesNavLink = screen.getByRole('link', { name: /pacientes \(mascotas\)/i });
    await user.click(pacientesNavLink);

    // Verificar que estamos en la vista de pacientes y se lista el paciente inicial
    await waitFor(() => {
      expect(screen.getByText('Gestión de Pacientes (Mascotas)')).toBeInTheDocument();
      expect(screen.getByText('Luna')).toBeInTheDocument();
      expect(screen.getByText('Angora')).toBeInTheDocument();
    });

    // ==========================================
    // PASO 3: CREACIÓN DE UN NUEVO RECURSO (PACIENTE)
    // ==========================================
    const newBtn = screen.getByRole('button', { name: /nuevo paciente/i });
    await user.click(newBtn);

    // Verificar apertura del modal accesible
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByRole('heading', { name: /registrar nuevo paciente/i })).toBeInTheDocument();

    // Completar el formulario con los datos validados por Zod
    await user.type(within(modal).getByLabelText(/nombre del paciente/i), 'Thor');
    await user.selectOptions(within(modal).getByLabelText(/especie/i), 'Canino');
    await user.type(within(modal).getByLabelText(/raza/i), 'Pastor Alemán');
    await user.type(within(modal).getByLabelText(/peso/i), '32');
    await user.selectOptions(within(modal).getByLabelText(/dueño/i), '10');

    const saveButton = within(modal).getByRole('button', { name: /registrar paciente/i });
    await user.click(saveButton);

    // ==========================================
    // PASO 4: VERIFICAR LISTADO DEL RECURSO CREADO
    // ==========================================
    // El modal debe cerrarse y el nuevo paciente debe figurar en la tabla
    await waitFor(() => {
      expect(screen.getByText('Thor')).toBeInTheDocument();
      expect(screen.getByText('Pastor Alemán')).toBeInTheDocument();
    });

    // Ambos pacientes deben coexistir en la vista
    expect(screen.getByText('Luna')).toBeInTheDocument();
    expect(screen.getByText('Thor')).toBeInTheDocument();
  });
});
