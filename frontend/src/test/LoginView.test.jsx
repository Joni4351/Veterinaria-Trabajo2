import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginView } from '../views/LoginView';
import * as AuthContext from '../context/AuthContext';

// Variable hoisted para mock de useNavigate en Vitest
const { mockedNavigate } = vi.hoisted(() => ({
  mockedNavigate: vi.fn()
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('LoginView Component Tests', () => {
  const mockLogin = vi.fn();
  const mockRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      login: mockLogin,
      register: mockRegister,
      loading: false,
    });
  });

  it('debe renderizar los campos de correo y contraseña y el botón de acceso', () => {
    render(
      <MemoryRouter>
        <LoginView />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('debe mostrar error de validación en cliente (Zod) si el formulario se envía vacío', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginView />
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /iniciar sesión/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/el correo electrónico es requerido/i)).toBeInTheDocument();
      expect(screen.getByText(/la contraseña es requerida/i)).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('debe mostrar error si se ingresa un formato de correo inválido', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginView />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitBtn = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'correo-invalido');
    await user.type(passwordInput, '123456');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/ingrese un correo electrónico válido/i)).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('debe llamar a login y redirigir a /dashboard cuando las credenciales son válidas', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({ token: 'mock-jwt-token' });

    render(
      <MemoryRouter>
        <LoginView />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitBtn = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'admin@veterinaria.com');
    await user.type(passwordInput, 'Admin123*');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@veterinaria.com', 'Admin123*');
      expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('debe mostrar alerta de error si el servidor responde con 401 Unauthorized', async () => {
    const user = userEvent.setup();
    const error401 = new Error('Credenciales incorrectas');
    error401.response = { status: 401 };
    mockLogin.mockRejectedValueOnce(error401);

    render(
      <MemoryRouter>
        <LoginView />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitBtn = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'admin@veterinaria.com');
    await user.type(passwordInput, 'ClaveErronea');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/credenciales incorrectas/i)).toBeInTheDocument();
    });
  });
});
