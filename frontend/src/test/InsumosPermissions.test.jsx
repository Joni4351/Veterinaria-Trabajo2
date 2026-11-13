import React from 'react';
import { expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InsumosView } from '../views/InsumosView';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
beforeEach(() => { api.get.mockResolvedValue({ data: [{ id: 1, nombreProducto: 'Producto prueba', tipo: 'Material', stockActual: 10, precioUnitario: 1000 }] }); });

it.each(['Administrador', 'Veterinario', 'Recepcionista'])('aplica los permisos del catálogo para %s', async role => {
  useAuth.mockReturnValue({ isAdmin: role === 'Administrador' });
  render(<InsumosView />);
  expect(await screen.findByText('Producto prueba')).toBeInTheDocument();
  for (const name of ['Nuevo Insumo', 'Editar insumo Producto prueba', 'Eliminar insumo Producto prueba']) {
    if (role === 'Administrador') expect(screen.getByRole('button', { name, exact: true })).toBeInTheDocument();
    else expect(screen.queryByRole('button', { name, exact: true })).not.toBeInTheDocument();
  }
  if (role !== 'Administrador') expect(screen.getByText('Solo Lectura')).toBeInTheDocument();
});
