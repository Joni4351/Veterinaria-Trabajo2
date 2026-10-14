import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Award, Shield, UserCheck, Plus, Trash2, Edit2, X, AlertCircle, Filter, RotateCcw } from 'lucide-react';

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

  const handleSaveEsp = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: espForm.nombre,
        costoBase: parseFloat(espForm.costoBase) || 0
      };
      if (espForm.id) {
        await api.put(`/api/v1/especialidades/${espForm.id}`, payload);
      } else {
        await api.post('/api/v1/especialidades', payload);
      }
      setModalType(null);
      fetchEspecialidades();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar especialidad');
    }
  };

  const handleDeleteEsp = async (id) => {
    if (!window.confirm('¿Eliminar esta especialidad?')) return;
    try {
      await api.delete(`/api/v1/especialidades/${id}`);
      fetchEspecialidades();
    } catch (err) {
      alert('Error al eliminar especialidad');
    }
  };

  const handleSaveRol = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: rolForm.nombre,
        permisosEscritura: Boolean(rolForm.permisosEscritura)
      };
      if (rolForm.id) {
        await api.put(`/api/v1/roles/${rolForm.id}`, payload);
      } else {
        await api.post('/api/v1/roles', payload);
      }
      setModalType(null);
      fetchRoles();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar rol');
    }
  };

  const handleDeleteRol = async (id) => {
    if (!window.confirm('¿Eliminar este rol?')) return;
    try {
      await api.delete(`/api/v1/roles/${id}`);
      fetchRoles();
    } catch (err) {
      alert('Error al eliminar rol');
    }
  };

  const handleDeleteUsuario = async (id) => {
    if (!window.confirm('¿Eliminar este usuario del sistema?')) return;
    try {
      await api.delete(`/api/v1/usuarios/${id}`);
      fetchUsuarios();
    } catch (err) {
      alert('Error al eliminar usuario');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Shield size={24} color="#6366f1" />
              Configuración y Administración del Sistema
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Gestión y filtros para `/api/v1/especialidades`, `/api/v1/roles` y `/api/v1/usuarios`
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
          <button
            className={`btn ${activeTab === 'especialidades' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px 8px 0 0', flex: '1 1 auto' }}
            onClick={() => setActiveTab('especialidades')}
          >
            <Award size={16} /> Especialidades Médicas
          </button>
          <button
            className={`btn ${activeTab === 'roles' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px 8px 0 0', flex: '1 1 auto' }}
            onClick={() => setActiveTab('roles')}
          >
            <Shield size={16} /> Roles & Permisos
          </button>
          <button
            className={`btn ${activeTab === 'usuarios' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px 8px 0 0', flex: '1 1 auto' }}
            onClick={() => setActiveTab('usuarios')}
          >
            <UserCheck size={16} /> Usuarios del Sistema
          </button>
        </div>

        {/* TAB 1: ESPECIALIDADES */}
        {activeTab === 'especialidades' && (
          <div>
            <div className="filter-panel">
              <div className="filter-grid">
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Especialidad</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Filtrar por especialidad..."
                    value={espFilters.nombre}
                    onChange={(e) => setEspFilters({ ...espFilters, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Costo Mínimo</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Costo Min..."
                    value={espFilters.costoMin}
                    onChange={(e) => setEspFilters({ ...espFilters, costoMin: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Costo Máximo</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Costo Max..."
                    value={espFilters.costoMax}
                    onChange={(e) => setEspFilters({ ...espFilters, costoMax: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setEspFilters({ nombre: '', costoMin: '', costoMax: '' })}>
                    <RotateCcw size={14} /> Limpiar
                  </button>
                  <button 
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, whiteSpace: 'nowrap' }}
                    onClick={() => {
                      setEspForm({ id: null, nombre: '', costoBase: 0 });
                      setModalType('esp');
                    }}
                  >
                    <Plus size={16} /> Nueva
                  </button>
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre de la Especialidad</th>
                    <th>Costo Base de Consulta</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {especialidades.map(esp => (
                    <tr key={esp.id}>
                      <td data-label="ID" style={{ fontWeight: 600 }}>#{esp.id}</td>
                      <td data-label="Nombre de la Especialidad"><strong>{esp.nombre}</strong></td>
                      <td data-label="Costo Base">${Number(esp.costoBase).toFixed(2)}</td>
                      <td data-label="Acciones" style={{ textAlign: 'right' }}>
                        <button 
                          className="btn-icon"
                          onClick={() => {
                            setEspForm({ id: esp.id, nombre: esp.nombre, costoBase: esp.costoBase });
                            setModalType('esp');
                          }}
                          title="Editar especialidad"
                          aria-label="Editar especialidad"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-icon danger" onClick={() => handleDeleteEsp(esp.id)} title="Eliminar especialidad" aria-label="Eliminar especialidad">
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

        {/* TAB 2: ROLES */}
        {activeTab === 'roles' && (
          <div>
            <div className="filter-panel">
              <div className="filter-grid">
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Nombre del Rol</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Filtrar por rol..."
                    value={rolFilters.nombre}
                    onChange={(e) => setRolFilters({ ...rolFilters, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Permisos</label>
                  <select
                    className="form-select"
                    value={rolFilters.permisosEscritura}
                    onChange={(e) => setRolFilters({ ...rolFilters, permisosEscritura: e.target.value })}
                  >
                    <option value="">Todos los permisos</option>
                    <option value="true">Con Escritura</option>
                    <option value="false">Solo Lectura</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setRolFilters({ nombre: '', permisosEscritura: '' })}>
                    <RotateCcw size={14} /> Limpiar
                  </button>
                  <button 
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, whiteSpace: 'nowrap' }}
                    onClick={() => {
                      setRolForm({ id: null, nombre: '', permisosEscritura: true });
                      setModalType('rol');
                    }}
                  >
                    <Plus size={16} /> Nuevo
                  </button>
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre del Rol</th>
                    <th>Permisos de Escritura</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map(r => (
                    <tr key={r.id}>
                      <td data-label="ID" style={{ fontWeight: 600 }}>#{r.id}</td>
                      <td data-label="Nombre del Rol"><strong>{r.nombre}</strong></td>
                      <td data-label="Permisos de Escritura">
                        <span className={`badge ${r.permisosEscritura ? 'badge-success' : 'badge-secondary'}`}>
                          {r.permisosEscritura ? 'Escritura & Lectura' : 'Solo Lectura'}
                        </span>
                      </td>
                      <td data-label="Acciones" style={{ textAlign: 'right' }}>
                        <button 
                          className="btn-icon"
                          onClick={() => {
                            setRolForm({ id: r.id, nombre: r.nombre, permisosEscritura: r.permisosEscritura });
                            setModalType('rol');
                          }}
                          title="Editar rol"
                          aria-label="Editar rol"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-icon danger" onClick={() => handleDeleteRol(r.id)} title="Eliminar rol" aria-label="Eliminar rol">
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

        {/* TAB 3: USUARIOS */}
        {activeTab === 'usuarios' && (
          <div>
            <div className="filter-panel">
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
                    <th>ID</th>
                    <th>Nombre Completo</th>
                    <th>Correo Electrónico</th>
                    <th>Rol Asignado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id}>
                      <td data-label="ID" style={{ fontWeight: 600 }}>#{u.id}</td>
                      <td data-label="Nombre Completo"><strong>{u.nombreCompleto}</strong></td>
                      <td data-label="Correo Electrónico">{u.email}</td>
                      <td data-label="Rol Asignado">
                        <span className="badge badge-primary">{u.rol || 'Usuario'}</span>
                      </td>
                      <td data-label="Acciones" style={{ textAlign: 'right' }}>
                        <button className="btn-icon danger" onClick={() => handleDeleteUsuario(u.id)} title="Eliminar usuario" aria-label="Eliminar usuario">
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
            <form onSubmit={handleSaveEsp}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre de la Especialidad</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="Ej. Cirugía, Dermatología, Traumatología"
                    value={espForm.nombre}
                    onChange={(e) => setEspForm({ ...espForm, nombre: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Costo Base ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    required
                    value={espForm.costoBase}
                    onChange={(e) => setEspForm({ ...espForm, costoBase: e.target.value })}
                  />
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
            <form onSubmit={handleSaveRol}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre del Rol</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="Ej. Veterinario, Auxiliar"
                    value={rolForm.nombre}
                    onChange={(e) => setRolForm({ ...rolForm, nombre: e.target.value })}
                  />
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
    </div>
  );
};
