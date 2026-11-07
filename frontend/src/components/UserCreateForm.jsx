import React, { useState } from 'react';
import { registerSchema } from '../schemas/authSchema';
import authService from '../services/authService';

export function UserCreateForm({ roles, onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombreCompleto: '', email: '', password: '', rolId: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(''); setSuccess('');
    const result = registerSchema.safeParse(form);
    if (!result.success) { setError(result.error.issues.map(i => i.message).join(' ')); return; }
    setSaving(true);
    try {
      await authService.register(result.data);
      setForm({ nombreCompleto: '', email: '', password: '', rolId: '' });
      setOpen(false); setSuccess('Usuario creado correctamente. Puede ingresar con sus credenciales.');
      onCreated();
    } catch (err) {
      setError(Object.values(err.response?.data?.errors || {}).flat().join(' ') || err.response?.data?.message || 'No se pudo crear el usuario. Intente nuevamente.');
    } finally { setSaving(false); }
  }
  return <div style={{ marginBottom: '1.5rem' }}>
    {success && <p role="status" className="alert alert-success">{success}</p>}
    <button type="button" className="btn btn-primary" aria-expanded={open} onClick={() => { setOpen(v => !v); setError(''); setSuccess(''); }} disabled={saving}>Nuevo usuario</button>
    {open && <form onSubmit={submit} noValidate className="filter-panel" style={{ marginTop: '1rem' }} aria-label="Crear usuario">
      <h4 style={{ marginBottom: '1rem' }}>Crear usuario</h4>
      {error && <p role="alert" className="alert alert-danger">{error}</p>}
      <div className="filter-grid" style={{ alignItems: 'start' }}>
        <div className="form-group"><label htmlFor="new-user-name" className="form-label">Nombre completo</label>
          <input id="new-user-name" className="form-input" autoComplete="name" maxLength={100} value={form.nombreCompleto} disabled={saving} onChange={e => setForm({ ...form, nombreCompleto: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="new-user-email" className="form-label">Correo electrónico</label>
          <input id="new-user-email" className="form-input" type="email" autoComplete="off" value={form.email} disabled={saving} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="new-user-password" className="form-label">Contraseña inicial</label>
          <input id="new-user-password" className="form-input" type="password" autoComplete="new-password" aria-describedby="new-user-password-help" value={form.password} disabled={saving} onChange={e => setForm({ ...form, password: e.target.value })} /><small id="new-user-password-help" style={{ display: 'block', marginTop: '.35rem' }}>Mínimo 6 caracteres.</small></div>
        <div className="form-group"><label htmlFor="new-user-role" className="form-label">Rol del usuario</label>
          <select id="new-user-role" className="form-select" value={form.rolId} disabled={saving} onChange={e => setForm({ ...form, rolId: e.target.value })}>
            <option value="">Seleccione un rol</option>{roles.map(role => <option key={role.id} value={role.id}>{role.nombre}</option>)}
          </select></div>
      </div>
      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" type="submit" disabled={saving || !roles.length}>{saving ? 'Creando…' : 'Crear usuario'}</button>
        <button className="btn btn-secondary" type="button" disabled={saving} onClick={() => { setOpen(false); setForm({ nombreCompleto: '', email: '', password: '', rolId: '' }); setError(''); }}>Cancelar</button>
      </div>
    </form>}
  </div>;
}
