import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, RefreshCw, TrendingUp, Package, Activity, ArrowRight, AlertTriangle, Filter } from 'lucide-react';
import api from '../services/api';
import { normalizeDashboardData } from '../services/dashboardData';
import { useAuth } from '../context/AuthContext';
import { todayInChile, isCalendarDate } from '../schemas/dateValidation';
import { RevenueChart, AppointmentChart, SpecialtyChart, InventoryChart, money } from '../components/DashboardCharts';
import './DashboardView.css';
import { DashboardIndicatorGuide } from '../components/DashboardIndicatorGuide';

function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function initialFilters() {
  const today = todayInChile();
  return { fechaDesde: shiftDate(today, -29), fechaHasta: today, agrupacion: 'dia', especialidadId: '', veterinarioId: '', estado: '', tipoInsumo: '', stock: 'todos' };
}
const states = ['Pendiente', 'Confirmada', 'En Curso', 'Completada', 'Atendida', 'Cancelada'];
const percentage = value => value == null ? 'No calculable' : `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value)} %`;

function ChartCard({ title, note, icon: Icon, children, action }) {
  const id = useId();
  return <section className="dash-chart-card" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}><header><div><h3 id={`${id}-title`}><Icon size={18} aria-hidden="true" />{title}</h3><p id={`${id}-description`}>{note}</p></div>{action}</header>{children}</section>;
}

