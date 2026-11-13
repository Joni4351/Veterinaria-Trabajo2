import { NumericInput } from '../components/NumericInput';
import { normalizeFieldErrors } from '../services/apiErrors';
import { AccessibleDialog } from "../components/AccessibleDialog";
import { AccessibleForm, RequiredIndicator, SubmitButton } from "../components/AccessibleForm";
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Award, Shield, UserCheck, Plus, Trash2, Edit2, X, AlertCircle, Filter, RotateCcw, History, FlaskConical, Users, LayoutDashboard } from 'lucide-react';
import { especialidadSchema, rolSchema } from '../schemas/adminSchema';
import { ConfirmModal } from '../components/ConfirmModal';
import { RegistroFacialView } from './RegistroFacialView';
import { UserCreateForm } from '../components/UserCreateForm';
import { DatosPruebaView } from './DatosPruebaView';
import { AuditoriaView } from './AuditoriaView';
import { DashboardView } from './DashboardView';
import { ReportesView } from './ReportesView';
import { notifySuccess, notifyConflict } from '../services/notifications';
import './AdminConfigView.css';

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
    if (activeTab === 'usuarios') { fetchUsuarios(); fetchRoles(); }
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
      validation.error.issues.forEach(err => {
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
      notifySuccess(espForm.id ? 'Especialidad actualizada correctamente.' : 'Especialidad registrada correctamente.');
      setModalType(null);
      fetchEspecialidades();
    } catch (err) {
      if (err.response?.data?.errors) {
        setFieldErrors(normalizeFieldErrors(err.response.data.errors));
        setFormError(Object.values(err.response.data.errors).flat().join(' '));
      } else {
        setFormError(err.userMessage || err.response?.data?.message || 'Error al guardar especialidad');
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
      validation.error.issues.forEach(err => {
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
      notifySuccess(rolForm.id ? 'Rol actualizado correctamente.' : 'Rol registrado correctamente.');
      setModalType(null);
      fetchRoles();
    } catch (err) {
      if (err.response?.data?.errors) {
        setFormError(Object.values(err.response.data.errors).flat().join(' '));
      } else {
        setFormError(err.userMessage || err.response?.data?.message || 'Error al guardar rol');
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
        notifySuccess('Especialidad eliminada correctamente.');
        fetchEspecialidades();
      } else if (deleteConfirm.type === 'rol') {
        await api.delete(`/api/v1/roles/${deleteConfirm.id}`);
        notifySuccess('Rol eliminado correctamente.');
        fetchRoles();
      } else if (deleteConfirm.type === 'usu') {
        await api.delete(`/api/v1/usuarios/${deleteConfirm.id}`);
        notifySuccess('Usuario eliminado correctamente.');
        fetchUsuarios();
      }
      setDeleteConfirm({ isOpen: false, type: null, id: null, title: '', message: '', loading: false });
    } catch (err) {
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
      notifyConflict(err.userMessage || err.response?.data?.message || 'No se pudo eliminar el registro.');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">Panel de Control de Administración</h1>
            </div>
        </div>

        {/* Pestañas de Navegación */}
        <nav className="admin-sections" aria-label="Secciones de administración">
          {[
            ['dashboard', 'Dashboard de gestión', LayoutDashboard],
            ['reportes', 'Reportes', History],
            ['auditoria', 'Historial de cambios', History],
            ['datos-prueba', 'Datos de prueba', FlaskConical],
            ['facial', 'Registro Facial', UserCheck],
            ['especialidades', 'Especialidades Médicas', Award],
            ['roles', 'Roles de Seguridad (RBAC)', Shield],
            ['usuarios', 'Cuentas de Usuarios', Users]
          ].map(([key, label, Icon]) => (
            <button type="button" key={key} className={`admin-section${activeTab === key ? ' is-active' : ''}`}
              onClick={() => setActiveTab(key)} aria-label={label} aria-pressed={activeTab === key}>
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
              {activeTab === key && <span className="admin-active-badge" aria-hidden="true" title="Sección activa">✓</span>}
            </button>
          ))}
        </nav>
        {activeTab === 'dashboard' && <div style={{ padding: '1.5rem', minWidth: 0 }}><DashboardView /></div>}
        {activeTab === 'reportes' && <ReportesView />}
        {activeTab === 'facial' && <RegistroFacialView />}
        {activeTab === 'datos-prueba' && <DatosPruebaView />}
        {activeTab === 'auditoria' && <AuditoriaView />}
        {/* Tab 1: Especialidades */}
        {activeTab === 'especialidades' && (
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--gray-800)' }}>Catálogo de Especialidades</h2>
              <button className="btn btn-primary" onClick={() => handleOpenEspModal()}>
                <Plus size={16} /> Nueva Especialidad
              </button>
            </div>

            {/* Filtros Especialidades */}
            <div className="filter-panel" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-700)' }}>
                <Filter size={15} /> Filtros de Especialidades (API)
              </div>
              <div className="filter-grid">
                <div>
                  <label htmlFor="adminconfig-field-0" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Nombre</label>
                  <input id="adminconfig-field-0"
                    type="text"
                    className="form-input"
                    placeholder="Filtrar por nombre..."
                    value={espFilters.nombre}
                    onChange={(e) => setEspFilters({ ...espFilters, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="adminconfig-field-1" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Costo Mínimo ($)</label>
                  <NumericInput id="adminconfig-field-1" allowDecimal
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={espFilters.costoMin}
                    onChange={(e) => setEspFilters({ ...espFilters, costoMin: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="adminconfig-field-2" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Costo Máximo ($)</label>
                  <NumericInput id="adminconfig-field-2" allowDecimal
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

            <div className="table-responsive" tabIndex={0} role="region" aria-label="Tabla de registros">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th scope="col">Nombre de Especialidad</th>
                    <th scope="col">Costo Base Consulta</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Acciones</th>
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
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--gray-800)' }}>Roles de Seguridad del Sistema</h2>
              <button className="btn btn-primary" onClick={() => handleOpenRolModal()}>
                <Plus size={16} /> Nuevo Rol
              </button>
            </div>

            {/* Filtros Roles */}
            <div className="filter-panel" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-700)' }}>
                <Filter size={15} /> Filtros de Roles (API)
              </div>
              <div className="filter-grid">
                <div>
                  <label htmlFor="adminconfig-field-3" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Nombre del Rol</label>
                  <input id="adminconfig-field-3"
                    type="text"
                    className="form-input"
                    placeholder="Filtrar rol..."
                    value={rolFilters.nombre}
                    onChange={(e) => setRolFilters({ ...rolFilters, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="adminconfig-field-4" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Permisos de Escritura</label>
                  <select id="adminconfig-field-4"
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

            <div className="table-responsive" tabIndex={0} role="region" aria-label="Tabla de registros">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th scope="col">Rol</th>
                    <th scope="col">Nivel de Acceso</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Acciones</th>
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
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--gray-800)' }}>Usuarios Registrados</h2>
              </div>
            </div>

            {/* Filtros Usuarios */}
            <UserCreateForm roles={roles} onCreated={fetchUsuarios} />
            <div className="filter-panel" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-700)' }}>
                <Filter size={15} /> Filtros de Usuarios (API)
              </div>
              <div className="filter-grid">
                <div>
                  <label htmlFor="adminconfig-field-5" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Nombre</label>
                  <input id="adminconfig-field-5"
                    type="text"
                    className="form-input"
                    placeholder="Filtrar por nombre..."
                    value={usuFilters.nombre}
                    onChange={(e) => setUsuFilters({ ...usuFilters, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="adminconfig-field-6" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Email</label>
                  <input id="adminconfig-field-6"
                    type="text"
                    className="form-input"
                    placeholder="Filtrar por email..."
                    value={usuFilters.email}
                    onChange={(e) => setUsuFilters({ ...usuFilters, email: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="adminconfig-field-7" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Rol</label>
                  <select id="adminconfig-field-7"
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

            <div className="table-responsive" tabIndex={0} role="region" aria-label="Tabla de registros">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th scope="col">Nombre Completo</th>
                    <th scope="col">Correo Electrónico</th>
                    <th scope="col">Rol Asignado</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Acciones</th>
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

      {/* Modal Especialidad (Estructura de Tarjetas Visuales) */}
      {modalType === 'esp' && (
        <AccessibleDialog className="modal-overlay" aria-label="Especialidad veterinaria" onClose={() => setModalType(null)}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '95%', background: 'transparent', border: 'none', boxShadow: 'none' }}>
            {/* Tarjeta Visual Cabecera Especialidad */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--gray-200)', borderRadius: '0.85rem', padding: '1.1rem 1.35rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: espForm.id ? 'var(--secondary-light)' : 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: espForm.id ? '#0284c7' : 'var(--success-text)', flexShrink: 0 }}>
                  <Award size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                    {espForm.id ? 'Editar Especialidad' : 'Nueva Especialidad Médica'}
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                    {espForm.id ? 'Modifique el costo base o nombre de la especialidad' : 'Registre una nueva especialidad para atención clínica'}
                  </span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setModalType(null)} aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <AccessibleForm onSubmit={handleSaveEsp} noValidate>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--gray-200)', borderRadius: '0.85rem', padding: '1.25rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                {formError && (
                  <div className="alert alert-danger" role="alert" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="esp-nombre" style={{ fontWeight: 600, color: 'var(--gray-800)' }}>Nombre de la Especialidad <RequiredIndicator /></label>
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
                    aria-invalid={!!fieldErrors.nombre} required aria-describedby={!!fieldErrors.nombre ? "esp-nombre-error" : undefined}
                  />
                  {fieldErrors.nombre && (
                    <span id="esp-nombre-error" role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                      {fieldErrors.nombre}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="esp-costo" style={{ fontWeight: 600, color: 'var(--gray-800)' }}>Costo Base ($) <RequiredIndicator /></label>
                  <NumericInput
                    id="esp-costo"
                    type="number"
                    step="0.01"
                    className={`form-input ${fieldErrors.costoBase ? 'border-red-500' : ''}`}
                    value={espForm.costoBase}
                    onChange={(e) => {
                      setEspForm({ ...espForm, costoBase: e.target.value });
                      if (fieldErrors.costoBase) setFieldErrors(prev => ({ ...prev, costoBase: null }));
                    }}
                    aria-invalid={!!fieldErrors.costoBase} required aria-describedby={!!fieldErrors.costoBase ? "esp-costo-error" : undefined}
                  />
                  {fieldErrors.costoBase && (
                    <span id="esp-costo-error" role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                      {fieldErrors.costoBase}
                    </span>
                  )}
                </div>
              </div>
              {/* Pie de Acciones (Tarjeta Visual) */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--gray-200)', borderRadius: '0.85rem', padding: '0.9rem 1.35rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancelar</button>
                <SubmitButton type="submit" className="btn btn-primary">Guardar</SubmitButton>
              </div>
            </AccessibleForm>
          </div>
        </AccessibleDialog>
      )}

      {/* Modal Rol (Estructura de Tarjetas Visuales) */}
      {modalType === 'rol' && (
        <AccessibleDialog className="modal-overlay" aria-label="Rol de seguridad" onClose={() => setModalType(null)}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '95%', background: 'transparent', border: 'none', boxShadow: 'none' }}>
            {/* Tarjeta Visual Cabecera Rol */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--gray-200)', borderRadius: '0.85rem', padding: '1.1rem 1.35rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: rolForm.id ? 'var(--secondary-light)' : 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: rolForm.id ? '#0284c7' : 'var(--success-text)', flexShrink: 0 }}>
                  <Shield size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                    {rolForm.id ? 'Editar Rol' : 'Nuevo Rol de Usuario'}
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                    {rolForm.id ? 'Configure los permisos asignados a este rol' : 'Defina un rol con permisos de acceso al sistema'}
                  </span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setModalType(null)} aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <AccessibleForm onSubmit={handleSaveRol} noValidate>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--gray-200)', borderRadius: '0.85rem', padding: '1.25rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                {formError && (
                  <div className="alert alert-danger" role="alert" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="rol-nombre" style={{ fontWeight: 600, color: 'var(--gray-800)' }}>Nombre del Rol <RequiredIndicator /></label>
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
                    aria-invalid={!!fieldErrors.nombre} required aria-describedby={!!fieldErrors.nombre ? "rol-nombre-error" : undefined}
                  />
                  {fieldErrors.nombre && (
                    <span id="rol-nombre-error" role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
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
                  <label htmlFor="permisosEscritura" style={{ fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600, color: 'var(--gray-800)' }}>
                    Permisos de Escritura y Modificación habilitados
                  </label>
                </div>
              </div>
              {/* Pie de Acciones (Tarjeta Visual) */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--gray-200)', borderRadius: '0.85rem', padding: '0.9rem 1.35rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancelar</button>
                <SubmitButton type="submit" className="btn btn-primary">Guardar</SubmitButton>
              </div>
            </AccessibleForm>
          </div>
        </AccessibleDialog>
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
