import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, Plus, Search, Edit2, Trash2, X, AlertCircle, Clock, Filter, RotateCcw } from 'lucide-react';

export const CitasView = () => {
  const { hasRole, isAdmin } = useAuth();
  const canCreateOrEdit = hasRole(['Administrador', 'Veterinario', 'Recepcionista']);
  const canDelete = isAdmin;

  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  // Filtros de API
  const [filters, setFilters] = useState({
    usuarioId: '',
    especialidadId: '',
    estado: '',
    fechaDesde: '',
    fechaHasta: ''
  });

  const [formData, setFormData] = useState({
    pacienteId: '',
    usuarioId: '',
    especialidadId: '',
    fechaHora: '',
    estado: 'Pendiente'
  });

  useEffect(() => {
    fetchCatalogos();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCitas();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const fetchCatalogos = async () => {
    try {
      const [pacRes, espRes, usuRes] = await Promise.allSettled([
        api.get('/api/v1/pacientes'),
        api.get('/api/v1/especialidades'),
        api.get('/api/v1/usuarios')
      ]);

      if (pacRes.status === 'fulfilled') setPacientes(pacRes.value.data || []);
      if (espRes.status === 'fulfilled') setEspecialidades(espRes.value.data || []);
      if (usuRes.status === 'fulfilled') setUsuarios(usuRes.value.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCitas = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.usuarioId) params.usuarioId = filters.usuarioId;
      if (filters.especialidadId) params.especialidadId = filters.especialidadId;
      if (filters.estado) params.estado = filters.estado;
      if (filters.fechaDesde) params.fechaDesde = new Date(filters.fechaDesde).toISOString();
      if (filters.fechaHasta) params.fechaHasta = new Date(filters.fechaHasta).toISOString();

      const res = await api.get('/api/v1/citas', { params });
      setCitas(res.data || []);
    } catch (err) {
      console.error(err);
      setError('Error al cargar datos de citas.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      usuarioId: '',
      especialidadId: '',
      estado: '',
      fechaDesde: '',
      fechaHasta: ''
    });
  };

  const handleOpenModal = (cita = null) => {
    setError('');
    if (cita) {
      setEditingId(cita.id);
      const formattedDate = cita.fechaHora ? new Date(cita.fechaHora).toISOString().slice(0, 16) : '';
      setFormData({
        pacienteId: cita.pacienteId,
        usuarioId: cita.usuarioId,
        especialidadId: cita.especialidadId,
        fechaHora: formattedDate,
        estado: cita.estado || 'Pendiente'
      });
    } else {
      setEditingId(null);
      setFormData({
        pacienteId: pacientes[0]?.id || '',
        usuarioId: usuarios[0]?.id || '',
        especialidadId: especialidades[0]?.id || '',
        fechaHora: new Date().toISOString().slice(0, 16),
        estado: 'Pendiente'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      pacienteId: Number(formData.pacienteId),
      usuarioId: Number(formData.usuarioId),
      especialidadId: Number(formData.especialidadId),
      fechaHora: new Date(formData.fechaHora).toISOString(),
      estado: formData.estado
    };

    try {
      if (editingId) {
        await api.put(`/api/v1/citas/${editingId}`, payload);
      } else {
        await api.post('/api/v1/citas', payload);
      }
      setIsModalOpen(false);
      fetchCitas();
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(Object.values(err.response.data.errors).flat().join(' '));
      } else {
        setError(err.response?.data?.message || 'Error al guardar la cita.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro de cancelar y eliminar esta cita?')) return;
    try {
      await api.delete(`/api/v1/citas/${id}`);
      fetchCitas();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar la cita.');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Calendar size={24} color="#8b5cf6" />
              Agenda y Control de Citas
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Filtros directos a `/api/v1/citas` por profesional, paciente, especialidad, fechas y estado
            </p>
          </div>
          {canCreateOrEdit && (
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={18} />
              Agendar Nueva Cita
            </button>
          )}
        </div>

        {/* Panel de Filtros para Endpoint */}
        <div className="filter-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>
            <Filter size={16} /> Filtros de Agenda (API)
          </div>
          <div className="filter-grid">
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Estado</label>
              <select
                className="form-select"
                value={filters.estado}
                onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
              >
                <option value="">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Confirmada">Confirmada</option>
                <option value="En Curso">En Curso</option>
                <option value="Completada">Completada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Especialidad</label>
              <select
                className="form-select"
                value={filters.especialidadId}
                onChange={(e) => setFilters({ ...filters, especialidadId: e.target.value })}
              >
                <option value="">Todas las especialidades</option>
                {especialidades.map(esp => (
                  <option key={esp.id} value={esp.id}>{esp.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Profesional / Médico</label>
              <select
                className="form-select"
                value={filters.usuarioId}
                onChange={(e) => setFilters({ ...filters, usuarioId: e.target.value })}
              >
                <option value="">Todos los profesionales</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombreCompleto}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Fecha Desde</label>
              <input
                type="date"
                className="form-input"
                value={filters.fechaDesde}
                onChange={(e) => setFilters({ ...filters, fechaDesde: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Fecha Hasta</label>
              <input
                type="date"
                className="form-input"
                value={filters.fechaHasta}
                onChange={(e) => setFilters({ ...filters, fechaHasta: e.target.value })}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
              <RotateCcw size={14} /> Restablecer Filtros
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando citas...</p>
        ) : citas.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            No hay citas agendadas con los criterios seleccionados.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Paciente</th>
                  <th>Especialidad</th>
                  <th>Veterinario / Médico</th>
                  <th>Fecha y Hora</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {citas.map((cita) => {
                  const paciente = pacientes.find(p => p.id === cita.pacienteId);
                  const especialidad = especialidades.find(e => e.id === cita.especialidadId);
                  const usuario = usuarios.find(u => u.id === cita.usuarioId);

                  return (
                    <tr key={cita.id}>
                      <td data-label="ID" style={{ fontWeight: 600 }}>#{cita.id}</td>
                      <td data-label="Paciente">
                        <strong>{paciente ? paciente.nombre : `Paciente #${cita.pacienteId}`}</strong>
                        {paciente && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{paciente.especie} - {paciente.raza}</div>}
                      </td>
                      <td data-label="Especialidad">
                        <span className="badge badge-primary">
                          {especialidad ? especialidad.nombre : `Especialidad #${cita.especialidadId}`}
                        </span>
                      </td>
                      <td data-label="Veterinario">{usuario ? usuario.nombreCompleto : `Dr. ID #${cita.usuarioId}`}</td>
                      <td data-label="Fecha y Hora">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#1e293b' }}>
                          <Clock size={15} color="#64748b" />
                          {new Date(cita.fechaHora).toLocaleString()}
                        </div>
                      </td>
                      <td data-label="Estado">
                        <span className={`badge ${
                          cita.estado?.toLowerCase() === 'completada' ? 'badge-success' :
                          cita.estado?.toLowerCase() === 'cancelada' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {cita.estado}
                        </span>
                      </td>
                      <td data-label="Acciones" style={{ textAlign: 'right' }}>
                        {canCreateOrEdit && (
                          <button className="btn-icon" onClick={() => handleOpenModal(cita)} title="Editar" aria-label="Editar cita">
                            <Edit2 size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button className="btn-icon danger" onClick={() => handleDelete(cita.id)} title="Eliminar" aria-label="Eliminar cita">
                            <Trash2 size={16} />
                          </button>
                        )}
                        {!canCreateOrEdit && !canDelete && (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Solo Lectura</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cita */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                {editingId ? 'Editar Cita' : 'Agendar Cita Médica'}
              </h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && (
                  <div className="alert alert-danger">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Paciente (Mascota)</label>
                  <select
                    className="form-select"
                    required
                    value={formData.pacienteId}
                    onChange={(e) => setFormData({ ...formData, pacienteId: e.target.value })}
                  >
                    <option value="">Seleccione el paciente...</option>
                    {pacientes.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.especie}) - #{p.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Especialidad Requerida</label>
                    <select
                      className="form-select"
                      required
                      value={formData.especialidadId}
                      onChange={(e) => setFormData({ ...formData, especialidadId: e.target.value })}
                    >
                      <option value="">Seleccione especialidad...</option>
                      {especialidades.map(esp => (
                        <option key={esp.id} value={esp.id}>
                          {esp.nombre} (${Number(esp.costoBase).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Veterinario / Profesional</label>
                    <select
                      className="form-select"
                      required
                      value={formData.usuarioId}
                      onChange={(e) => setFormData({ ...formData, usuarioId: e.target.value })}
                    >
                      <option value="">Seleccione profesional...</option>
                      {usuarios.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nombreCompleto} ({u.rol || 'Staff'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Fecha y Hora</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      required
                      value={formData.fechaHora}
                      onChange={(e) => setFormData({ ...formData, fechaHora: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Estado de la Cita</label>
                    <select
                      className="form-select"
                      required
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="Confirmada">Confirmada</option>
                      <option value="En Curso">En Curso</option>
                      <option value="Completada">Completada</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Actualizar Cita' : 'Confirmar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
