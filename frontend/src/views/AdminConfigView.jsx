import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Award, Shield, UserCheck, Plus, Trash2, Edit2, X, AlertCircle, Filter, RotateCcw } from 'lucide-react';
import { especialidadSchema, rolSchema } from '../schemas/adminSchema';
import { ConfirmModal } from '../components/ConfirmModal';

export const AdminConfigView = () => {
  const [activeTab, setActiveTab] = useState('especialidades');
  const [especialidades, setEspecialidades] = useState([]);
  const [roles, setRoles] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros API
  const [espFilters, setEspFilters] = useState({ nombre: '', costoMin: '', costoMax: '' });
  const [rolFilters, setRolFilters] = useState({ nombre: '', permisosEscritura: '' });
  const [usuFilters, setUsuFilters] = useState({ nombre: '', email: '', rolId: '' });

  // Modales
  const [modalType, setModalType] = useState(null);
  const [espForm, setEspForm] = useState({ id: null, nombre: '', costoBase: 0 });
  const [rolForm, setRolForm] = useState({ id: null, nombre: '', permisosEscritura: false });
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Modal Confirmación
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    type: null, // 'esp' | 'rol' | 'usu'
    id: null,
    title: '',
    message: '',
    loading: false
  });

  useEffect(() => {
    if (activeTab === 'especialidades') fetchEspecialidades();
    if (activeTab === 'roles') fetchRoles();
    if (activeTab === 'usuarios') fetchUsuarios();
  }, [activeTab, espFilters, rolFilters, usuFilters]);

  const fetchEspecialidades = async () => {
    setLoading(true);
    try {
      const params = {};
      if (espFilters.nombre) params.nombre = espFilters.nombre;
      if (espFilters.costoMin) params.costoMin = espFilters.costoMin;
      if (espFilters.costoMax) params.costoMax = espFilters.costoMax;
      const res = await api.get('/api/v1/especialidades', { params });
      setEspecialidades(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const params = {};
      if (rolFilters.nombre) params.nombre = rolFilters.nombre;
      if (rolFilters.permisosEscritura !== '') params.permisosEscritura = rolFilters.permisosEscritura === 'true';
      const res = await api.get('/api/v1/roles', { params });
      setRoles(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const params = {};
      if (usuFilters.nombre) params.nombre = usuFilters.nombre;
      if (usuFilters.email) params.email = usuFilters.email;
      if (usuFilters.rolId) params.rolId = usuFilters.rolId;
      const res = await api.get('/api/v1/usuarios', { params });
      setUsuarios(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEspModal = (esp = null) => {
    setFormError('');
    setFieldErrors({});
    if (esp) {
      setEspForm({ id: esp.id, nombre: esp.nombre, costoBase: esp.costoBase });
    } else {
      setEspForm({ id: null, nombre: '', costoBase: 0 });
    }
    setModalType('esp');
  };

  const handleSaveEsp = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    const validation = especialidadSchema.safeParse(espForm);
    if (!validation.success) {
      const errors = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) errors[err.path[0]] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    try {
      const payload = {
        nombre: validation.data.nombre,
        costoBase: validation.data.costoBase
      };
      if (espForm.id) {
        await api.put(`/api/v1/especialidades/${espForm.id}`, payload);
      } else {
        await api.post('/api/v1/especialidades', payload);
      }
      setModalType(null);
      fetchEspecialidades();
    } catch (err) {
      if (err.response?.data?.errors) {
        setFormError(Object.values(err.response.data.errors).flat().join(' '));
      } else {
        setFormError(err.response?.data?.message || 'Error al guardar especialidad');
      }
    }
  };

  const handleOpenRolModal = (rol = null) => {
    setFormError('');
    setFieldErrors({});
    if (rol) {
      setRolForm({ id: rol.id, nombre: rol.nombre, permisosEscritura: Boolean(rol.permisosEscritura) });
    } else {
      setRolForm({ id: null, nombre: '', permisosEscritura: false });
    }
    setModalType('rol');
  };

  const handleSaveRol = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    const validation = rolSchema.safeParse(rolForm);
    if (!validation.success) {
      const errors = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) errors[err.path[0]] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    try {
      const payload = {
        nombre: validation.data.nombre,
        permisosEscritura: validation.data.permisosEscritura
      };
      if (rolForm.id) {
        await api.put(`/api/v1/roles/${rolForm.id}`, payload);
      } else {
        await api.post('/api/v1/roles', payload);
      }
      setModalType(null);
      fetchRoles();
    } catch (err) {
      if (err.response?.data?.errors) {
        setFormError(Object.values(err.response.data.errors).flat().join(' '));
      } else {
        setFormError(err.response?.data?.message || 'Error al guardar rol');
      }
    }
  };

  const handleRequestDelete = (type, id, name) => {
    const titles = {
      esp: 'Eliminar Especialidad',
      rol: 'Eliminar Rol',
      usu: 'Eliminar Usuario del Sistema'
    };
    const messages = {
      esp: `¿Está seguro de que desea eliminar la especialidad "${name || id}"?`,
      rol: `¿Está seguro de que desea eliminar el rol "${name || id}"?`,
      usu: `¿Está seguro de que desea eliminar el usuario "${name || id}" del sistema?`
    };

    setDeleteConfirm({
      isOpen: true,
      type,
      id,
      title: titles[type] || 'Eliminar Registro',
      message: messages[type] || '¿Está seguro de realizar esta eliminación?',
      loading: false
    });
  };

  const handleConfirmDelete = async () => {
    setDeleteConfirm(prev => ({ ...prev, loading: true }));
    try {
      if (deleteConfirm.type === 'esp') {
        await api.delete(`/api/v1/especialidades/${deleteConfirm.id}`);
        fetchEspecialidades();
      } else if (deleteConfirm.type === 'rol') {
        await api.delete(`/api/v1/roles/${deleteConfirm.id}`);
        fetchRoles();
      } else if (deleteConfirm.type === 'usu') {
        await api.delete(`/api/v1/usuarios/${deleteConfirm.id}`);
        fetchUsuarios();
      }
      setDeleteConfirm({ isOpen: false, type: null, id: null, title: '', message: '', loading: false });
    } catch (err) {
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
      alert(err.response?.data?.message || 'No se pudo eliminar el registro.');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Panel de Control de Administración</h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Gestión centralizada de Especialidades Clínicas, Roles RBAC y Cuentas de Acceso
            </p>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', padding: '0 1.5rem', background: '#f8fafc' }}>
          <button
            onClick={() => setActiveTab('especialidades')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: activeTab === 'especialidades' ? '#0284c7' : '#64748b',
              borderBottom: activeTab === 'especialidades' ? '2px solid #0284c7' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Award size={18} /> Especialidades Médicas
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: activeTab === 'roles' ? '#0284c7' : '#64748b',
              borderBottom: activeTab === 'roles' ? '2px solid #0284c7' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Shield size={18} /> Roles de Seguridad (RBAC)
          </button>
          <button
            onClick={() => setActiveTab('usuarios')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: activeTab === 'usuarios' ? '#0284c7' : '#64748b',
              borderBottom: activeTab === 'usuarios' ? '2px solid #0284c7' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <UserCheck size={18} /> Cuentas de Usuarios
          </button>
        </div>

        {/* Tab 1: Especialidades */}
        {activeTab === 'especialidades' && (
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Catálogo de Especialidades</h3>
              <button className="btn btn-primary" onClick={() => handleOpenEspModal()}>
                <Plus size={16} /> Nueva Especialidad
              </button>
            </div>

            {/* Filtros Especialidades */}
            <div className="filter-panel" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>
                <Filter size={15} /> Filtros de Especialidades (API)
              </div>
              <div className="filter-grid">
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Nombre</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Filtrar por nombre..."
                    value={espFilters.nombre}
                    onChange={(e) => setEspFilters({ ...espFilters, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Costo Mínimo ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={espFilters.costoMin}
                    onChange={(e) => setEspFilters({ ...espFilters, costoMin: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Costo Máximo ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Sin límite"
                    value={espFilters.costoMax}
                    onChange={(e) => setEspFilters({ ...espFilters, costoMax: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => setEspFilters({ nombre: '', costoMin: '', costoMax: '' })}>
                    <RotateCcw size={14} /> Limpiar
                  </button>
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Nombre de Especialidad</th>
                    <th>Costo Base Consulta</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {especialidades.map(esp => (
                    <tr key={esp.id}>
                      <td data-label="Nombre"><strong>{esp.nombre}</strong></td>
                      <td data-label="Costo Base">${Number(esp.costoBase).toFixed(2)}</td>
                      <td data-label="Acciones" style={{ textAlign: 'right' }}>
                        <button className="btn-icon" onClick={() => handleOpenEspModal(esp)} title="Editar" aria-label="Editar especialidad">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-icon danger" onClick={() => handleRequestDelete('esp', esp.id, esp.nombre)} title="Eliminar" aria-label="Eliminar especialidad">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Roles */}
        {activeTab === 'roles' && (
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Roles de Seguridad del Sistema</h3>
              <button className="btn btn-primary" onClick={() => handleOpenRolModal()}>
                <Plus size={16} /> Nuevo Rol
              </button>
            </div>

            {/* Filtros Roles */}
            <div className="filter-panel" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>
                <Filter size={15} /> Filtros de Roles (API)
              </div>
              <div className="filter-grid">
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Nombre del Rol</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Filtrar rol..."
                    value={rolFilters.nombre}
                    onChange={(e) => setRolFilters({ ...rolFilters, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Permisos de Escritura</label>
                  <select
                    className="form-select"
                    value={rolFilters.permisosEscritura}
                    onChange={(e) => setRolFilters({ ...rolFilters, permisosEscritura: e.target.value })}
                  >
                    <option value="">Todos</option>
                    <option value="true">Con Escritura</option>
                    <option value="false">Solo Lectura</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => setRolFilters({ nombre: '', permisosEscritura: '' })}>
                    <RotateCcw size={14} /> Limpiar
                  </button>
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Rol</th>
                    <th>Nivel de Acceso</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map(r => (
                    <tr key={r.id}>
                      <td data-label="Rol"><strong>{r.nombre}</strong></td>
                      <td data-label="Nivel de Acceso">
                        <span className={`badge ${r.permisosEscritura ? 'badge-primary' : 'badge-secondary'}`}>
                          {r.permisosEscritura ? 'Escritura / Modificación' : 'Solo Lectura'}
                        </span>
                      </td>
                      <td data-label="Acciones" style={{ textAlign: 'right' }}>
                        <button className="btn-icon" onClick={() => handleOpenRolModal(r)} title="Editar rol" aria-label="Editar rol">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-icon danger" onClick={() => handleRequestDelete('rol', r.id, r.nombre)} title="Eliminar rol" aria-label="Eliminar rol">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Usuarios */}
        {activeTab === 'usuarios' && (
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Usuarios Registrados</h3>
                <p style={{ color: '#64748b', fontSize: '0.82rem' }}>
                  Las credenciales y altas de usuarios se gestionan a través del endpoint seguro `/api/v1/usuarios/registro`
                </p>
              </div>
            </div>

            {/* Filtros Usuarios */}
            <div className="filter-panel" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>
                <Filter size={15} /> Filtros de Usuarios (API)
              </div>
              <div className="filter-grid">
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Nombre</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Filtrar por nombre..."
                    value={usuFilters.nombre}
                    onChange={(e) => setUsuFilters({ ...usuFilters, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Email</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Filtrar por email..."
                    value={usuFilters.email}
                    onChange={(e) => setUsuFilters({ ...usuFilters, email: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Rol</label>
                  <select
                    className="form-select"
                    value={usuFilters.rolId}
                    onChange={(e) => setUsuFilters({ ...usuFilters, rolId: e.target.value })}
                  >
                    <option value="">Todos los roles</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => setUsuFilters({ nombre: '', email: '', rolId: '' })}>
                    <RotateCcw size={14} /> Limpiar
                  </button>
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Nombre Completo</th>
                    <th>Correo Electrónico</th>
                    <th>Rol Asignado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id}>
                      <td data-label="Nombre Completo"><strong>{u.nombreCompleto}</strong></td>
                      <td data-label="Correo Electrónico">{u.email}</td>
                      <td data-label="Rol Asignado">
                        <span className="badge badge-primary">{u.rol || 'Usuario'}</span>
                      </td>
                      <td data-label="Acciones" style={{ textAlign: 'right' }}>
                        <button className="btn-icon danger" onClick={() => handleRequestDelete('usu', u.id, u.nombreCompleto)} title="Eliminar usuario" aria-label="Eliminar usuario">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Especialidad */}
      {modalType === 'esp' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {espForm.id ? 'Editar Especialidad' : 'Nueva Especialidad Médica'}
              </h3>
              <button className="btn-icon" onClick={() => setModalType(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEsp} noValidate>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" role="alert" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="esp-nombre">Nombre de la Especialidad *</label>
                  <input
                    id="esp-nombre"
                    type="text"
                    className={`form-input ${fieldErrors.nombre ? 'border-red-500' : ''}`}
                    placeholder="Ej. Cirugía, Dermatología, Traumatología"
                    value={espForm.nombre}
                    onChange={(e) => {
                      setEspForm({ ...espForm, nombre: e.target.value });
                      if (fieldErrors.nombre) setFieldErrors(prev => ({ ...prev, nombre: null }));
                    }}
                    aria-invalid={!!fieldErrors.nombre}
                  />
                  {fieldErrors.nombre && (
                    <span role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                      {fieldErrors.nombre}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="esp-costo">Costo Base ($) *</label>
                  <input
                    id="esp-costo"
                    type="number"
                    step="0.01"
                    className={`form-input ${fieldErrors.costoBase ? 'border-red-500' : ''}`}
                    value={espForm.costoBase}
                    onChange={(e) => {
                      setEspForm({ ...espForm, costoBase: e.target.value });
                      if (fieldErrors.costoBase) setFieldErrors(prev => ({ ...prev, costoBase: null }));
                    }}
                    aria-invalid={!!fieldErrors.costoBase}
                  />
                  {fieldErrors.costoBase && (
                    <span role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                      {fieldErrors.costoBase}
                    </span>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rol */}
      {modalType === 'rol' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {rolForm.id ? 'Editar Rol' : 'Nuevo Rol de Usuario'}
              </h3>
              <button className="btn-icon" onClick={() => setModalType(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveRol} noValidate>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger" role="alert" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="rol-nombre">Nombre del Rol *</label>
                  <input
                    id="rol-nombre"
                    type="text"
                    className={`form-input ${fieldErrors.nombre ? 'border-red-500' : ''}`}
                    placeholder="Ej. Veterinario, Auxiliar"
                    value={rolForm.nombre}
                    onChange={(e) => {
                      setRolForm({ ...rolForm, nombre: e.target.value });
                      if (fieldErrors.nombre) setFieldErrors(prev => ({ ...prev, nombre: null }));
                    }}
                    aria-invalid={!!fieldErrors.nombre}
                  />
                  {fieldErrors.nombre && (
                    <span role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                      {fieldErrors.nombre}
                    </span>
                  )}
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                  <input
                    type="checkbox"
                    id="permisosEscritura"
                    checked={rolForm.permisosEscritura}
                    onChange={(e) => setRolForm({ ...rolForm, permisosEscritura: e.target.checked })}
                  />
                  <label htmlFor="permisosEscritura" style={{ fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 }}>
                    Permisos de Escritura y Modificación habilitados
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ConfirmModal para eliminación */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, type: null, id: null, title: '', message: '', loading: false })}
      />
    </div>
  );
};
