import React, { useEffect, useRef, useState } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';
import { ProtectedRoute } from '../components/ProtectedRoute';

const labels = { usuarios: 'Cuenta veterinaria de demostración', roles: 'Rol veterinario si falta', especialidades: 'Especialidades', insumos: 'Insumos', clientes: 'Clientes', pacientes: 'Mascotas', citas: 'Citas', consultas: 'Consultas', recetas: 'Recetas', detallesReceta: 'Líneas de receta', facturas: 'Facturas', detallesFactura: 'Líneas de factura' };

export const DatosPruebaView = () => <ProtectedRoute allowedRoles={['Administrador']}><DatosPruebaPanel /></ProtectedRoute>;

function DatosPruebaPanel() {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [modal, setModal] = useState(false);
  const inFlight = useRef(false);

  async function load() {
    setLoading(true); setError('');
    try { setPlan((await api.get('/api/v1/admin/datos-prueba')).data); }
    catch { setPlan(null); setConfirmed(false); setError('No se pudo cargar la vista previa. Intente nuevamente.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    if (inFlight.current || !plan || !confirmed) return;
    inFlight.current = true;
    setSaving(true); setError(''); setResult(null);
    try {
      const response = await api.post('/api/v1/admin/datos-prueba', { dataset: plan.dataset, confirmado: true });
      setResult(response.data.creados); setConfirmed(false);
      await load();
    } catch (err) { setError(err.response?.data?.message || 'No se pudo confirmar el resultado de la carga. Actualice la vista previa antes de reintentar.'); }
    finally { inFlight.current = false; setSaving(false); setModal(false); }
  }

  return <section style={{ padding: '1.5rem' }} aria-labelledby="demo-heading">
    <h3 id="demo-heading" style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}><Database size={24} aria-hidden="true" /> Datos de prueba</h3>
    <p style={{ color: 'var(--gray-600)', margin: '1rem 0' }}>Genere un escenario académico completo para explorar el funcionamiento de VetClinic. Los registros se identificarán como DEMO V1.</p>
    {error && <div className="alert alert-danger" role="alert">{error}</div>}
    {error && !plan && !loading && <button type="button" className="btn btn-secondary" disabled={saving} onClick={load}>Reintentar vista previa</button>}
    {loading ? <p role="status">Cargando vista previa…</p> : plan && <>
      <p style={{ marginBottom: '1rem', color: 'var(--gray-600)' }}>{plan.descripcion}</p>
      <div className="table-responsive"><table className="custom-table">
        <caption style={{ textAlign: 'left', paddingBottom: '.75rem', color: 'var(--gray-700)' }}>Composición del lote completo. Los registros existentes se reutilizan.</caption>
        <thead><tr><th>Tipo de registro</th><th>Cantidad prevista</th>{result && <th>Creados en esta ejecución</th>}</tr></thead>
        <tbody>{Object.entries(plan.previstos).map(([key, count]) => <tr key={key}><td>{labels[key] || key}</td><td>{count}</td>{result && <td>{result[key] ?? 0}</td>}</tr>)}</tbody>
      </table></div>
      <p style={{ margin: '1rem 0' }}>Clientes de demostración detectados: <strong>{plan.clientesExistentes}</strong>.</p>
      <div className="filter-panel" style={{ margin: '1rem 0', lineHeight: 1.7 }}>
        <p>Se añadirán datos a la base conectada a esta aplicación. El lote incluye fechas clínicas, IVA y existencias coherentes. No se generan datos biométricos ni cuentas de administrador.</p>
        <p>La cuenta veterinaria utiliza una contraseña aleatoria que no se publica. Los ejemplos de recetas no son indicaciones médicas.</p>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '.75rem', marginTop: '1rem' }}>
          <input type="checkbox" checked={confirmed} disabled={saving} onChange={e => setConfirmed(e.target.checked)} style={{ marginTop: '.4rem', flexShrink: 0 }} />
          Confirmo que deseo agregar registros ficticios a esta base para pruebas y demostración académica.
        </label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem' }}>
        <button type="button" className="btn btn-primary" disabled={!confirmed || saving} onClick={() => setModal(true)}><Database size={18} aria-hidden="true" /> Generar datos de prueba</button>
        <button type="button" className="btn btn-secondary" disabled={saving} onClick={load}><RefreshCw size={18} aria-hidden="true" /> Actualizar vista previa</button>
      </div>
    </>}
    {result && <div className="alert alert-success" role="status" style={{ marginTop: '1rem' }}>
      {Object.values(result).reduce((sum, value) => sum + value, 0) === 0 ? 'El lote ya estaba cargado. No se crearon registros duplicados.' : `Carga completada: ${Object.values(result).reduce((sum, value) => sum + value, 0)} registros nuevos.`}
    </div>}
    <ConfirmModal isOpen={modal} title="Generar datos de prueba" danger={false} loading={saving}
      message="Se añadirán registros ficticios a la base conectada. Se reutilizarán los registros de este lote que ya existan. ¿Desea continuar?"
      confirmText="Sí, generar datos" onConfirm={generate} onCancel={() => { if (!saving) setModal(false); }} />
  </section>;
}