export const DashboardView = ({ onNavigate }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const go = name => onNavigate ? onNavigate(name) : navigate(`/${name}`);
  const [filters, setFilters] = useState(initialFilters);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(null);
  const inFlight = useRef(false);
  const invalidRange = !isCalendarDate(filters.fechaDesde) || !isCalendarDate(filters.fechaHasta) || filters.fechaDesde > filters.fechaHasta ||
    (Date.parse(filters.fechaHasta) - Date.parse(filters.fechaDesde)) / 86400000 > 365;
  const refresh = () => setRevision(value => value + 1);
  const set = (key, value) => setFilters(current => ({ ...current, [key]: value }));

  useEffect(() => {
    const refreshVisible = () => { if (document.visibilityState === 'visible' && !inFlight.current) refresh(); };
    const timer = setInterval(refreshVisible, 30000);
    const changed = () => refresh();
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    window.addEventListener('vet:datachanged', changed);
    return () => { clearInterval(timer); window.removeEventListener('focus', refreshVisible); document.removeEventListener('visibilitychange', refreshVisible); window.removeEventListener('vet:datachanged', changed); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (invalidRange) { setLoading(false); return () => controller.abort(); }
    setLoading(true); setError(''); inFlight.current = true;
    const load = async () => {
      try {
        const response = await api.get('/api/v1/dashboard/analitica', { params: Object.fromEntries(Object.entries(filters).filter(([,v]) => v !== '')), signal: controller.signal });
        if (!controller.signal.aborted) { setData(normalizeDashboardData(response.data)); setUpdated(new Date()); }
      } catch (err) {
        if (!controller.signal.aborted) setError(err.userMessage || 'No se pudo actualizar el dashboard. Intente nuevamente.');
      } finally { if (!controller.signal.aborted) { setLoading(false); inFlight.current = false; } }
    };
    load();
    return () => { controller.abort(); inFlight.current = false; };
  }, [filters, revision, invalidRange]);

  const indicators = data?.indicadores || {};
  const options = data?.opciones || {};
  const cards = useMemo(() => [
    { label: 'Total facturado', value: money(indicators.totalFacturado), detail: `${indicators.facturas || 0} facturas en el período`, icon: TrendingUp, tone: 'teal' },
    { label: 'Promedio por factura', value: indicators.promedioPorFactura == null ? 'No calculable' : money(indicators.promedioPorFactura, 2), detail: 'Total facturado ÷ cantidad de facturas', icon: TrendingUp, tone: 'teal' },
    { label: 'Citas del período', value: indicators.citas || 0, detail: 'Según filtros de agenda', icon: Calendar, tone: 'blue' },
    { label: 'Cancelaciones', value: percentage(indicators.porcentajeCancelacion), detail: `${indicators.canceladas || 0} de ${indicators.citas || 0} citas filtradas`, icon: Activity, tone: 'violet' },
    { label: 'Insumos agotados', value: percentage(indicators.porcentajeInsumosAgotados), detail: `${indicators.agotados || 0} de ${indicators.insumos || 0} insumos de la categoría · stock actual`, icon: Package, tone: 'amber' },
    { label: 'Alertas de inventario', value: (indicators.agotados || 0) + (indicators.bajoStock || 0), detail: `${indicators.agotados || 0} agotados · ${indicators.bajoStock || 0} con stock bajo`, icon: Package, tone: 'amber' }
  ], [data]);

  const preset = name => {
    const today = todayInChile();
    let from = today, to = today;
    if (name === '7') from = shiftDate(today, -6);
    if (name === '30') from = shiftDate(today, -29);
    if (name === 'mes') { from = `${today.slice(0, 7)}-01`; const end = new Date(`${from}T12:00:00Z`); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0); to = end.toISOString().slice(0, 10); }
    setFilters(current => ({ ...current, fechaDesde: from, fechaHasta: to }));
  };

  return <div className="dashboard-analytics">
    <header className="dash-heading"><div><span className="dash-eyebrow">VETCLINIC · VISIÓN GENERAL</span><h2>Panel de gestión</h2><p>Hola, {user?.name?.split(' ')[0] || 'bienvenido'}. Revisa la actividad de tu clínica.</p></div>
      <div className="dash-heading-actions"><span className="dash-update" role="status">{loading ? 'Actualizando…' : updated ? `Actualizado ${updated.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}` : 'Sin lectura disponible'}</span>
        <button className="btn btn-secondary" onClick={refresh} disabled={loading || invalidRange}><RefreshCw size={16} aria-hidden="true" />Actualizar</button>
        <button className="btn btn-primary" onClick={() => go('citas')}><Calendar size={16} aria-hidden="true" />Ver agenda</button></div>
    </header>

    <section className="dash-filters" aria-label="Filtros del dashboard"><div className="dash-filter-heading"><strong><Filter size={16} aria-hidden="true" />Período de análisis</strong><div className="dash-presets">{[['hoy','Hoy'],['7','7 días'],['30','30 días'],['mes','Este mes']].map(([key,label]) => <button type="button" key={key} onClick={() => preset(key)}>{label}</button>)}</div></div>
      <div className="dash-date-filters">
        <label>Desde<input className="form-input" type="date" value={filters.fechaDesde} max={filters.fechaHasta} onChange={e => set('fechaDesde', e.target.value)} /></label>
        <label>Hasta<input className="form-input" type="date" value={filters.fechaHasta} min={filters.fechaDesde} onChange={e => set('fechaHasta', e.target.value)} /></label>
        <label>Agrupar por<select className="form-select" value={filters.agrupacion} onChange={e => set('agrupacion', e.target.value)}><option value="dia">Día</option><option value="semana">Semana</option><option value="mes">Mes</option></select></label>
        <button type="button" className="btn btn-secondary" onClick={() => setFilters(initialFilters())}>Restablecer filtros</button>
      </div>
      <p>La fecha filtra facturación y agenda. El inventario muestra existencias actuales; actualización automática cada 30 segundos mientras esta pantalla está visible.</p>
      {data?.periodo && <p>Período mostrado: <strong>{data.periodo.desde} — {data.periodo.hasta}</strong> · Fechas de la clínica en Chile.</p>}
      {invalidRange && <p className="dash-error" role="alert">Seleccione fechas válidas, en orden y con un máximo de 366 días.</p>}
    </section>
    {error && <div className="alert alert-danger" role="alert">{error}{data && ' Se conserva la última lectura disponible.'}</div>}
    <div className="dash-kpis" aria-label="Indicadores de gestión" aria-busy={loading}>{cards.map(({label,value,detail,icon:Icon,tone}) => <article key={label} className={`dash-kpi dash-tone-${tone}`}><div><span>{label}</span><Icon size={20} aria-hidden="true" /></div><strong>{data ? value : '—'}</strong><p>{detail}</p></article>)}</div>
    {data && <>
      <DashboardIndicatorGuide data={data} />
      <section className="dash-agenda-filters" aria-label="Filtros de agenda"><strong>Filtrar agenda</strong>
        <label>Especialidad<select className="form-select" value={filters.especialidadId} onChange={e => set('especialidadId',e.target.value)}><option value="">Todas las especialidades</option>{(options.especialidades || []).map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>
        <label>Veterinario<select className="form-select" value={filters.veterinarioId} onChange={e => set('veterinarioId',e.target.value)}><option value="">Todos los veterinarios</option>{(options.veterinarios || []).map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>
        <label>Estado<select className="form-select" value={filters.estado} onChange={e => set('estado',e.target.value)}><option value="">Todos los estados</option>{states.map(s => <option key={s}>{s}</option>)}</select></label>
      </section>
      <div className="dash-charts" aria-busy={loading}>
        <ChartCard title="Evolución de facturación" note="Total de documentos emitidos, con IVA. No representa pagos ni ganancias." icon={TrendingUp}><RevenueChart data={data.facturacion} /><div className="dash-finance-summary"><span>Neto: <strong>{money(indicators.netoFacturado)}</strong></span><span>IVA: <strong>{money(indicators.impuestos)}</strong></span></div></ChartCard>
        <ChartCard title="Actividad de citas" note="Distribución por fecha y estado, según los filtros de agenda." icon={Calendar}><AppointmentChart data={data.citasPorFecha} /></ChartCard>
        <ChartCard title="Citas por especialidad" note="Participación de cada servicio en las citas filtradas." icon={Activity}><SpecialtyChart data={data.especialidades} /></ChartCard>
        <ChartCard title="Estado del inventario" note="Hasta 12 productos con menos existencias. Stock bajo: 10 unidades o menos." icon={Package}>
          <div className="dash-stock-filters"><label>Categoría<select className="form-select" value={filters.tipoInsumo} onChange={e => set('tipoInsumo',e.target.value)}><option value="">Todas las categorías</option>{(options.tiposInsumo || []).map(t => <option key={t}>{t}</option>)}</select></label>
            <label>Existencias<select className="form-select" value={filters.stock} onChange={e => set('stock',e.target.value)}><option value="todos">Todos</option><option value="bajo">Stock bajo o agotado</option><option value="agotado">Solo agotados</option></select></label></div>
          <InventoryChart data={data.inventario} /><p className="dash-footnote">Las alertas resumen toda la categoría; este selector limita las barras mostradas.</p>
        </ChartCard>
      </div>
      <section className="dash-upcoming" aria-label="Próximas citas del período"><header><h2><Calendar size={18} aria-hidden="true" />Próximas citas del período</h2><button className="btn btn-secondary" onClick={() => go('citas')}>Ver agenda <ArrowRight size={16} aria-hidden="true" /></button></header>
        {(data.proximasCitas || []).length ? <ul>{data.proximasCitas.map(c => <li key={c.id}><span><strong>{c.paciente}</strong><small>{new Date(c.fechaHora).toLocaleString('es-CL')}</small></span><span className="badge badge-info">{c.estado}</span></li>)}</ul> : <p>No hay próximas citas activas dentro del período y los filtros seleccionados.</p>}
      </section>
    </>}
    {!data && loading && <div className="dash-loading" role="status">Preparando las visualizaciones…</div>}
  </div>;
};
export default DashboardView;
