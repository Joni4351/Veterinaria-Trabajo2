import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UserCreateForm } from '../components/UserCreateForm';
import authService from '../services/authService';

vi.mock('../services/authService', () => ({ default: { register: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());

it('crea una cuenta con el rol elegido sin iniciar sesión como el usuario nuevo', async () => {
  const onCreated = vi.fn(); authService.register.mockResolvedValue({ id: 9 });
  render(<UserCreateForm roles={[{ id: 7, nombre: 'Veterinario' }]} onCreated={onCreated} />);
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo usuario' }));
  fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: 'Ana Pérez' } });
  fireEvent.change(screen.getByLabelText(/Correo electrónico/), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText(/Contraseña inicial/), { target: { value: 'Password123!' } });
  fireEvent.change(screen.getByLabelText(/Rol del usuario/), { target: { value: '7' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Usuario creado correctamente');
  expect(authService.register).toHaveBeenCalledWith({ nombreCompleto: 'Ana Pérez', email: 'ana@example.com', password: 'Password123!', rolId: 7 });
  expect(onCreated).toHaveBeenCalledOnce();
  expect(screen.queryByLabelText(/Contraseña inicial/)).not.toBeInTheDocument();
});

it('no envía datos incompletos y muestra el error del servidor', async () => {
  authService.register.mockRejectedValue({ response: { data: { errors: { Email: ['El correo ya existe.'] } } } });
  render(<UserCreateForm roles={[{ id: 2, nombre: 'Veterinario' }]} onCreated={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo usuario' }));
  fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }));
  expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0);
  expect(authService.register).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: 'Ana Pérez' } });
  fireEvent.change(screen.getByLabelText(/Correo electrónico/), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText(/Contraseña inicial/), { target: { value: 'Password123!' } });
  fireEvent.change(screen.getByLabelText(/Rol del usuario/), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }));
  await waitFor(() => expect(screen.getByLabelText(/Correo electrónico/)).toHaveAccessibleDescription('El correo ya existe.'));
});
