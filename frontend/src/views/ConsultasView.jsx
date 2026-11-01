import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, Plus, Edit2, Trash2, X, AlertCircle, CheckCircle2, Pill, Filter, RotateCcw } from 'lucide-react';
import { consultaSchema, recetaMedicaSchema } from '../schemas/consultaSchema';
import { ConfirmModal } from '../components/ConfirmModal';

export const ConsultasView = () => {
  const { hasRole, isAdmin } = useAuth();
  const canCreateOrEdit = hasRole(['Administrador', 'Veterinario']);
  const canDelete = isAdmin;

  const [consultas, setConsultas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [citas, setCitas] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [searchDueno, setSearchDueno] = useState('');

  // Filtros de API
  const [filters, setFilters] = useState({
    pacienteId: '',
    motivo: '',
    diagnostico: ''
  });

  // Sub-modal Receta
  const [isRecetaModalOpen, setIsRecetaModalOpen] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState(null);
  const [existingReceta, setExistingReceta] = useState(null);
  const [existingDetalle, setExistingDetalle] = useState(null);
  const [recetasMap, setRecetasMap] = useState({});
  const [recetaLoading, setRecetaLoading] = useState(false);
  const [recetaSuccess, setRecetaSuccess] = useState('');
  const [recetaError, setRecetaError] = useState('');
  const [recetaFieldErrors, setRecetaFieldErrors] = useState({});
  const [recetaForm, setRecetaForm] = useState({
    fechaEmision: new Date().toISOString().slice(0, 10),
    validaHasta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    insumoId: '',
    dosis: '',
    duracionDias: 7
  });

  // Modal Confirmación Borrado
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });

  const [formData, setFormData] = useState({
    pacienteId: '',
    citaId: '',
    motivo: '',
    diagnostico: ''
  });

  useEffect(() => {
    fetchCatalogos();
    fetchRecetas();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConsultas();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const fetchCatalogos = async () => {
    try {
      const [pacRes, citRes, insRes, cliRes] = await Promise.allSettled([
        api.get('/api/v1/pacientes'),
        api.get('/api/v1/citas'),
        api.get('/api/v1/insumos'),
        api.get('/api/v1/clientes')
      ]);

      if (pacRes.status === 'fulfilled') setPacientes(pacRes.value.data || []);
      if (citRes.status === 'fulfilled') setCitas(citRes.value.data || []);
      if (insRes.status === 'fulfilled') setInsumos(insRes.value.data || []);
      if (cliRes.status === 'fulfilled') setClientes(cliRes.value.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecetas = async () => {
    try {
      const res = await api.get('/api/v1/recetas');
      const list = res.data || [];
      const map = {};
      list.forEach((r) => {
        map[r.consultaId] = r;
      });
      setRecetasMap(map);
    } catch (err) {
      console.error('Error cargando recetas:', err);
    }
  };

  const fetchConsultas = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.pacienteId) params.pacienteId = filters.pacienteId;
      if (filters.motivo) params.motivo = filters.motivo;
      if (filters.diagnostico) params.diagnostico = filters.diagnostico;

      const res = await api.get('/api/v1/consultas', { params });
      setConsultas(res.data || []);
      fetchRecetas();
    } catch (err) {
      console.error('Error cargando consultas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      pacienteId: '',
      motivo: '',
      diagnostico: ''
    });
    setSearchDueno('');
  };

  const handleOpenModal = (consulta = null) => {
    setError('');
    setFieldErrors({});
    if (consulta) {
      setEditingId(consulta.id);
      setFormData({
        pacienteId: String(consulta.pacienteId),
        citaId: consulta.citaId ? String(consulta.citaId) : '',
        motivo: consulta.motivo,
        diagnostico: consulta.diagnostico || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        pacienteId: pacientes[0]?.id ? String(pacientes[0].id) : '',
        citaId: '',
        motivo: '',
        diagnostico: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const validation = consultaSchema.safeParse(formData);
    if (!validation.success) {
      const errors = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0]] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    const payload = {
      pacienteId: validation.data.pacienteId,
      citaId: validation.data.citaId || null,
      motivo: validation.data.motivo,
      diagnostico: validation.data.diagnostico
    };

    try {
      if (editingId) {
        await api.put(`/api/v1/consultas/${editingId}`, payload);
      } else {
        await api.post('/api/v1/consultas', payload);
      }
      setIsModalOpen(false);
      fetchConsultas();
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(Object.values(err.response.data.errors).flat().join(' '));
      } else {
        setError(err.response?.data?.message || 'Error al guardar la consulta.');
      }
    }
  };

  const handleRequestDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id, loading: false });
  };

  const handleConfirmDelete = async () => {
    setDeleteConfirm(prev => ({ ...prev, loading: true }));
    try {
      await api.delete(`/api/v1/consultas/${deleteConfirm.id}`);
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
      fetchConsultas();
    } catch (err) {
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
      alert(err.response?.data?.message || 'No se pudo eliminar la consulta.');
    }
  };

  const handleOpenReceta = async (consulta) => {
    setSelectedConsulta(consulta);
    setRecetaError('');
    setRecetaSuccess('');
    setRecetaFieldErrors({});
    setRecetaLoading(true);
    setIsRecetaModalOpen(true);

    try {
      const res = await api.get('/api/v1/recetas', { params: { consultaId: consulta.id } });
      const listaRecetas = res.data || [];
      if (listaRecetas.length > 0) {
        const rec = listaRecetas[0];
        setExistingReceta(rec);

        try {
          const detRes = await api.get('/api/v1/detallesRe', { params: { recetaId: rec.id } });
          const detalles = detRes.data || [];
          if (detalles.length > 0) {
            const det = detalles[0];
            setExistingDetalle(det);
            setRecetaForm({
              fechaEmision: rec.fechaEmision,
              validaHasta: rec.validaHasta,
              insumoId: String(det.insumoId),
              dosis: det.dosis || '',
              duracionDias: det.duracionDias || 7
            });
          } else {
            setExistingDetalle(null);
            setRecetaForm({
              fechaEmision: rec.fechaEmision,
              validaHasta: rec.validaHasta,
              insumoId: insumos[0]?.id ? String(insumos[0].id) : '',
              dosis: '',
              duracionDias: 7
            });
          }
        } catch (errDet) {
          console.error('Error cargando detalles de la receta:', errDet);
          setExistingDetalle(null);
          setRecetaForm({
            fechaEmision: rec.fechaEmision,
            validaHasta: rec.validaHasta,
            insumoId: insumos[0]?.id ? String(insumos[0].id) : '',
            dosis: '',
            duracionDias: 7
          });
        }
      } else {
        setExistingReceta(null);
        setExistingDetalle(null);
        setRecetaForm({
          fechaEmision: new Date().toISOString().slice(0, 10),
          validaHasta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          insumoId: insumos[0]?.id ? String(insumos[0].id) : '',
          dosis: '1 comprimido cada 12 horas con alimento',
          duracionDias: 7
        });
      }
    } catch (err) {
      console.error('Error verificando receta existente:', err);
      setExistingReceta(null);
      setExistingDetalle(null);
      setRecetaForm({
        fechaEmision: new Date().toISOString().slice(0, 10),
        validaHasta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        insumoId: insumos[0]?.id ? String(insumos[0].id) : '',
        dosis: '1 comprimido cada 12 horas con alimento',
        duracionDias: 7
      });
    } finally {
      setRecetaLoading(false);
    }
  };

  const handleSaveReceta = async (e) => {
    e.preventDefault();
    setRecetaError('');
    setRecetaSuccess('');
    setRecetaFieldErrors({});

    const validation = recetaMedicaSchema.safeParse(recetaForm);
    if (!validation.success) {
      const errors = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0]] = err.message;
      });
      setRecetaFieldErrors(errors);
      return;
    }

    setRecetaLoading(true);
    try {
      if (existingReceta) {
        // Actualizar receta existente
        await api.put(`/api/v1/recetas/${existingReceta.id}`, {
          consultaId: selectedConsulta.id,
          fechaEmision: validation.data.fechaEmision,
          validaHasta: validation.data.validaHasta
        });

        // Actualizar o crear detalle
        if (existingDetalle) {
          await api.put(`/api/v1/detallesRe/${existingDetalle.id}`, {
            recetaId: existingReceta.id,
            insumoId: validation.data.insumoId,
            dosis: validation.data.dosis,
            duracionDias: validation.data.duracionDias
          });
        } else if (validation.data.insumoId) {
          await api.post('/api/v1/detallesRe', {
            recetaId: existingReceta.id,
            insumoId: validation.data.insumoId,
            dosis: validation.data.dosis,
            duracionDias: validation.data.duracionDias
          });
        }

        setRecetaSuccess('Receta médica actualizada exitosamente.');
      } else {
        // Crear nueva receta
        const recetaRes = await api.post('/api/v1/recetas', {
          consultaId: selectedConsulta.id,
          fechaEmision: validation.data.fechaEmision,
          validaHasta: validation.data.validaHasta
        });

        const recetaId = recetaRes.data?.id;

        if (recetaId && validation.data.insumoId) {
          await api.post('/api/v1/detallesRe', {
            recetaId: recetaId,
            insumoId: validation.data.insumoId,
            dosis: validation.data.dosis,
            duracionDias: validation.data.duracionDias
          });
        }

        setRecetaSuccess('Receta médica emitida exitosamente.');
      }

      await fetchRecetas();
      setTimeout(() => {
        setIsRecetaModalOpen(false);
      }, 1000);
    } catch (err) {
      if (err.response?.data?.errors) {
        setRecetaError(Object.values(err.response.data.errors).flat().join(' '));
      } else {
        setRecetaError(err.response?.data?.message || 'Error al procesar la receta médica.');
      }
    } finally {
      setRecetaLoading(false);
    }
  };

  const handleDeleteReceta = async () => {
    if (!existingReceta) return;
    if (!window.confirm('¿Está seguro de que desea eliminar la receta médica vinculada a esta consulta? Esta acción no se puede deshacer.')) {
      return;
    }

    setRecetaLoading(true);
    setRecetaError('');
    setRecetaSuccess('');

    try {
      await api.delete(`/api/v1/recetas/${existingReceta.id}`);
      setRecetaSuccess('Receta médica eliminada exitosamente.');
      setExistingReceta(null);
      setExistingDetalle(null);
      await fetchRecetas();
      setTimeout(() => {
        setIsRecetaModalOpen(false);
      }, 900);
    } catch (err) {
      setRecetaError(err.response?.data?.message || 'Error al eliminar la receta médica.');
    } finally {
      setRecetaLoading(false);
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Stethoscope size={24} color="#10b981" />
              Historial de Consultas Médicas y Diagnósticos
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Filtros directos a `/api/v1/consultas` por paciente, cita, motivo clínico o diagnóstico
            </p>
          </div>
          {canCreateOrEdit && (
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={18} />
              Nueva Consulta
            </button>
          )}
        </div>

        {/* Panel de Filtros para Endpoint */}
        <div className="filter-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>
            <Filter size={16} /> Filtros de Consultas (API)
          </div>
          <div className="filter-grid">
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Paciente</label>
              <select
                className="form-select"
                value={filters.pacienteId}
                onChange={(e) => setFilters({ ...filters, pacienteId: e.target.value })}
              >
                <option value="">Todos los pacientes</option>
                {pacientes.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} ({p.especie})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Buscar por Motivo</label>
              <input
                type="text"
                className="form-input"
                placeholder="Filtro exacto o parcial..."
                value={filters.motivo}
                onChange={(e) => setFilters({ ...filters, motivo: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Buscar por Diagnóstico</label>
              <input
                type="text"
                className="form-input"
                placeholder="Palabra clínica clave..."
                value={filters.diagnostico}
                onChange={(e) => setFilters({ ...filters, diagnostico: e.target.value })}
              />
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
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
              <RotateCcw size={14} /> Limpiar Filtros
            </button>
          </div>
        </div>

        {(() => {
          const displayedConsultas = consultas.filter((c) => {
            if (!searchDueno) return true;
            const term = searchDueno.toLowerCase();
            const pac = c.paciente || pacientes.find(p => p.id === c.pacienteId);
            const cli = pac?.cliente || clientes.find(cl => cl.id === pac?.clienteId);
            const clienteNombre = cli?.nombreCompleto?.toLowerCase() || '';
            const clienteRut = cli?.documentoIdentidad?.toLowerCase() || '';
            const pacNombre = pac?.nombre?.toLowerCase() || '';
            return clienteNombre.includes(term) || clienteRut.includes(term) || pacNombre.includes(term);
          });

          if (loading) {
            return (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                Cargando consultas...
              </div>
            );
          }
          if (displayedConsultas.length === 0) {
            return (
              <p style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                No hay consultas registradas con los filtros indicados.
              </p>
            );
          }
          return (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Dueño / RUT</th>
                    <th>Atención / Cita</th>
                    <th>Motivo de Consulta</th>
                    <th>Diagnóstico</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedConsultas.map((c) => {
                    const paciente = c.paciente || pacientes.find(p => p.id === c.pacienteId);
                    const cliente = paciente?.cliente || clientes.find(cl => cl.id === paciente?.clienteId);
                    return (
                      <tr key={c.id}>
                        <td data-label="Paciente">
                          <strong>{paciente ? paciente.nombre : 'Paciente'}</strong>
                          {paciente && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{paciente.especie} ({paciente.raza || 'Mestizo'})</div>}
                        </td>
                        <td data-label="Dueño / RUT">
                          {cliente ? (
                            <div>
                              <strong style={{ color: '#0f172a' }}>{cliente.nombreCompleto}</strong>
                              <div style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 600 }}>RUT: {cliente.documentoIdentidad}</div>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td data-label="Atención / Cita">
                          {c.citaId ? (
                            <span className="badge badge-secondary">Cita Programada</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Atención Espontánea</span>
                          )}
                        </td>
                        <td data-label="Motivo">
                          <span style={{ fontWeight: 500 }}>{c.motivo}</span>
                        </td>
                        <td data-label="Diagnóstico">
                          <div style={{ maxWidth: '300px' }}>
                            {c.diagnostico || '—'}
                          </div>
                        </td>
                        <td data-label="Acciones" style={{ textAlign: 'right' }}>
                          {canCreateOrEdit && (
                            <>
                              {(() => {
                                const tieneReceta = !!recetasMap[c.id];
                                return (
                                  <button 
                                    className={`btn btn-sm ${tieneReceta ? 'btn-primary' : 'btn-secondary'}`} 
                                    onClick={() => handleOpenReceta(c)}
                                    title={tieneReceta ? "Actualizar o Eliminar Receta Médica" : "Emitir Receta Médica"}
                                    aria-label={tieneReceta ? "Actualizar o Eliminar Receta Médica" : "Emitir Receta Médica"}
                                    style={tieneReceta ? { backgroundColor: '#059669', borderColor: '#059669' } : {}}
                                  >
                                    <Pill size={14} />
                                    {tieneReceta ? 'Editar Receta' : 'Recetar'}
                                  </button>
                                );
                              })()}
                              <button className="btn-icon" onClick={() => handleOpenModal(c)} title="Editar" aria-label="Editar consulta médica">
                                <Edit2 size={16} />
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button className="btn-icon danger" onClick={() => handleRequestDelete(c.id)} title="Eliminar" aria-label="Eliminar consulta médica">
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
          );
        })()}
      </div>

      {/* Modal Consulta (Estructura de Tarjetas Visuales) */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', width: '95%', background: 'transparent', border: 'none', boxShadow: 'none' }}>
            {/* Tarjeta Visual Cabecera Consulta */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.85rem', padding: '1.1rem 1.35rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: editingId ? '#eff6ff' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: editingId ? '#0284c7' : '#10b981', flexShrink: 0 }}>
                  <Stethoscope size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {editingId ? 'Editar Consulta' : 'Registrar Consulta Médica'}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {editingId ? 'Actualice el diagnóstico clínico y motivo de atención' : 'Complete la ficha de atención clínica veterinaria'}
                  </span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)} aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.85rem', padding: '1.25rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                {error && (
                  <div className="alert alert-danger" role="alert">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="consulta-paciente">Paciente Atendido *</label>
                    <select
                      id="consulta-paciente"
                      className={`form-select ${fieldErrors.pacienteId ? 'border-red-500' : ''}`}
                      value={formData.pacienteId}
                      onChange={(e) => {
                        setFormData({ ...formData, pacienteId: e.target.value });
                        if (fieldErrors.pacienteId) setFieldErrors(prev => ({ ...prev, pacienteId: null }));
                      }}
                      aria-invalid={!!fieldErrors.pacienteId}
                      aria-describedby={fieldErrors.pacienteId ? 'pacienteId-error' : undefined}
                    >
                      <option value="">Seleccione el paciente...</option>
                      {pacientes.map(p => {
                        const cli = p.cliente || clientes.find(c => c.id === p.clienteId);
                        return (
                          <option key={p.id} value={p.id}>
                            {p.nombre} ({p.especie}) — Dueño: {cli?.nombreCompleto || 'Sin dueño'} (RUT: {cli?.documentoIdentidad || '—'})
                          </option>
                        );
                      })}
                    </select>
                    {fieldErrors.pacienteId && (
                      <span id="pacienteId-error" role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                        {fieldErrors.pacienteId}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="consulta-cita">Cita Asociada (Opcional)</label>
                    <select
                      id="consulta-cita"
                      className="form-select"
                      value={formData.citaId}
                      onChange={(e) => setFormData({ ...formData, citaId: e.target.value })}
                    >
                      <option value="">Atención espontánea / Urgencia</option>
                      {citas.map(cit => (
                        <option key={cit.id} value={cit.id}>
                          Cita del {new Date(cit.fechaHora).toLocaleDateString()} ({cit.paciente?.nombre || 'Paciente'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="consulta-motivo">Motivo de la Consulta *</label>
                  <input
                    id="consulta-motivo"
                    type="text"
                    className={`form-input ${fieldErrors.motivo ? 'border-red-500' : ''}`}
                    placeholder="Ej. Control sano, vómitos reiterados, cojera pata izquierda..."
                    value={formData.motivo}
                    onChange={(e) => {
                      setFormData({ ...formData, motivo: e.target.value });
                      if (fieldErrors.motivo) setFieldErrors(prev => ({ ...prev, motivo: null }));
                    }}
                    aria-invalid={!!fieldErrors.motivo}
                    aria-describedby={fieldErrors.motivo ? 'motivo-error' : undefined}
                  />
                  {fieldErrors.motivo && (
                    <span id="motivo-error" role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                      {fieldErrors.motivo}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="consulta-diagnostico">Diagnóstico Clínico y Hallazgos *</label>
                  <textarea
                    id="consulta-diagnostico"
                    className={`form-textarea ${fieldErrors.diagnostico ? 'border-red-500' : ''}`}
                    rows="4"
                    placeholder="Descripción diagnóstica, temperatura, signos vitales y tratamiento sugerido..."
                    value={formData.diagnostico}
                    onChange={(e) => {
                      setFormData({ ...formData, diagnostico: e.target.value });
                      if (fieldErrors.diagnostico) setFieldErrors(prev => ({ ...prev, diagnostico: null }));
                    }}
                    aria-invalid={!!fieldErrors.diagnostico}
                    aria-describedby={fieldErrors.diagnostico ? 'diagnostico-error' : undefined}
                  />
                  {fieldErrors.diagnostico && (
                    <span id="diagnostico-error" role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                      {fieldErrors.diagnostico}
                    </span>
                  )}
                </div>
              </div>

              {/* Pie de Acciones (Tarjeta Visual) */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.85rem', padding: '0.9rem 1.35rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Actualizar Ficha' : 'Guardar Consulta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Emitir Receta */}
      {isRecetaModalOpen && selectedConsulta && (() => {
        const pac = selectedConsulta.paciente || pacientes.find(p => p.id === selectedConsulta.pacienteId);
        const cli = pac?.cliente || clientes.find(c => c.id === pac?.clienteId);
        return (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '680px', width: '95%', background: 'transparent', border: 'none', boxShadow: 'none' }}>
              {/* Tarjeta Visual Cabecera Receta */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.85rem', padding: '1.1rem 1.35rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: existingReceta ? '#eff6ff' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: existingReceta ? '#0284c7' : '#10b981', flexShrink: 0 }}>
                    <Pill size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {existingReceta ? 'Actualizar Receta Médica' : 'Emitir Receta Médica'} — {pac?.nombre || 'Paciente'}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: existingReceta ? '#059669' : '#64748b', fontWeight: existingReceta ? 600 : 400 }}>
                      {existingReceta ? `Receta registrada (Folio #${existingReceta.id})` : 'Prescripción de medicamentos e indicaciones posológicas'}
                    </span>
                  </div>
                </div>
                <button className="btn-icon" onClick={() => setIsRecetaModalOpen(false)} disabled={recetaLoading} aria-label="Cerrar modal">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveReceta} noValidate>
                {/* Tarjeta Visual Resumen del Paciente y Tutor */}
                <div style={{ background: '#ffffff', border: '1px solid #bae6fd', borderRadius: '0.85rem', padding: '1rem 1.25rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>PACIENTE</span>
                      <strong style={{ color: '#0f172a' }}>{pac?.nombre || 'Paciente'}</strong>
                      <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: '0.35rem' }}>({pac?.especie || 'Mascota'}{pac?.raza ? ` - ${pac.raza}` : ''})</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>DUEÑO / TUTOR</span>
                      <strong style={{ color: '#0f172a' }}>{cli?.nombreCompleto || 'Sin dueño asignado'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>RUT DEL DUEÑO</span>
                      <span style={{ color: '#0284c7', fontWeight: 600 }}>{cli?.documentoIdentidad ? `RUT: ${cli.documentoIdentidad}` : '—'}</span>
                    </div>
                    {cli?.telefono && (
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>CONTACTO</span>
                        <span style={{ color: '#334155' }}>{cli.telefono}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tarjeta Visual Formulario de Prescripción */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.85rem', padding: '1.25rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

                  {existingReceta && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.375rem', padding: '0.65rem 0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#166534' }}>
                      <CheckCircle2 size={18} color="#16a34a" />
                      <div>
                        <strong>Receta existente detectada (Folio #{existingReceta.id}).</strong>
                        <span style={{ display: 'block', fontSize: '0.8rem', color: '#15803d' }}>
                          Puedes actualizar las indicaciones y vigencia, o borrar la receta si ya no es requerida.
                        </span>
                      </div>
                    </div>
                  )}

                  {recetaError && (
                  <div className="alert alert-danger" role="alert">
                    <AlertCircle size={18} />
                    <span>{recetaError}</span>
                  </div>
                )}
                {recetaSuccess && (
                  <div className="alert alert-success" role="alert" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '0.75rem', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <CheckCircle2 size={18} />
                    <span>{recetaSuccess}</span>
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="receta-emision">Fecha de Emisión *</label>
                    <input
                      id="receta-emision"
                      type="date"
                      className={`form-input ${recetaFieldErrors.fechaEmision ? 'border-red-500' : ''}`}
                      value={recetaForm.fechaEmision}
                      onChange={(e) => {
                        setRecetaForm({ ...recetaForm, fechaEmision: e.target.value });
                        if (recetaFieldErrors.fechaEmision) setRecetaFieldErrors(prev => ({ ...prev, fechaEmision: null }));
                      }}
                      aria-invalid={!!recetaFieldErrors.fechaEmision}
                    />
                    {recetaFieldErrors.fechaEmision && (
                      <span role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                        {recetaFieldErrors.fechaEmision}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="receta-validez">Válida Hasta *</label>
                    <input
                      id="receta-validez"
                      type="date"
                      className={`form-input ${recetaFieldErrors.validaHasta ? 'border-red-500' : ''}`}
                      value={recetaForm.validaHasta}
                      onChange={(e) => {
                        setRecetaForm({ ...recetaForm, validaHasta: e.target.value });
                        if (recetaFieldErrors.validaHasta) setRecetaFieldErrors(prev => ({ ...prev, validaHasta: null }));
                      }}
                      aria-invalid={!!recetaFieldErrors.validaHasta}
                    />
                    {recetaFieldErrors.validaHasta && (
                      <span role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                        {recetaFieldErrors.validaHasta}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="receta-insumo">Medicamento / Insumo *</label>
                  <select
                    id="receta-insumo"
                    className={`form-select ${recetaFieldErrors.insumoId ? 'border-red-500' : ''}`}
                    value={recetaForm.insumoId}
                    onChange={(e) => {
                      setRecetaForm({ ...recetaForm, insumoId: e.target.value });
                      if (recetaFieldErrors.insumoId) setRecetaFieldErrors(prev => ({ ...prev, insumoId: null }));
                    }}
                    aria-invalid={!!recetaFieldErrors.insumoId}
                  >
                    <option value="">Seleccione medicamento o insumo...</option>
                    {insumos.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.nombreProducto} ({i.tipo}) - Stock: {i.stockActual}
                      </option>
                    ))}
                  </select>
                  {recetaFieldErrors.insumoId && (
                    <span role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                      {recetaFieldErrors.insumoId}
                    </span>
                  )}
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="receta-dosis">Dosis y Frecuencia *</label>
                    <input
                      id="receta-dosis"
                      type="text"
                      className={`form-input ${recetaFieldErrors.dosis ? 'border-red-500' : ''}`}
                      placeholder="Ej. 1 comprimido cada 8 horas"
                      value={recetaForm.dosis}
                      onChange={(e) => {
                        setRecetaForm({ ...recetaForm, dosis: e.target.value });
                        if (recetaFieldErrors.dosis) setRecetaFieldErrors(prev => ({ ...prev, dosis: null }));
                      }}
                      aria-invalid={!!recetaFieldErrors.dosis}
                    />
                    {recetaFieldErrors.dosis && (
                      <span role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                        {recetaFieldErrors.dosis}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="receta-duracion">Duración (Días) *</label>
                    <input
                      id="receta-duracion"
                      type="number"
                      className={`form-input ${recetaFieldErrors.duracionDias ? 'border-red-500' : ''}`}
                      min="1"
                      max="365"
                      value={recetaForm.duracionDias}
                      onChange={(e) => {
                        setRecetaForm({ ...recetaForm, duracionDias: e.target.value });
                        if (recetaFieldErrors.duracionDias) setRecetaFieldErrors(prev => ({ ...prev, duracionDias: null }));
                      }}
                      aria-invalid={!!recetaFieldErrors.duracionDias}
                    />
                    {recetaFieldErrors.duracionDias && (
                      <span role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                        {recetaFieldErrors.duracionDias}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pie de Acciones (Tarjeta Visual) */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.85rem', padding: '0.9rem 1.35rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {existingReceta && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={handleDeleteReceta}
                      disabled={recetaLoading}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
                    >
                      <Trash2 size={16} />
                      {recetaLoading ? 'Procesando...' : 'Eliminar Receta'}
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsRecetaModalOpen(false)} disabled={recetaLoading}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={recetaLoading}>
                    {recetaLoading ? 'Guardando...' : (existingReceta ? 'Actualizar Receta' : 'Generar Receta')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ); })()}

      {/* ConfirmModal para eliminar consulta */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Eliminar Registro de Consulta Médica"
        message="¿Está seguro de que desea eliminar este registro de consulta médica? Esta acción no se puede deshacer."
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  );
};
