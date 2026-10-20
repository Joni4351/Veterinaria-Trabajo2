import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { citaSchema } from '../schemas/citasSchema';
import { ConfirmModal } from '../components/ConfirmModal';
import { Calendar, Plus, Search, Edit2, Trash2, X, AlertCircle, Clock, Filter, RotateCcw } from 'lucide-react';

export const CitasView = () => {
  const { hasRole, isAdmin } = useAuth();
  const canCreateOrEdit = hasRole(['Administrador', 'Veterinario', 'Recepcionista']);
  const canDelete = isAdmin;

  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  // Filtrar estrictamente solo usuarios con rol de Veterinario para atención clínica
  const veterinarios = useMemo(() => {
    return usuarios.filter(u => (u.rol || '').toLowerCase().includes('veterinario'));
  }, [usuarios]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [searchDueno, setSearchDueno] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    id: null,
    nombre: '',
    loading: false
  });

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
      const [pacRes, espRes, usuRes, cliRes] = await Promise.allSettled([
        api.get('/api/v1/pacientes'),
        api.get('/api/v1/especialidades'),
        api.get('/api/v1/usuarios'),
        api.get('/api/v1/clientes')
      ]);

      if (pacRes.status === 'fulfilled') setPacientes(pacRes.value.data || []);
      if (espRes.status === 'fulfilled') setEspecialidades(espRes.value.data || []);
      if (usuRes.status === 'fulfilled') setUsuarios(usuRes.value.data || []);
      if (cliRes.status === 'fulfilled') setClientes(cliRes.value.data || []);
    } catch (err) {
      console.error('Error al cargar catálogos asociados a citas:', err);
    }
  };

  const fetchCitas = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.usuarioId) params.usuarioId = filters.usuarioId;
      if (filters.especialidadId) params.especialidadId = filters.especialidadId;
      if (filters.estado) params.estado = filters.estado;
      if (filters.fechaDesde) params.fechaDesde = filters.fechaDesde;
      if (filters.fechaHasta) params.fechaHasta = filters.fechaHasta;

      const res = await api.get('/api/v1/citas', { params });
      setCitas(res.data || []);
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor para obtener las citas.');
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
    setSearchDueno('');
  };

  const handleOpenModal = (cita = null) => {
    setError('');
    setFieldErrors({});
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
        usuarioId: veterinarios[0]?.id || '',
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
    setFieldErrors({});

    // Validación Zod
    const result = citaSchema.safeParse(formData);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      setError('Por favor corrija los campos marcados en el formulario.');
      return;
    }

    const payload = {
      pacienteId: Number(result.data.pacienteId),
      usuarioId: Number(result.data.usuarioId),
      especialidadId: Number(result.data.especialidadId),
      fechaHora: new Date(result.data.fechaHora).toISOString(),
      estado: result.data.estado
    };

    setSubmitting(true);
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
        setFieldErrors(err.response.data.errors);
        setError(Object.values(err.response.data.errors).flat().join(' '));
      } else {
        setError(err.response?.data?.message || 'Error al guardar la cita en el servidor.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestDelete = (cita) => {
    setDeleteConfirm({
      isOpen: true,
      id: cita.id,
      nombre: `Cita de ${cita.paciente?.nombre || 'Paciente'} (${cita.estado})`,
      loading: false
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleteConfirm((prev) => ({ ...prev, loading: true }));
    try {
      await api.delete(`/api/v1/citas/${deleteConfirm.id}`);
      setDeleteConfirm({ isOpen: false, id: null, nombre: '', loading: false });
      fetchCitas();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar la cita.');
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
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

        {/* Panel de Filtros */}
        <div className="filter-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>
            <Filter size={16} /> Filtros de Agenda (API)
          </div>
          <div className="filter-grid">
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Profesional / Vet</label>
              <select
                className="form-select"
                value={filters.usuarioId}
                onChange={(e) => setFilters({ ...filters, usuarioId: e.target.value })}
              >
                <option value="">Todos los profesionales</option>
                {veterinarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombreCompleto}</option>
                ))}
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
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Dueño (Buscar por RUT o Nombre)</label>
              <input
                type="text"
                className="form-input"
                placeholder="RUT o Nombre del dueño..."
                value={searchDueno}
                onChange={(e) => setSearchDueno(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Desde Fecha</label>
              <input
                type="date"
                className="form-input"
                value={filters.fechaDesde}
                onChange={(e) => setFilters({ ...filters, fechaDesde: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleResetFilters}>
                <RotateCcw size={15} /> Limpiar
              </button>
            </div>
          </div>
        </div>

        {(() => {
          const displayedCitas = citas.filter((c) => {
            if (!searchDueno) return true;
            const term = searchDueno.toLowerCase();
            const cliente = c.paciente?.cliente || clientes.find(cl => cl.id === c.paciente?.clienteId);
            const clienteNombre = cliente?.nombreCompleto?.toLowerCase() || '';
            const clienteRut = cliente?.documentoIdentidad?.toLowerCase() || '';
            const pacienteNombre = c.paciente?.nombre?.toLowerCase() || '';
            return clienteNombre.includes(term) || clienteRut.includes(term) || pacienteNombre.includes(term);
          });

          if (loading) {
            return <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando agenda de citas...</p>;
          }
          if (displayedCitas.length === 0) {
            return (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                No se encontraron citas médicas registradas con los filtros aplicados.
              </p>
            );
          }
          return (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Dueño / Cliente</th>
                    <th>Especialidad</th>
                    <th>Profesional</th>
                    <th>Fecha y Hora</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedCitas.map((c) => (
                    <tr key={c.id}>
                      <td data-label="Paciente">
                        <strong style={{ color: '#0f172a' }}>{c.paciente?.nombre || 'Paciente'}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.paciente?.especie} ({c.paciente?.raza || 'Mestizo'})</div>
                      </td>
                      <td data-label="Dueño / Cliente">
                        {(() => {
                          const cliente = c.paciente?.cliente || clientes.find(cl => cl.id === c.paciente?.clienteId);
                          return cliente ? (
                            <div>
                              <strong style={{ color: '#0f172a' }}>{cliente.nombreCompleto}</strong>
                              <div style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 600 }}>RUT: {cliente.documentoIdentidad}</div>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          );
                        })()}
                      </td>
                      <td data-label="Especialidad">
                        <span className="badge badge-secondary">{c.especialidad?.nombre || 'General'}</span>
                      </td>
                      <td data-label="Profesional">{c.usuario?.nombreCompleto || 'Dr. Asignado'}</td>
                      <td data-label="Fecha y Hora">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#334155', fontWeight: 500 }}>
                          <Clock size={14} color="#64748b" />
                          {new Date(c.fechaHora).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </td>
                      <td data-label="Estado">
                        <span className={`badge ${
                          c.estado === 'Confirmada' ? 'badge-success' : 
                          c.estado === 'Completada' ? 'badge-info' : 
                          c.estado === 'Cancelada' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {c.estado}
                        </span>
                      </td>
                      <td data-label="Acciones" style={{ textAlign: 'right' }}>
                        {canCreateOrEdit ? (
                          <>
                            <button className="btn-icon" onClick={() => handleOpenModal(c)} title="Editar" aria-label="Editar cita médica">
                              <Edit2 size={16} />
                            </button>
                            {canDelete && (
                              <button className="btn-icon danger" onClick={() => handleRequestDelete(c)} title="Eliminar" aria-label="Eliminar cita médica">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Solo Lectura</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Modal Citas */}
      {isModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-cita-title">
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="modal-cita-title" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                {editingId ? 'Editar Cita Médica' : 'Agendar Nueva Cita'}
              </h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)} aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body">
                {error && (
                  <div className="alert alert-danger" role="alert">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="cita-paciente" className="form-label">
                    Paciente (Mascota) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    id="cita-paciente"
                    className={`form-select ${fieldErrors.pacienteId ? 'border-danger' : ''}`}
                    value={formData.pacienteId}
                    onChange={(e) => {
                      setFormData({ ...formData, pacienteId: e.target.value });
                      if (fieldErrors.pacienteId) setFieldErrors({ ...fieldErrors, pacienteId: null });
                    }}
                    aria-invalid={!!fieldErrors.pacienteId}
                    aria-describedby={fieldErrors.pacienteId ? 'error-pacienteId' : undefined}
                  >
                    <option value="">Seleccione mascota...</option>
                    {pacientes.map(p => {
                      const cliente = p.cliente || clientes.find(cl => cl.id === p.clienteId);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.especie}) — Dueño: {cliente?.nombreCompleto || 'Sin dueño'} (RUT: {cliente?.documentoIdentidad || '—'})
                        </option>
                      );
                    })}
                  </select>
                  {fieldErrors.pacienteId && (
                    <span id="error-pacienteId" className="form-error" role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                      {Array.isArray(fieldErrors.pacienteId) ? fieldErrors.pacienteId[0] : fieldErrors.pacienteId}
                    </span>
                  )}
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="cita-especialidad" className="form-label">
                      Especialidad Clínica <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      id="cita-especialidad"
                      className={`form-select ${fieldErrors.especialidadId ? 'border-danger' : ''}`}
                      value={formData.especialidadId}
                      onChange={(e) => {
                        setFormData({ ...formData, especialidadId: e.target.value });
                        if (fieldErrors.especialidadId) setFieldErrors({ ...fieldErrors, especialidadId: null });
                      }}
                      aria-invalid={!!fieldErrors.especialidadId}
                      aria-describedby={fieldErrors.especialidadId ? 'error-especialidadId' : undefined}
                    >
                      <option value="">Seleccione especialidad...</option>
                      {especialidades.map(esp => (
                        <option key={esp.id} value={esp.id}>
                          {esp.nombre} (${Number(esp.costoBase).toLocaleString('es-CL')})
                        </option>
                      ))}
                    </select>
                    {fieldErrors.especialidadId && (
                      <span id="error-especialidadId" className="form-error" role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                        {Array.isArray(fieldErrors.especialidadId) ? fieldErrors.especialidadId[0] : fieldErrors.especialidadId}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="cita-usuario" className="form-label">
                      Veterinario / Profesional <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      id="cita-usuario"
                      className={`form-select ${fieldErrors.usuarioId ? 'border-danger' : ''}`}
                      value={formData.usuarioId}
                      onChange={(e) => {
                        setFormData({ ...formData, usuarioId: e.target.value });
                        if (fieldErrors.usuarioId) setFieldErrors({ ...fieldErrors, usuarioId: null });
                      }}
                      aria-invalid={!!fieldErrors.usuarioId}
                      aria-describedby={fieldErrors.usuarioId ? 'error-usuarioId' : undefined}
                    >
                      <option value="">Seleccione veterinario...</option>
                      {veterinarios.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nombreCompleto} ({u.rol || 'Veterinario'})
                        </option>
                      ))}
                    </select>
                    {fieldErrors.usuarioId && (
                      <span id="error-usuarioId" className="form-error" role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                        {Array.isArray(fieldErrors.usuarioId) ? fieldErrors.usuarioId[0] : fieldErrors.usuarioId}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="cita-fechaHora" className="form-label">
                      Fecha y Hora <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      id="cita-fechaHora"
                      type="datetime-local"
                      className={`form-input ${fieldErrors.fechaHora ? 'border-danger' : ''}`}
                      value={formData.fechaHora}
                      onChange={(e) => {
                        setFormData({ ...formData, fechaHora: e.target.value });
                        if (fieldErrors.fechaHora) setFieldErrors({ ...fieldErrors, fechaHora: null });
                      }}
                      aria-invalid={!!fieldErrors.fechaHora}
                      aria-describedby={fieldErrors.fechaHora ? 'error-fechaHora' : undefined}
                    />
                    {fieldErrors.fechaHora && (
                      <span id="error-fechaHora" className="form-error" role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                        {Array.isArray(fieldErrors.fechaHora) ? fieldErrors.fechaHora[0] : fieldErrors.fechaHora}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="cita-estado" className="form-label">
                      Estado de la Cita <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      id="cita-estado"
                      className="form-select"
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
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : (editingId ? 'Actualizar Cita' : 'Confirmar Cita')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ConfirmModal para eliminar citas */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Cancelar y Eliminar Cita"
        message={`¿Estás seguro de que deseas cancelar y eliminar permanentemente la "${deleteConfirm.nombre}"?`}
        confirmText="Eliminar Cita"
        cancelText="Volver"
        isDangerous={true}
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, nombre: '', loading: false })}
      />
    </div>
  );
};
