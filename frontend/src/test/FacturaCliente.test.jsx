import React from 'react';
import { expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { FacturasView } from '../views/FacturasView';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ hasRole: () => true, isAdmin: true }) }));

it('busca por nombre y RUT sin desplegar el catálogo al enfocar una selección', async () => {
 const clientes = [{ id: 1, nombreCompleto: 'María Pérez', documentoIdentidad: '12.345.678-5' },
   { id: 2, nombreCompleto: 'Jonathan Garrido', documentoIdentidad: '18.765.432-7' },
   { id: 3, nombreCompleto: 'Sin Citas', documentoIdentidad: '11.111.111-1' }];
 const citas = [{ id: 1, paciente: { clienteId: 1, nombre: 'Luna' }, estado: 'Completada' },
   { id: 2, paciente: { clienteId: 2, nombre: 'Thor' }, estado: 'Confirmada' },
   { id: 3, paciente: { cliente: { id: 1 }, nombre: 'Max' }, estado: 'Pendiente' }];
 api.get.mockImplementation(async url => ({ data: url.endsWith('/clientes') ? clientes : url.endsWith('/citas') ? citas : [] }));
 render(<FacturasView />);
 fireEvent.click(await screen.findByRole('button', { name: /Emitir Factura/ }));
 const input = screen.getByLabelText(/Cliente Facturado/);
 const cita = screen.getByLabelText('Cita médica para agregar a la factura');
 const citaIds = () => Array.from(cita.options).map(o => o.value);
 expect(citaIds()).toEqual(['']);
 expect(input).toHaveValue('');
 fireEvent.focus(input); fireEvent.click(input);
 expect(screen.queryByRole('group', { name: 'Resultados de clientes' })).not.toBeInTheDocument();
 fireEvent.change(input, { target: { value: 'maria' } });
 const group = screen.getByRole('group', { name: 'Resultados de clientes' });
 expect(within(group).queryByRole('button', { name: /Jonathan/ })).not.toBeInTheDocument();
 fireEvent.click(within(group).getByRole('button', { name: /María Pérez.*12.345.678-5/ }));
 expect(input.value).toContain('María Pérez');
 expect(citaIds()).toEqual(['', '1', '3']);
 expect(within(cita).getByRole('option', { name: /Completada/ })).toBeInTheDocument();
 fireEvent.change(cita, { target: { value: '1' } });
 fireEvent.blur(input); fireEvent.focus(input); fireEvent.click(input);
 expect(screen.queryByRole('group', { name: 'Resultados de clientes' })).not.toBeInTheDocument();
 fireEvent.change(input, { target: { value: '187654327' } });
 fireEvent.click(screen.getByRole('button', { name: /Jonathan Garrido.*18.765.432-7/ }));
 expect(input.value).toContain('Jonathan Garrido');
 expect(cita).toHaveValue('');
 expect(citaIds()).toEqual(['', '2']);
 fireEvent.change(input, { target: { value: 'Sin Citas' } });
 fireEvent.click(screen.getByRole('button', { name: /Sin Citas.*11.111.111-1/ }));
 expect(citaIds()).toEqual(['']);
 expect(within(cita).getByRole('option')).toHaveTextContent('Este cliente no tiene citas');
 fireEvent.change(input, { target: { value: 'inexistente' } });
 expect(screen.getByRole('status')).toHaveTextContent('No se encontraron clientes');
 fireEvent.change(input, { target: { value: '  ' } });
 expect(screen.queryByRole('group', { name: 'Resultados de clientes' })).not.toBeInTheDocument();
});

it('muestra todos los datos faltantes al emitir y no envía una factura incompleta', async () => {
 api.post.mockClear();
 api.get.mockResolvedValue({ data: [] });
 render(<FacturasView />);
 fireEvent.click(await screen.findByRole('button', { name: /Emitir Factura/ }));
 const cliente = screen.getByLabelText(/Cliente Facturado/);
 const fecha = screen.getByLabelText(/Fecha de Emisión/);
 fireEvent.change(fecha, { target: { value: '' } });
 fireEvent.click(screen.getByRole('button', { name: 'Confirmar y Emitir Factura' }));
 expect(screen.getByText('Complete o corrija los datos indicados antes de guardar la factura.')).toBeInTheDocument();
 expect(cliente).toHaveAttribute('aria-invalid', 'true');
 expect(cliente).toHaveAccessibleDescription('Debe seleccionar un cliente');
 expect(fecha).toHaveAttribute('aria-invalid', 'true');
 expect(fecha).toHaveAccessibleDescription(/fecha de emisión/i);
 expect(screen.getByText(/Debe agregar al menos una cita médica o un insumo al detalle/)).toBeInTheDocument();
 expect(api.post).not.toHaveBeenCalled();
 await waitFor(() => expect(cliente).toHaveFocus());
});
