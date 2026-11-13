import React, { useEffect, useRef, useState } from 'react';
import { FileText, SlidersHorizontal, Download, Printer, ShieldCheck } from 'lucide-react';
import api from '../services/api';
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
  const [printed, setPrinted] = useState(null);
  const lock = useRef(false);
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
        window.addEventListener('afterprint', () => setPrinted(null), { once: true });
        requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
      } else {
        const url = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = url; a.download = `vetclinic-${type}-${filters.desde}-${filters.hasta}.${format}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) {
      let message = e.userMessage || 'No fue posible preparar el archivo.';
      if (e.response?.data instanceof Blob) { try { message = JSON.parse(await e.response.data.text()).message || message; } catch {} }
      setError(message);
    } finally { lock.current = false; setBusy(''); }
  };
  const shown = printed || report;
  return <section className={`reports-panel${printed ? ' reports-printing' : ''}`} aria-labelledby="reports-title">
    <div className="reports-controls reports-toolbar">
      <header className="reports-heading"><span className="reports-heading-icon"><FileText size={24} aria-hidden="true" /></span><h2 id="reports-title">Reportes de gestión</h2><span className="reports-format-badge">PDF · XLSX · CSV</span></header>
      <div className="reports-filter-card">
      <h3 className="reports-section-title"><SlidersHorizontal size={17} aria-hidden="true" /> Personalizar reporte</h3>
      <div className="reports-filter-grid">
        <label>Reporte<select className="form-select" value={type} onChange={e => { setType(e.target.value); setPage(1); }}>{Object.entries(names).map(([v, name]) => <option key={v} value={v}>{name}</option>)}</select></label>
        <label>Desde<input className="form-input" type="date" max={filters.hasta} aria-invalid={invalidDates} aria-describedby={invalidDates ? 'reports-error' : undefined} value={filters.desde} onChange={e => change('desde', e.target.value)} /></label>
        <label>Hasta<input className="form-input" type="date" min={filters.desde} aria-invalid={invalidDates} aria-describedby={invalidDates ? 'reports-error' : undefined} value={filters.hasta} onChange={e => change('hasta', e.target.value)} /></label>
        <label>Cliente<select className="form-select" value={filters.clienteId} onChange={e => change('clienteId', e.target.value)}><option value="">Todos</option>{options.clientes.map(c => <option key={c.id} value={c.id}>{c.nombreCompleto}</option>)}</select></label>
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
    {shown && <div className="reports-sheet"><h3>{shown.titulo}</h3><p>Emisión: {new Date(shown.emitido).toLocaleString('es-CL')}</p><p>{shown.filtros}</p>
      {shown.grafico?.length > 0 && <figure className="reports-chart"><figcaption>Facturación mensual con impuestos</figcaption>{shown.grafico.map(b => <div key={b.etiqueta}><span>{b.etiqueta}: ${Number(b.valor).toLocaleString('es-CL')}</span><div style={{ width: `${Math.max(1, Number(b.valor) / Math.max(1, ...shown.grafico.map(x => Number(x.valor))) * 100)}%` }} /></div>)}</figure>}
      <div className="table-responsive" tabIndex={0} role="region" aria-label="Resultados del reporte"><table className="custom-table"><caption>{shown.total ?? shown.filas.length} registros filtrados</caption><thead><tr>{shown.columnas.map(c => <th key={c.title} scope="col">{c.title}</th>)}</tr></thead>
        <tbody>{shown.filas.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} data-label={shown.columnas[j].title}>{shown.columnas[j].kind === 'date' ? new Date(cell).toLocaleString('es-CL') : typeof cell === 'number' ? cell.toLocaleString('es-CL') : cell}</td>)}</tr>)}</tbody>
        {Object.keys(shown.totales || {}).length > 0 && <tfoot><tr>{shown.columnas.map((c, i) => <td key={i}>{i === 0 ? 'TOTAL' : shown.totales[i] == null ? '' : Number(shown.totales[i]).toLocaleString('es-CL')}</td>)}</tr></tfoot>}
      </table></div>
      {!shown.filas.length && <p>No hay registros para los filtros seleccionados.</p>}
    </div>}
    {report && <nav className="reports-pagination reports-controls" aria-label="Páginas del reporte"><button className="btn btn-secondary" disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>Anterior</button><span>Página {page} de {Math.max(1, Math.ceil(report.total / 25))}</span><button className="btn btn-secondary" disabled={page * 25 >= report.total || loading} onClick={() => setPage(p => p + 1)}>Siguiente</button></nav>}
  </section>;
}
