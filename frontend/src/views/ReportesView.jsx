import React, { useEffect, useRef, useState } from 'react';
import { FileText, SlidersHorizontal, Download, Printer, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { createPortal } from 'react-dom';
import { ReportSheet } from '../components/ReportSheet';
import { todayInChile, isCalendarDate } from '../schemas/dateValidation';
import './ReportesView.css';

const names = { operativo: 'Agenda operativa', gerencial: 'Resumen gerencial', periodo: 'Historial por período' };
const states = ['Pendiente', 'Confirmada', 'En Curso', 'Completada', 'Atendida', 'Cancelada'];
export function ReportesView() {
  const today = todayInChile();
  const [type, setType] = useState('operativo');
  const [filters, setFilters] = useState({ desde: `${today.slice(0, 4)}-01-01`, hasta: today, estado: '', especialidadId: '', clienteId: '' });
  const [page, setPage] = useState(1), [report, setReport] = useState(null), [loading, setLoading] = useState(false), [busy, setBusy] = useState(''), [error, setError] = useState('');
  const [options, setOptions] = useState({ clientes: [], especialidades: [] });
  const [clientSearch, setClientSearch] = useState('');
  const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const term = normalize(clientSearch);
  const rutTerm = term.replace(/[.\-\s]/g, '');
  const matches = term ? options.clientes.filter(c => normalize(c.nombreCompleto).includes(term) || (rutTerm && normalize(c.documentoIdentidad).replace(/[.\-\s]/g, '').includes(rutTerm))) : [];
  const selectedClient = options.clientes.find(c => String(c.id) === filters.clienteId);
  const [printed, setPrinted] = useState(null);
  const lock = useRef(false);
  useEffect(() => {
    if (!printed) return;
    let cancelled = false, frame;
    const finish = () => setPrinted(null);
    window.addEventListener('afterprint', finish, { once: true });
    // Run only after React committed the complete report portal, outside the application layout.
    Promise.resolve(document.fonts?.ready).then(() => {
      if (!cancelled) frame = requestAnimationFrame(() => { if (!cancelled) window.print(); });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); window.removeEventListener('afterprint', finish); };
  }, [printed]);
  const invalidDates = !isCalendarDate(filters.desde) || !isCalendarDate(filters.hasta) || filters.desde > filters.hasta || (Date.parse(filters.hasta) - Date.parse(filters.desde)) / 86400000 > 730;
  const params = Object.fromEntries(Object.entries(filters).filter(([key, value]) => value !== '' && (type !== 'gerencial' || !['estado', 'especialidadId'].includes(key))));
  useEffect(() => {
    const c = new AbortController();
    Promise.all([api.get('/api/v1/clientes', { signal: c.signal }), api.get('/api/v1/especialidades', { signal: c.signal })]).then(([clients, specialties]) => setOptions({ clientes: clients.data, especialidades: specialties.data })).catch(() => {});
    return () => c.abort();
  }, []);
  useEffect(() => {
    if (invalidDates) { setLoading(false); setReport(null); setError('Seleccione fechas válidas, en orden y con un máximo de 731 días.'); return; }
    const c = new AbortController(); setLoading(true); setError('');
    api.get(`/api/v1/admin/reportes/${type}`, { params: { ...params, pagina: page, tamano: 25 }, signal: c.signal }).then(r => { if (!c.signal.aborted) setReport(r.data); })
      .catch(e => { if (!c.signal.aborted) { setError(e.userMessage || 'No se pudo cargar el reporte.'); setReport(null); } }).finally(() => { if (!c.signal.aborted) setLoading(false); });
    return () => c.abort();
  }, [type, filters, page]);
  const change = (key, value) => { setPage(1); setFilters(f => ({ ...f, [key]: value })); };
  const download = async format => {
    if (lock.current) return; lock.current = true; setBusy(format); setError('');
    try {
      const r = await api.get(`/api/v1/admin/reportes/${type}/exportar/${format}`, { params, responseType: format === 'impresion' ? 'json' : 'blob' });
      if (format === 'impresion') {
        setPrinted(r.data);

      } else {
        const url = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = url; a.download = `vetclinic-${type}-${filters.desde}-${filters.hasta}.${format}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) {
      let message = e.userMessage || 'No fue posible preparar el archivo.';
      if (e.response?.data instanceof Blob) { try { message = JSON.parse(await e.response.data.text()).message || message; } catch {} }
      setError(message);
    } finally { lock.current = false; setBusy(''); }
  };
  return <section className="reports-panel" aria-labelledby="reports-title">
    <div className="reports-controls reports-toolbar">
      <header className="reports-heading"><span className="reports-heading-icon"><FileText size={24} aria-hidden="true" /></span><h2 id="reports-title">Reportes de gestión</h2><span className="reports-format-badge">PDF · XLSX · CSV</span></header>
      <div className="reports-filter-card">
      <h3 className="reports-section-title"><SlidersHorizontal size={17} aria-hidden="true" /> Personalizar reporte</h3>
      <div className="reports-filter-grid">
        <label>Reporte<select className="form-select" value={type} onChange={e => { setType(e.target.value); setPage(1); }}>{Object.entries(names).map(([v, name]) => <option key={v} value={v}>{name}</option>)}</select></label>
        <label>Desde<input className="form-input" type="date" max={filters.hasta} aria-invalid={invalidDates} aria-describedby={invalidDates ? 'reports-error' : undefined} value={filters.desde} onChange={e => change('desde', e.target.value)} /></label>
        <label>Hasta<input className="form-input" type="date" min={filters.desde} aria-invalid={invalidDates} aria-describedby={invalidDates ? 'reports-error' : undefined} value={filters.hasta} onChange={e => change('hasta', e.target.value)} /></label>
        <label>Cliente<select className="form-select" value={filters.clienteId} onChange={e => { change('clienteId', e.target.value); setClientSearch(''); }}><option value="">Todos</option>{selectedClient && <option value={selectedClient.id}>{selectedClient.nombreCompleto} — RUT: {selectedClient.documentoIdentidad}</option>}</select></label>
        <div className="reports-client-search">
          <label htmlFor="reports-client-query">Buscar cliente por nombre o RUT</label>
          <input id="reports-client-query" type="search" className="form-input" autoComplete="off" placeholder="Escribe un nombre o RUT…" value={clientSearch} onChange={e => setClientSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setClientSearch(''); }} aria-describedby="reports-client-help" />
          <small id="reports-client-help">Selecciona una coincidencia para filtrar; “Todos” incluye todos los clientes.</small>
          {term && <div className="reports-client-results" role="group" aria-label="Resultados de clientes">
            <p role="status">{matches.length ? `${matches.length} coincidencias` : 'No se encontraron clientes.'}</p>
            {matches.map(c => <button type="button" key={c.id} className="btn btn-secondary" onClick={() => { change('clienteId', String(c.id)); setClientSearch(''); document.getElementById('reports-client-query')?.focus(); }}>{c.nombreCompleto} — RUT: {c.documentoIdentidad}</button>)}
          </div>}
        </div>
        {type !== 'gerencial' && <><label>Estado<select className="form-select" value={filters.estado} onChange={e => change('estado', e.target.value)}><option value="">Todos</option>{states.map(s => <option key={s}>{s}</option>)}</select></label>
          <label>Especialidad<select className="form-select" value={filters.especialidadId} onChange={e => change('especialidadId', e.target.value)}><option value="">Todas</option>{options.especialidades.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label></>}
      </div>
      </div>
      <div className="reports-export-bar"><div className="reports-export-copy"><span>Descargar reporte</span><p>Selecciona el formato que necesitas.</p></div>
      <div className="reports-actions">{['xlsx', 'pdf', 'csv'].map(f => <button key={f} type="button" className="btn btn-secondary" disabled={loading || !!busy || !report} onClick={() => download(f)}><Download size={16} aria-hidden="true" />{busy === f ? 'Preparando…' : `Exportar ${f.toUpperCase()}`}</button>)}
        <button type="button" className="btn btn-primary" disabled={loading || !!busy || !report} onClick={() => download('impresion')}><Printer size={16} aria-hidden="true" />Imprimir reporte completo</button></div></div>
      <p className="reports-export-note"><ShieldCheck size={16} aria-hidden="true" /><span>Hasta 5000 registros por archivo. Se incluyen los filtros seleccionados y cada exportación queda registrada.</span></p>
    </div>
    {error && <p id="reports-error" role="alert" className="alert alert-danger">{error}</p>}
    {loading && <p role="status">Cargando reporte…</p>}
    {report && <ReportSheet report={report} />}
    {printed && createPortal(<div className="reports-print-root"><ReportSheet report={printed} /></div>, document.body)}
    {report && <nav className="reports-pagination reports-controls" aria-label="Páginas del reporte"><button className="btn btn-secondary" disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>Anterior</button><span>Página {page} de {Math.max(1, Math.ceil(report.total / 25))}</span><button className="btn btn-secondary" disabled={page * 25 >= report.total || loading} onClick={() => setPage(p => p + 1)}>Siguiente</button></nav>}
  </section>;
}
