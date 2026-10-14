import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, Plus, Search, Edit2, Trash2, X, AlertCircle, FileText, Pill, Filter, RotateCcw } from 'lucide-react';

export const ConsultasView = () => {
  const { hasRole, isAdmin } = useAuth();
  const canCreateOrEdit = hasRole(['Administrador', 'Veterinario']);
  const canDelete = isAdmin;

  const [consultas, setConsultas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [citas, setCitas] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  // Filtros de API
  const [filters, setFilters] = useState({
    pacienteId: '',
    motivo: '',
    diagnostico: ''
  });

  // Sub-modal Receta
  const [isRecetaModalOpen, setIsRecetaModalOpen] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState(null);
  const [recetaForm, setRecetaForm] = useState({
    fechaEmision: new Date().toISOString().slice(0, 10),
    validaHasta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    insumoId: '',
    dosis: '',
    duracionDias: 7
  });

  const [formData, setFormData] = useState({
    pacienteId: '',
    citaId: '',
    motivo: '',
    diagnostico: ''
  });

  useEffect(() => {
    fetchCatalogos();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConsultas();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const fetchCatalogos = async () => {
    try {
      const [pacRes, citRes, insRes] = await Promise.allSettled([
        api.get('/api/v1/pacientes'),
        api.get('/api/v1/citas'),
        api.get('/api/v1/insumos')
      ]);

      if (pacRes.status === 'fulfilled') setPacientes(pacRes.value.data || []);
      if (citRes.status === 'fulfilled') setCitas(citRes.value.data || []);
      if (insRes.status === 'fulfilled') setInsumos(insRes.value.data || []);
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
      setError('Error al cargar datos de consultas médicas.');
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
  };

  const handleOpenModal = (consulta = null) => {
    setError('');
    if (consulta) {
      setEditingId(consulta.id);
      setFormData({
        pacienteId: consulta.pacienteId,
        citaId: consulta.citaId || '',
        motivo: consulta.motivo,
        diagnostico: consulta.diagnostico || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        pacienteId: pacientes[0]?.id || '',
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

    const payload = {
      pacienteId: Number(formData.pacienteId),
      citaId: formData.citaId ? Number(formData.citaId) : null,
      motivo: formData.motivo,
      diagnostico: formData.diagnostico
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

  const handleDelete = async (id) => {
    if (!window.confirm('¿Desea eliminar este registro de consulta médica?')) return;
    try {
      await api.delete(`/api/v1/consultas/${id}`);
      fetchConsultas();
    } catch (err) {
      alert(err.response?.data?.message || 'No se pudo eliminar la consulta.');
    }
  };

  const handleOpenReceta = (consulta) => {
    setSelectedConsulta(consulta);
    setRecetaForm({
      fechaEmision: new Date().toISOString().slice(0, 10),
      validaHasta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      insumoId: insumos[0]?.id || '',
      dosis: '1 comprimido cada 12 horas con alimento',
      duracionDias: 7
    });
    setIsRecetaModalOpen(true);
  };

  const handleSaveReceta = async (e) => {
    e.preventDefault();
    try {
      const recetaRes = await api.post('/api/v1/recetas', {
        consultaId: selectedConsulta.id,
        fechaEmision: recetaForm.fechaEmision,
        validaHasta: recetaForm.validaHasta
      });

      const recetaId = recetaRes.data?.id;

      if (recetaId && recetaForm.insumoId) {
        await api.post('/api/v1/detallesRe', {
          recetaId: recetaId,
          insumoId: Number(recetaForm.insumoId),
          dosis: recetaForm.dosis,
          duracionDias: Number(recetaForm.duracionDias)
        });
      }

      alert('Receta médica emitida con éxito.');
      setIsRecetaModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al emitir la receta.');
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
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Motivo</label>
              <input
                type="text"
                className="form-input"
                placeholder="Buscar por motivo..."
                value={filters.motivo}
                onChange={(e) => setFilters({ ...filters, motivo: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Diagnóstico</label>
              <input
                type="text"
                className="form-input"
                placeholder="Buscar por diagnóstico..."
                value={filters.diagnostico}
                onChange={(e) => setFilters({ ...filters, diagnostico: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleResetFilters}>
                <RotateCcw size={15} /> Limpiar
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando consultas...</p>
        ) : consultas.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            No hay consultas registradas con los filtros indicados.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Paciente</th>
                  <th>Cita Vinculada</th>
                  <th>Motivo de Consulta</th>
                  <th>Diagnóstico</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {consultas.map((c) => {
                  const paciente = pacientes.find(p => p.id === c.pacienteId);
                  return (
                    <tr key={c.id}>
                      <td data-label="ID" style={{ fontWeight: 600 }}>#{c.id}</td>
                      <td data-label="Paciente">
                        <strong>{paciente ? paciente.nombre : `Paciente #${c.pacienteId}`}</strong>
                        {paciente && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{paciente.especie}</div>}
                      </td>
                      <td data-label="Cita Vinculada">
                        {c.citaId ? (
                          <span className="badge badge-secondary">Cita #{c.citaId}</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Urgencia / Sin Cita</span>
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
                            <button 
                              className="btn btn-secondary btn-sm" 
                              onClick={() => handleOpenReceta(c)}
                              title="Emitir Receta Médica"
                              aria-label="Emitir Receta Médica"
                            >
                              <Pill size={14} />
                              Recetar
                            </button>
                            <button className="btn-icon" onClick={() => handleOpenModal(c)} title="Editar" aria-label="Editar consulta">
                              <Edit2 size={16} />
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button className="btn-icon danger" onClick={() => handleDelete(c.id)} title="Eliminar" aria-label="Eliminar consulta">
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

      {/* Modal Consulta */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                {editingId ? 'Editar Consulta' : 'Registrar Consulta Médica'}
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

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Paciente Atendido</label>
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

                  <div className="form-group">
                    <label className="form-label">Cita Asociada (Opcional)</label>
                    <select
                      className="form-select"
                      value={formData.citaId}
                      onChange={(e) => setFormData({ ...formData, citaId: e.target.value })}
                    >
                      <option value="">Atención espontánea / Urgencia</option>
                      {citas.map(cit => (
                        <option key={cit.id} value={cit.id}>
                          Cita #{cit.id} ({new Date(cit.fechaHora).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Motivo de la Consulta</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Control sano, vómitos reiterados, cojera pata izquierda..."
                    required
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Diagnóstico Clínico y Hallazgos</label>
                  <textarea
                    className="form-textarea"
                    rows="4"
                    placeholder="Descripción diagnóstica, temperatura, signos vitales y tratamiento sugerido..."
                    required
                    value={formData.diagnostico}
                    onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
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
      {isRecetaModalOpen && selectedConsulta && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                Emitir Receta para Consulta #{selectedConsulta.id}
              </h3>
              <button className="btn-icon" onClick={() => setIsRecetaModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveReceta}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Fecha de Emisión</label>
                    <input
                      type="date"
                      className="form-input"
                      required
                      value={recetaForm.fechaEmision}
                      onChange={(e) => setRecetaForm({ ...recetaForm, fechaEmision: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Válida Hasta</label>
                    <input
                      type="date"
                      className="form-input"
                      required
                      value={recetaForm.validaHasta}
                      onChange={(e) => setRecetaForm({ ...recetaForm, validaHasta: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Medicamento / Insumo</label>
                  <select
                    className="form-select"
                    required
                    value={recetaForm.insumoId}
                    onChange={(e) => setRecetaForm({ ...recetaForm, insumoId: e.target.value })}
                  >
                    <option value="">Seleccione medicamento o insumo...</option>
                    {insumos.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.nombreProducto} ({i.tipo}) - Stock: {i.stockActual}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Dosis y Frecuencia</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. 1 comprimido cada 8 horas"
                      required
                      value={recetaForm.dosis}
                      onChange={(e) => setRecetaForm({ ...recetaForm, dosis: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Duración (Días)</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      max="365"
                      required
                      value={recetaForm.duracionDias}
                      onChange={(e) => setRecetaForm({ ...recetaForm, duracionDias: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsRecetaModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Generar Receta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
