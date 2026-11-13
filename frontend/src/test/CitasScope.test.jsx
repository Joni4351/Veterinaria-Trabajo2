import React from 'react';
import { it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { CitasView } from '../views/CitasView';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); api.get.mockResolvedValue({ data: [] }); });

it.each(['Administrador', 'Recepcionista', 'Veterinario'])('adapta el filtro profesional para %s', async role => {
  useAuth.mockReturnValue({ isAdmin: role === 'Administrador', hasRole: roles => roles.includes(role) });
  render(<CitasView />);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/v1/citas', { params: {} }));
  if (role === 'Veterinario') expect(screen.queryByLabelText('Profesional / Vet')).not.toBeInTheDocument();
  else expect(screen.getByLabelText('Profesional / Vet')).toBeInTheDocument();
  expect(await screen.findByRole('status')).toHaveTextContent(role === 'Veterinario'
    ? 'No tienes citas asignadas para los filtros seleccionados.'
    : 'No se encontraron citas médicas registradas con los filtros aplicados.');
});

it('abre un detalle de solo lectura y devuelve el foco al cerrar con Escape', async () => {
  useAuth.mockReturnValue({ isAdmin: false, hasRole: roles => roles.includes('Veterinario') });
  const cita = { id: 7, fechaHora: '2026-11-13T10:30:00', estado: 'Confirmada', paciente: { nombre: 'Luna', especie: 'Felino', peso: 4, alergias: 'Polen', cliente: { nombreCompleto: 'Propietario prueba', documentoIdentidad: '12.345.678-5' } }, usuario: { nombreCompleto: 'Veterinario prueba' }, especialidad: { nombre: 'Medicina general' } };
  api.get.mockImplementation(async path => ({ data: path === '/api/v1/citas' ? [cita] : [] }));
  render(<CitasView />);
  const open = await screen.findByRole('button', { name: 'Ver detalle de cita de Luna' });
  open.focus(); fireEvent.click(open);
  const dialog = screen.getByRole('dialog', { name: 'Detalle de cita' });
  for (const text of ['Luna', 'Propietario prueba', 'Veterinario prueba', 'Medicina general', 'Confirmada', 'Polen']) expect(within(dialog).getByText(text)).toBeInTheDocument();
  expect(dialog.querySelectorAll('input, select, textarea')).toHaveLength(0);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(open).toHaveFocus();
});

it('no confunde un fallo de carga con ausencia de citas asignadas', async () => {
  useAuth.mockReturnValue({ isAdmin: false, hasRole: roles => roles.includes('Veterinario') });
  api.get.mockRejectedValue(new Error('test-load-failure'));
  render(<CitasView />);
  expect(await screen.findByText('Error al conectar con el servidor para obtener las citas.')).toBeInTheDocument();
  expect(screen.queryByText('No tienes citas asignadas para los filtros seleccionados.')).not.toBeInTheDocument();
});
