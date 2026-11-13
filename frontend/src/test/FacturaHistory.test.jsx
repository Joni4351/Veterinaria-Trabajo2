import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FacturasView } from '../views/FacturasView';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ isAdmin: true, hasRole: () => true }) }));

it.each([3, null])('maneja cantidad histórica %s sin reconstruirla desde el catálogo', async cantidad => {
  const data = { facturas: [{ id: 8, clienteId: 1, fechaEmision: '2026-11-13', montoTotal: 3570, montoImpuestos: 570 }],
    clientes: [{ id: 1, nombreCompleto: 'Cliente de prueba', documentoIdentidad: '12.345.678-5' }],
    insumos: [{ id: 4, nombreProducto: 'Insumo histórico', stockActual: 7, precioUnitario: 2000 }],
    detallefac: [{ id: 7, facturaId: 8, insumoId: 4, cantidad, precioUnitario: cantidad ? 1000 : null, subtotal: 3000 }] };
  api.get.mockImplementation(async path => ({ data: data[path.split('/').at(-1)] || [] }));
  const conflict = vi.fn(); window.addEventListener('vet:conflict', conflict);
  try {
    render(<FacturasView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar factura' }));
    if (cantidad === null) {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(conflict).toHaveBeenCalledOnce();
    } else {
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Insumo histórico', { exact: true })).toBeInTheDocument();
      expect(within(dialog).getByDisplayValue('3')).toBeInTheDocument();
      expect(dialog).toHaveTextContent('$1.000');
      expect(dialog).toHaveTextContent('$3.000');
    }
  } finally { window.removeEventListener('vet:conflict', conflict) }
});

it('envía la cantidad del nuevo detalle y calcula su subtotal sin edición manual', async () => {
  const data = { facturas: [{ id: 8, clienteId: 1, fechaEmision: '2026-11-13', montoTotal: 0, montoImpuestos: 0 }],
    clientes: [{ id: 1, nombreCompleto: 'Cliente de prueba' }],
    insumos: [{ id: 4, nombreProducto: 'Producto de prueba', stockActual: 10, precioUnitario: 2000 }] };
  api.get.mockImplementation(async path => ({ data: data[path.split('/').at(-1)] || [] })); api.post.mockResolvedValue({ data: {} });
  render(<FacturasView />);
  fireEvent.click(await screen.findByRole('button', { name: 'Gestionar Detalle de Factura' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText(/Cantidad/), { target: { value: '3' } });
  const subtotal = within(dialog).getByLabelText(/Subtotal/);
  expect(subtotal).toHaveValue(6000); expect(subtotal).toHaveAttribute('readonly');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Agregar', exact: true }));
  await vi.waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/detallefac', expect.objectContaining({ cantidad: 3, subtotal: 6000 })));
});
