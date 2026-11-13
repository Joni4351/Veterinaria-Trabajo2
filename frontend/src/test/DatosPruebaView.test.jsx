import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DatosPruebaView } from '../views/DatosPruebaView';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const mount = () => render(<MemoryRouter><DatosPruebaView /></MemoryRouter>);
beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: { role: 'Administrador' }, loading: false });
  api.get.mockResolvedValue({ data: { dataset: 'vetclinic-demo-v1', previstos: { clientes: 3, pacientes: 4 }, clientesExistentes: 0, descripcion: 'Lote académico' } });
  api.post.mockResolvedValue({ data: { creados: { clientes: 3, pacientes: 4 } } });
});

it('requiere confirmación y muestra el resumen de los registros generados', async () => {
  mount(); const generate = await screen.findByRole('button', { name: 'Generar datos de prueba', exact: true });
  expect(generate).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo que deseo agregar registros ficticios/ }));
  fireEvent.click(generate);
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Sí, generar datos' }));
  expect(await screen.findByText('Carga completada: 7 registros nuevos.')).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith('/api/v1/admin/datos-prueba', { dataset: 'vetclinic-demo-v1', confirmado: true });
});

it('indica cuando no se han creado duplicados', async () => {
  api.post.mockResolvedValue({ data: { creados: { clientes: 0, pacientes: 0 } } });
  mount(); await screen.findByRole('button', { name: 'Generar datos de prueba', exact: true });
  fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo que deseo agregar registros ficticios/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Generar datos de prueba', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Sí, generar datos' }));
  expect(await screen.findByText('El lote ya estaba cargado. No se crearon registros duplicados.')).toBeInTheDocument();
});

it('no consulta ni muestra el generador para usuarios no administradores', () => {
  useAuth.mockReturnValue({ user: { role: 'Veterinario' }, loading: false });
  mount(); expect(api.get).not.toHaveBeenCalled();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

it('permite reintentar si falla la vista previa inicial', async () => {
  api.get.mockRejectedValueOnce(new Error('Sin conexión'));
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar');
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar vista previa' }));
  expect(await screen.findByRole('button', { name: 'Generar datos de prueba', exact: true })).toBeDisabled();
});

it('muestra conflictos del servidor sin anunciar éxito y permite cancelar', async () => {
  api.post.mockRejectedValue({ response: { data: { message: 'Lote modificado. Revise los registros.' } } });
  mount(); await screen.findByRole('button', { name: 'Generar datos de prueba', exact: true });
  fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo que deseo agregar registros ficticios/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Generar datos de prueba', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Generar datos de prueba', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Sí, generar datos' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Lote modificado');
  expect(screen.queryByText(/Carga completada:/)).not.toBeInTheDocument();
});

it('no envía otra carga al pulsar dos veces mientras el servidor responde', async () => {
  let complete;
  api.post.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  mount(); await screen.findByRole('button', { name: 'Generar datos de prueba', exact: true });
  fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo que deseo agregar registros ficticios/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Generar datos de prueba', exact: true }));
  const confirm = screen.getByRole('button', { name: 'Sí, generar datos' });
  fireEvent.click(confirm); fireEvent.click(confirm);
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await act(async () => complete({ data: { creados: { clientes: 0 } } }));
  expect(await screen.findByText('El lote ya estaba cargado. No se crearon registros duplicados.')).toBeInTheDocument();
});
