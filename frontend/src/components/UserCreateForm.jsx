import { AccessibleForm, RequiredIndicator, SubmitButton } from "./AccessibleForm";
import React, { useState, useEffect } from 'react';
import { Plus, X, UserRound } from 'lucide-react';
import { AccessibleDialog } from './AccessibleDialog';
import api from '../services/api';
import { registerSchema } from '../schemas/authSchema';
import authService from '../services/authService';

export function UserCreateForm({ roles, onCreated, editingUser = null, onEditClosed }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombreCompleto: '', email: '', password: '', rolId: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!editingUser) return;
    setForm({ nombreCompleto: editingUser.nombreCompleto, email: editingUser.email, password: '', rolId: String(editingUser.rolId ?? roles.find(r => r.nombre === editingUser.rol)?.id ?? '') });
    setError(''); setFieldErrors({}); setSuccess(''); setOpen(true);
  }, [editingUser]);
  const close = () => {
    if (saving) return;
    setOpen(false); setForm({ nombreCompleto: '', email: '', password: '', rolId: '' }); setError(''); setFieldErrors({}); onEditClosed?.();
  };
  async function submit(event) {
    event.preventDefault(); setError(''); setSuccess(''); setFieldErrors({});
    const schema = editingUser && !form.password ? registerSchema.omit({ password: true }) : registerSchema;
    const result = schema.safeParse(form);
    if (!result.success) {
      setFieldErrors(Object.fromEntries(result.error.issues.map(issue => [issue.path[0], issue.message])));
      setError('Revise los campos indicados antes de guardar el usuario.'); return;
    }
    setSaving(true);
    try {
      if (editingUser) await api.put(`/api/v1/usuarios/${editingUser.id}`, result.data);
      else await authService.register(result.data);
      setForm({ nombreCompleto: '', email: '', password: '', rolId: '' });
      setOpen(false); setSuccess(editingUser ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente. Puede ingresar con sus credenciales.');
      onEditClosed?.();
      onCreated();
    } catch (err) {
      setFieldErrors(Object.fromEntries(Object.entries(err.response?.data?.errors || {}).map(([key, messages]) =>
        [key.charAt(0).toLowerCase() + key.slice(1), [].concat(messages).join(' ')])));
      setError(Object.values(err.response?.data?.errors || {}).flat().join(' ') || err.userMessage || err.response?.data?.message || 'No se pudo guardar el usuario. Intente nuevamente.');
    } finally { setSaving(false); }
  }
  const attributes = (field, id) => ({ 'aria-invalid': !!fieldErrors[field], 'aria-describedby': fieldErrors[field] ? `${id}-error` : undefined });
  const fieldError = (field, id) => fieldErrors[field] && <span className="form-error" id={`${id}-error`}>{fieldErrors[field]}</span>;
  return <div>
    {success && <p role="status" className="alert alert-success">{success}</p>}
    <button type="button" className="btn btn-primary" aria-haspopup="dialog" onClick={() => { onEditClosed?.(); setForm({ nombreCompleto: '', email: '', password: '', rolId: '' }); setOpen(true); setError(''); setSuccess(''); setFieldErrors({}); }} disabled={saving}><Plus size={16} aria-hidden="true" /> Nuevo usuario</button>
    {open && <AccessibleDialog className="modal-overlay" aria-labelledby="user-dialog-title" onClose={close}>
    <div className="modal-content" style={{ maxWidth: 620, width: '95%' }}>
    <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}><UserRound size={24} color="var(--teal-text)" aria-hidden="true" /><h2 id="user-dialog-title" style={{ fontSize: 20, flex: 1 }}>{editingUser ? 'Editar usuario' : 'Crear usuario'}</h2><button type="button" className="btn-icon" aria-label="Cerrar formulario de usuario" onClick={close} disabled={saving}><X size={20} aria-hidden="true" /></button></header>
    <AccessibleForm onSubmit={submit} noValidate aria-label={editingUser ? 'Editar usuario' : 'Crear usuario'}>
      {error && <p role="alert" className="alert alert-danger">{error}</p>}
      <div className="filter-grid" style={{ alignItems: 'start' }}>
        <div className="form-group"><label htmlFor="new-user-name" className="form-label">Nombre completo <RequiredIndicator /></label>
          <input id="new-user-name" {...attributes('nombreCompleto', 'new-user-name')} className="form-input" autoComplete="name" maxLength={100} value={form.nombreCompleto} disabled={saving} onChange={e => setForm({ ...form, nombreCompleto: e.target.value })} required />{fieldError('nombreCompleto', 'new-user-name')}</div>
        <div className="form-group"><label htmlFor="new-user-email" className="form-label">Correo electrónico <RequiredIndicator /></label>
          <input id="new-user-email" {...attributes('email', 'new-user-email')} className="form-input" type="email" autoComplete="off" value={form.email} disabled={saving} onChange={e => setForm({ ...form, email: e.target.value })} required />{fieldError('email', 'new-user-email')}</div>
        <div className="form-group"><label htmlFor="new-user-password" className="form-label">{editingUser ? 'Nueva contraseña (opcional)' : <>Contraseña inicial <RequiredIndicator /></>}</label>
          <input id="new-user-password" {...attributes('password', 'new-user-password')} className="form-input" type="password" autoComplete="new-password" aria-describedby={fieldErrors.password ? 'new-user-password-help new-user-password-error' : 'new-user-password-help'} value={form.password} disabled={saving} onChange={e => setForm({ ...form, password: e.target.value })} required={!editingUser} /><small id="new-user-password-help" style={{ display: 'block', marginTop: '.35rem' }}>{editingUser ? 'Déjela vacía para conservar la actual. Mínimo 6 caracteres si la cambia.' : 'Mínimo 6 caracteres.'}</small>{fieldError('password', 'new-user-password')}</div>
        <div className="form-group"><label htmlFor="new-user-role" className="form-label">Rol del usuario <RequiredIndicator /></label>
          <select id="new-user-role" {...attributes('rolId', 'new-user-role')} className="form-select" value={form.rolId} disabled={saving} onChange={e => setForm({ ...form, rolId: e.target.value })} required>
            <option value="">Seleccione un rol</option>{roles.map(role => <option key={role.id} value={role.id}>{role.nombre}</option>)}
          </select>{fieldError('rolId', 'new-user-role')}</div>
      </div>
      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
        <SubmitButton className="btn btn-primary" type="submit" disabled={saving || !roles.length}>{saving ? 'Guardando…' : editingUser ? 'Guardar cambios' : 'Crear usuario'}</SubmitButton>
        <button className="btn btn-secondary" type="button" disabled={saving} onClick={close}>Cancelar</button>
      </div>
    </AccessibleForm></div></AccessibleDialog>}
  </div>;
}
