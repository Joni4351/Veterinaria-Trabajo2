import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FacturasView } from '../views/FacturasView';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

it.each(['Administrador', 'Recepcionista', 'Veterinario'])('aplica los permisos de facturación para %s', async role => {
  useAuth.mockReturnValue({ isAdmin: role === 'Administrador', hasRole: roles => roles.includes(role) });
  const data = { facturas: [{ id: 1, clienteId: 1, fechaEmision: '2026-11-13', montoTotal: 119, montoImpuestos: 19 }],
    clientes: [{ id: 1, nombreCompleto: 'Cliente de factura', documentoIdentidad: '12.345.678-5' }], detallefac: [{ id: 1, facturaId: 1, insumoId: 1, subtotal: 100 }] };
  api.get.mockImplementation(async path => ({ data: data[path.split('/').at(-1)] || [] }));
  render(<FacturasView />);
  const details = await screen.findByRole('button', { name: 'Gestionar Detalle de Factura' });
  expect(screen.getByText('Factura 1', { exact: true })).toBeInTheDocument();
  if (role === 'Veterinario') expect(screen.queryByRole('button', { name: 'Emitir Factura', exact: true })).not.toBeInTheDocument();
  else expect(screen.getByRole('button', { name: 'Emitir Factura', exact: true })).toBeInTheDocument();
  if (role !== 'Administrador') expect(screen.queryByRole('button', { name: 'Editar factura' })).not.toBeInTheDocument();
  fireEvent.click(details);
  if (role !== 'Administrador') {
    expect(screen.queryByText('Añadir Ítem / Concepto al Detalle')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar línea' })).not.toBeInTheDocument();
  } else expect(await screen.findByText('Añadir Ítem / Concepto al Detalle')).toBeInTheDocument();
});
