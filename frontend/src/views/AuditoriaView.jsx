import { NumericInput } from '../components/NumericInput';
import { AccessibleForm, RequiredIndicator, SubmitButton } from "../components/AccessibleForm";
import React, { useEffect, useRef, useState } from 'react';
import { FileText, Search, X, RefreshCw, Download, Eye, Pencil, Plus, Trash2, Archive } from 'lucide-react';
import './AuditoriaView.css';
import api from '../services/api';
import { ProtectedRoute } from '../components/ProtectedRoute';

export const AuditoriaView = () => <ProtectedRoute allowedRoles={['Administrador']}><AuditPanel /></ProtectedRoute>;
const initial = { entidad: '', accion: '', origen: '', usuario: '', desde: '', hasta: '', operacionId: '', buscar: '' };
const formatDate = value => new Date(value).toLocaleString('es-CL', { timeZone: 'America/Santiago' });

function AuditPanel() {
  const [filters, setFilters] = useState(initial);
  const [page, setPage] = useState(1);
  const [entities, setEntities] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState([]);
  const [size, setSize] = useState(5);
  const [exportOpen, setExportOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfCount, setPdfCount] = useState('25');
  const [pdfRows, setPdfRows] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const pdfRequest = useRef(null);
  const pdfDialog = useRef(null);
  useEffect(() => () => pdfRequest.current?.abort(), []);
  useEffect(() => { if (pdfOpen) pdfDialog.current?.showModal(); }, [pdfOpen]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api.get('/api/v1/admin/auditoria/entidades', { signal: controller.signal }).then(r => setEntities(r.data)).catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const timer = setTimeout(() => {
      const params = { pagina: page, tamano: size, ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) };
      api.get('/api/v1/admin/auditoria', { params, signal: controller.signal }).then(r => {
        if (!controller.signal.aborted) { setRows(r.data.registros); setTotal(r.data.total); setSummary(r.data.resumen || []); }
      }).catch(err => {
        if (!controller.signal.aborted) { setError(err.userMessage || err.response?.data?.message || 'No se pudo consultar el historial.'); setRows([]); setTotal(0); setSummary([]); }
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters, page, size, refresh]);
  useEffect(() => {
    if (selectedId == null) return;
    const controller = new AbortController();
    setDetail(null); setDetailLoading(true);
    api.get(`/api/v1/admin/auditoria/${selectedId}`, { signal: controller.signal }).then(r => {
      if (!controller.signal.aborted) setDetail(r.data);
    }).catch(() => { if (!controller.signal.aborted) setError('No se pudo abrir el detalle del cambio.'); })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selectedId]);
  const change = (name, value) => { setFilters(previous => ({ ...previous, [name]: value })); setPage(1); };
  const fields = [...new Set([...Object.keys(detail?.valoresAnteriores || {}), ...Object.keys(detail?.valoresNuevos || {})])];
  const value = (data, field) => !data || !(field in data) ? '—' : data[field] === null ? '(vacío)' : typeof data[field] === 'boolean' ? (data[field] ? 'Sí' : 'No') : String(data[field]);
  const pages = Math.max(1, Math.ceil(total / size));
  const numbers = [...new Set([1, page - 1, page, page + 1, pages])].filter(n => n > 0 && n <= pages).sort((a, b) => a - b);
  const initials = name => (name || 'Sistema').split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  const exportCsv = () => {
    const escape = input => '"' + String(input ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"';
    const lines = [['Fecha y hora', 'Responsable', 'Acción', 'Módulo', 'Origen'], ...rows.map(row => [formatDate(row.fechaHora), row.usuarioNombre || 'Sistema', row.accion, row.entidad, row.origen])];
    const url = URL.createObjectURL(new Blob(['\ufeff' + lines.map(line => line.map(escape).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'registro-auditoria.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setExportOpen(false);
  };
  const closePdf = () => { pdfRequest.current?.abort(); setPdfOpen(false); setPdfRows(null); setPdfLoading(false); setPdfError(''); };
  const preparePdf = async e => {
    e.preventDefault();
    const count = Number(pdfCount);
    if (!Number.isInteger(count) || count < 1 || count > 100) { setPdfError('Seleccione entre 1 y 100 registros.'); return; }
    if (pdfLoading) return;
    pdfRequest.current?.abort();
    const controller = new AbortController(); pdfRequest.current = controller;
    setPdfLoading(true); setPdfError(''); setPdfRows(null);
    try {
      const params = { ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), pagina: 1, tamano: count };
      const response = await api.get('/api/v1/admin/auditoria', { params, signal: controller.signal });
      if (!controller.signal.aborted) setPdfRows(response.data.registros.slice(0, count));
    } catch (err) {
      if (!controller.signal.aborted) setPdfError(err.userMessage || err.response?.data?.message || 'No se pudo preparar el PDF. Intente nuevamente.');
    } finally { if (!controller.signal.aborted) setPdfLoading(false); }
  };
  return <section className={`audit-panel${pdfOpen && pdfRows ? ' audit-print-ready' : ''}`} aria-labelledby="audit-title">
    <header className="audit-header"><div><h3 id="audit-title"><FileText size={22} aria-hidden="true" />Registro de Auditoría</h3></div>
      <div className="audit-toolbar"><button className="audit-button" disabled={loading} onClick={() => setRefresh(n => n + 1)}><RefreshCw size={14} />Actualizar</button><div className="audit-export"><button className="audit-button audit-export-button" aria-expanded={exportOpen} onClick={() => setExportOpen(open => !open)}><Download size={14} />Exportar (CSV / PDF)</button>{exportOpen && <div className="audit-export-menu"><small>Exportar la página visible</small><button disabled={loading || !rows.length} onClick={exportCsv}>Descargar CSV</button><button disabled={loading || !rows.length} onClick={() => { setExportOpen(false); setPdfOpen(true); setPdfRows(null); setPdfError(''); }}>Preparar PDF</button></div>}</div></div>
    </header>
    <div className="audit-stats" aria-label="Resumen de resultados">{[['EVENTOS TOTALES', total, Archive, 'total'], ['MODIFICACIONES', summary.find(x => x.accion === 'MODIFICAR')?.cantidad || 0, Pencil, 'modify'], ['CREACIONES', summary.find(x => x.accion === 'CREAR')?.cantidad || 0, Plus, 'create'], ['ELIMINACIONES', summary.find(x => x.accion === 'ELIMINAR')?.cantidad || 0, Trash2, 'delete']].map(([label, count, Icon, tone]) => <article key={tone} className={`audit-stat audit-${tone}`}><div><span>{label}</span><strong>{loading ? '—' : count}</strong><small>{tone === 'total' ? 'Según los filtros seleccionados' : `${total ? (count / total * 100).toFixed(1) : '0.0'}% del total`}</small></div><div className="audit-stat-icon"><Icon size={19} /></div></article>)}</div>
    <div className="filter-panel audit-filters"><div className="audit-filter-main">
      <div className="audit-search"><Search size={16} /><input aria-label="Buscar por responsable, módulo o acción" className="form-input" placeholder="Buscar por responsable, módulo o acción…" value={filters.buscar} onChange={e => change('buscar', e.target.value)} /></div>
      <div><label htmlFor="audit-entity" className="audit-sr-only">Módulo</label><select id="audit-entity" className="form-select" value={filters.entidad} onChange={e => change('entidad', e.target.value)}><option value="">Todos los módulos</option>{entities.map(name => <option key={name}>{name}</option>)}</select></div>
      <div><label htmlFor="audit-action" className="audit-sr-only">Acción</label><select id="audit-action" className="form-select" value={filters.accion} onChange={e => change('accion', e.target.value)}><option value="">Todas las acciones</option>{['CREAR', 'MODIFICAR', 'ELIMINAR'].map(name => <option key={name}>{name}</option>)}</select></div>
      <div><label htmlFor="audit-from" className="audit-sr-only">Desde</label><input id="audit-from" title="Desde (hora de Chile)" type="date" className="form-input" value={filters.desde} onChange={e => change('desde', e.target.value)} /></div>
    </div><details className="audit-advanced"><summary>Más filtros</summary><div className="filter-grid">
      <div><label htmlFor="audit-origin" className="form-label">Origen</label><select id="audit-origin" className="form-select" value={filters.origen} onChange={e => change('origen', e.target.value)}><option value="">Todos</option>{['API', 'SISTEMA', 'SQL'].map(name => <option key={name}>{name}</option>)}</select></div>
      <div><label htmlFor="audit-user" className="form-label">Responsable</label><input id="audit-user" className="form-input" value={filters.usuario} onChange={e => change('usuario', e.target.value)} placeholder="Buscar por nombre" /></div>
      <div><label htmlFor="audit-to" className="form-label">Hasta</label><input id="audit-to" type="date" className="form-input" value={filters.hasta} onChange={e => change('hasta', e.target.value)} /></div>
      <div><label htmlFor="audit-operation" className="form-label">Identificador de operación</label><input id="audit-operation" className="form-input" value={filters.operacionId} onChange={e => change('operacionId', e.target.value)} placeholder="UUID de la operación" /></div>
    </div></details><div className="audit-filter-actions">
      <button type="button" className="btn btn-secondary" onClick={() => { setFilters(initial); setPage(1); }}>Limpiar filtros</button>
    </div></div>
    {error && <p className="alert alert-danger" role="alert">{error}</p>}
    <div className="audit-table-card">{loading ? <p className="audit-empty" role="status">Cargando historial…</p> : <>
      <div className="table-responsive"><table className="custom-table"><thead><tr><th>Fecha y hora</th><th>Responsable</th><th>Acción</th><th>Módulo</th><th>Origen</th><th>Detalle</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}><td>{formatDate(row.fechaHora)}</td><td><div className="audit-person"><span className="audit-avatar" aria-hidden="true">{initials(row.usuarioNombre)}</span><div><strong>{row.usuarioNombre || 'Sistema'}</strong><small>{row.usuarioId ? 'Usuario del sistema' : 'Proceso del sistema'}</small></div></div></td><td><span className={`audit-action audit-${({ CREAR: 'create', MODIFICAR: 'modify', ELIMINAR: 'delete' })[row.accion] || 'total'}`}><i />{row.accion}</span></td><td><span className="audit-module">{row.entidad}</span></td><td><span className="audit-origin">{row.origen === 'API' && <span aria-hidden="true">‹/› </span>}{row.origen}</span></td><td><button className="audit-detail-button" type="button" onClick={() => setSelectedId(row.id)}><Eye size={13} />Ver detalle</button></td></tr>)}</tbody>
      </table></div>{rows.length === 0 && <p>No hay cambios para los filtros seleccionados.</p>}
      <footer className="audit-pagination"><div>Mostrando <strong>{total ? (page - 1) * size + 1 : 0} a {Math.min(page * size, total)}</strong> de <strong>{total}</strong> registros <label>Mostrar<select aria-label="Registros por página" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(1); }}>{[5, 10, 25, 50, 100].map(n => <option key={n}>{n}</option>)}</select></label></div><nav aria-label="Páginas del historial"><button disabled={page <= 1} onClick={() => setPage(n => n - 1)}>‹ Anterior</button>{numbers.map((n, i) => <React.Fragment key={n}>{i > 0 && n - numbers[i - 1] > 1 && <span>…</span>}<button className="audit-page" aria-label={`Página ${n}`} aria-current={n === page ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button></React.Fragment>)}<button disabled={page >= pages} onClick={() => setPage(n => n + 1)}>Siguiente ›</button></nav></footer>
    </>}</div>
    {pdfOpen && <dialog ref={pdfDialog} className="audit-pdf-dialog" aria-labelledby="audit-pdf-title" onCancel={e => { e.preventDefault(); closePdf(); }}>
      <div className="audit-pdf-content">
        <div className="audit-pdf-heading"><h3 id="audit-pdf-title">Exportar registro de auditoría a PDF</h3><button autoFocus className="audit-button" aria-label="Cerrar exportación PDF" onClick={closePdf}><X size={18} /></button></div>
        <AccessibleForm className="audit-pdf-controls" onSubmit={preparePdf}>
          <p>Incluya de 1 a 100 registros, empezando por los más recientes que coincidan con los filtros actuales.</p>
          <label htmlFor="audit-pdf-count">Cantidad de registros <RequiredIndicator /></label>
          <NumericInput id="audit-pdf-count" className="form-input" type="number" min="1" max="100" step="1" required value={pdfCount} disabled={pdfLoading} onChange={e => { setPdfCount(e.target.value); setPdfRows(null); setPdfError(''); }} />
          <small>Máximo 100 por PDF. Se realiza una sola consulta limitada; no se modifican datos.</small>
          <SubmitButton className="audit-button audit-export-button" disabled={pdfLoading} type="submit">{pdfLoading ? 'Preparando…' : 'Preparar PDF'}</SubmitButton>
          {pdfError && <p role="alert">{pdfError}</p>}
        </AccessibleForm>
        {pdfRows && <><div className="audit-pdf-result"><p>{pdfRows.length} registros incluidos de {pdfCount} solicitados.</p><button className="audit-button audit-export-button" disabled={!pdfRows.length} onClick={() => window.print()}>Imprimir / Guardar PDF</button></div>
          <div className="audit-pdf-sheet"><h2>Registro de Auditoría</h2><p>{pdfRows.length} registros · Fechas en hora de Chile</p><table><thead><tr><th>Fecha y hora</th><th>Responsable</th><th>Acción</th><th>Módulo</th><th>Origen</th></tr></thead><tbody>{pdfRows.map(row => <tr key={row.id}><td>{formatDate(row.fechaHora)}</td><td>{row.usuarioNombre || 'Sistema'}</td><td>{row.accion}</td><td>{row.entidad}</td><td>{row.origen}</td></tr>)}</tbody></table>{!pdfRows.length && <p>No hay registros para los filtros seleccionados.</p>}</div>
        </>}
        <button className="audit-button audit-pdf-cancel" onClick={closePdf}>Cerrar</button>
      </div>
    </dialog>}
    {selectedId != null && <section className="filter-panel" style={{ marginTop: '1.5rem' }} aria-labelledby="audit-detail-title">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><h4 id="audit-detail-title">Detalle del cambio</h4><button type="button" className="btn-icon" aria-label="Cerrar detalle" onClick={() => { setSelectedId(null); setDetail(null); }}><X size={18} /></button></div>
      {detailLoading ? <p role="status">Cargando detalle…</p> : detail && <>
        <p style={{ margin: '1rem 0', overflowWrap: 'anywhere' }}>Operación: {detail.operacionId}</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { change('operacionId', detail.operacionId); }}>Ver cambios de esta operación</button>
        {fields.length ? <div className="table-responsive" style={{ marginTop: '1rem' }}><table className="custom-table"><thead><tr><th>Campo</th><th>Antes</th><th>Después</th></tr></thead><tbody>{fields.map(field => <tr key={field}><td>{field}</td><td style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: 360 }}>{value(detail.valoresAnteriores, field)}</td><td style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: 360 }}>{value(detail.valoresNuevos, field)}</td></tr>)}</tbody></table></div> : <p style={{ marginTop: '1rem' }}>Evento registrado sin valores públicos. Los campos sensibles no se muestran.</p>}
      </>}
    </section>}
  </section>;
}
