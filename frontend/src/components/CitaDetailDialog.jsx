import React from 'react';
import { Calendar, X } from 'lucide-react';
import { AccessibleDialog } from './AccessibleDialog';

export function CitaDetailDialog({ cita, pacientes = [], clientes = [], onClose }) {
  const paciente = cita.paciente || pacientes.find(p => p.id === cita.pacienteId);
  const cliente = paciente?.cliente || clientes.find(c => c.id === paciente?.clienteId);
  const fields = [
    ['Paciente', paciente?.nombre], ['Especie', paciente?.especie], ['Raza', paciente?.raza],
    ['Peso', paciente?.peso != null ? `${paciente.peso} kg` : null],
    ['Propietario', cliente?.nombreCompleto], ['Documento del propietario', cliente?.documentoIdentidad],
    ['Teléfono de contacto', cliente?.telefono], ['Correo de contacto', cliente?.email],
    ['Veterinario responsable', cita.usuario?.nombreCompleto], ['Especialidad', cita.especialidad?.nombre],
    ['Fecha y hora', cita.fechaHora ? new Date(cita.fechaHora).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' }) : null],
    ['Estado', cita.estado], ['Antecedentes de alergias', paciente?.alergias]
  ];
  return <AccessibleDialog className="modal-overlay" aria-labelledby="cita-detail-title" onClose={onClose}>
    <div className="modal-content" style={{ maxWidth: 680, width: '95%' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Calendar size={24} color="var(--teal-text)" aria-hidden="true" />
        <h2 id="cita-detail-title" style={{ flex: 1, fontSize: 20 }}>Detalle de cita</h2>
        <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar detalle de cita"><X size={20} aria-hidden="true" /></button>
      </header>
      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '20px 24px' }}>
        {fields.map(([label, value]) => <div key={label} style={{ minWidth: 0 }}>
          <dt style={{ color: 'var(--gray-600)', fontSize: 12, marginBottom: 6 }}>{label}</dt>
          <dd style={{ margin: 0, color: 'var(--gray-900)', fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>{value || 'No informado'}</dd>
        </div>)}
      </dl>
      <footer style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', marginTop: 24, paddingTop: 18 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
      </footer>
    </div>
  </AccessibleDialog>;
}
