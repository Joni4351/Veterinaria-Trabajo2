import React, { useState } from 'react';
import api from '../services/api';
import { ConfirmModal } from './ConfirmModal';

export function HistoricalSeedPanel() {
  const [confirmed, setConfirmed] = useState(false), [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const generate = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const r = await api.post('/api/v1/admin/datos-prueba/historico', { dataset: 'vetclinic-historico-v1', confirmado: true });
      setMessage(Object.entries(r.data.creados).map(([key, count]) => `${key}: ${count}`).join(' · ')); setConfirmed(false);
    } catch (e) { setError(e.userMessage || 'No se pudo completar el lote histórico.'); }
    finally { setBusy(false); setOpen(false); }
  };
  return <section style={{ padding: 24, borderTop: '1px solid var(--border-color)' }} aria-labelledby="historical-title"><h2 id="historical-title">Historia sintética de doce meses</h2>
    <p>Este lote agrega hasta 500 pacientes, citas, consultas y facturas, distribuidos en doce meses. Se identifica como DEMO HIST y utiliza datos ficticios. Al repetirlo se reutilizan sus registros.</p>
    <p>Se cargará en la base actualmente conectada. Utiliza preferentemente el entorno de pruebas.</p>
    <label style={{ display: 'flex', gap: 10, margin: '16px 0' }}><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} />Confirmo la carga del lote histórico en esta base.</label>
    <button className="btn btn-secondary" disabled={!confirmed || busy} onClick={() => setOpen(true)}>Cargar historia sintética</button>
    {message && <p role="status">Lote procesado. {message}</p>}{error && <p role="alert" className="alert alert-danger">{error}</p>}
    <ConfirmModal isOpen={open} title="Confirmar carga histórica" message="Se agregarán datos sintéticos a la base conectada. No se eliminan los datos existentes. ¿Desea continuar?" danger={false} confirmText="Cargar lote" loading={busy} onCancel={() => setOpen(false)} onConfirm={generate} />
  </section>;
}
