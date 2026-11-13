import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardView } from '../views/DashboardView';
import api from '../services/api';
import { dashboardFixture } from './dashboardFixture';
import { money } from '../components/DashboardCharts';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Prueba', role: 'Administrador' } }) }));
beforeEach(() => { vi.clearAllMocks(); api.get.mockResolvedValue({ data: dashboardFixture }); });
const mount = () => render(<MemoryRouter><DashboardView /></MemoryRouter>);

it('recupera los indicadores desde los totales si la API no devuelve los campos nuevos', async () => {
 const old = { totalFacturado: 111265, facturas: 3, citas: 4, canceladas: 1, porcentajeCancelacion: 25, agotados: 0, insumos: 9, bajoStock: 0 };
 api.get.mockResolvedValue({ data: { ...dashboardFixture, indicadores: old, especialidades: [{ id: 1, nombre: 'Medicina General', cantidad: 4 }] } });
 mount(); await screen.findByText('Luna');
 expect(screen.getByText(money(37088.33, 2), { selector: '.dash-kpi > strong' })).toBeInTheDocument();
 expect(screen.getByText('0 %', { selector: '.dash-kpi > strong' })).toBeInTheDocument();
 expect(screen.queryByText('No calculable', { selector: '.dash-kpi > strong' })).not.toBeInTheDocument();
 fireEvent.click(screen.getByText('Cómo se calculan los seis indicadores'));
 expect(screen.getByText('Medicina General: 100 %')).toBeInTheDocument();
 expect(api.get).toHaveBeenCalledTimes(1);
});

it('carga los cuatro gráficos y resúmenes con una sola solicitud agregada', async () => {
 mount();
 await screen.findByText('Luna');
 expect(screen.getByText('Insumo limitado')).toBeInTheDocument();
 expect(screen.getByText('Promedio por factura', { selector: '.dash-kpi span' })).toBeInTheDocument();
 expect(screen.getByText(money(89250, 2), { selector: '.dash-kpi > strong' })).toBeInTheDocument();
 expect(screen.getByText('25 %', { selector: '.dash-kpi > strong' })).toBeInTheDocument();
 expect(screen.getByRole('region', { name: 'Evolución de facturación' })).toBeInTheDocument();
 expect(screen.getByRole('region', { name: 'Actividad de citas' })).toBeInTheDocument();
 expect(screen.getByRole('region', { name: 'Citas por especialidad' })).toBeInTheDocument();
 expect(screen.getByRole('region', { name: 'Estado del inventario' })).toBeInTheDocument();
 expect(api.get).toHaveBeenCalledTimes(1);
 expect(api.get).toHaveBeenCalledWith('/api/v1/dashboard/analitica', expect.objectContaining({ signal: expect.any(AbortSignal), params: expect.objectContaining({ agrupacion: 'dia' }) }));
});
it('expone las seis fórmulas y resultados y distingue denominadores vacíos', async () => {
 api.get.mockResolvedValue({ data: { ...dashboardFixture, indicadores: { totalFacturado: 0, facturas: 0, citas: 0, insumos: 0, promedioPorFactura: null, porcentajeCancelacion: null, porcentajeInsumosAgotados: null }, especialidades: [], proximasCitas: [] } });
 mount();
 await screen.findByText('Promedio por factura');
 expect(screen.getAllByText('No calculable')).toHaveLength(3);
 fireEvent.click(screen.getByText('Cómo se calculan los seis indicadores'));
 const rows = screen.getByRole('table', { name: 'Seis indicadores de gestión: pregunta de negocio, fórmula y resultado' }).querySelectorAll('tbody tr');
 expect(rows).toHaveLength(6);
 expect(screen.getAllByText('No calculable: sin registros')).toHaveLength(4);
});
it('cambia filtros, reacciona a modificaciones y no consulta con fechas inválidas', async () => {
 mount(); await screen.findByText('Luna');
 fireEvent.change(screen.getByLabelText('Especialidad'), { target: { value: '2' } });
 await waitFor(() => expect(api.get.mock.calls.at(-1)[1].params.especialidadId).toBe('2'));
 const prior = api.get.mock.calls.length;
 act(() => window.dispatchEvent(new Event('vet:datachanged')));
 await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(prior));
 await waitFor(() => expect(screen.getByRole('button', { name: 'Actualizar', exact: true })).toBeEnabled());
 const calls = api.get.mock.calls.length;
 fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '' } });
 expect(screen.getByRole('alert')).toHaveTextContent('Seleccione fechas válidas');
 expect(api.get).toHaveBeenCalledTimes(calls);
});
it('cancela la carga al abandonar la pantalla', async () => {
 api.get.mockImplementation(() => new Promise(() => {}));
 const { unmount } = mount();
 await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
 const signal = api.get.mock.calls[0][1].signal; unmount(); expect(signal.aborted).toBe(true);
});
it('actualiza cada 30 segundos y limpia el temporizador al abandonar la vista', async () => {
 vi.useFakeTimers();
 try {
   const { unmount } = mount();
   await act(async () => {});
   expect(api.get).toHaveBeenCalledTimes(1);
   await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
   expect(api.get).toHaveBeenCalledTimes(2);
   unmount();
   await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
   expect(api.get).toHaveBeenCalledTimes(2);
 } finally { vi.useRealTimers(); }
});
it('distingue los estados vacíos y los errores sin inventar datos', async () => {
 api.get.mockRejectedValue({ userMessage: 'No se pudo conectar.' });
 mount(); expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar.');
 expect(screen.queryByRole('region', { name: 'Evolución de facturación' })).not.toBeInTheDocument();
});
