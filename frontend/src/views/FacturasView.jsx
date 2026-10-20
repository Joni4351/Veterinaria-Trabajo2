import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DollarSign, Plus, Edit2, Trash2, X, AlertCircle, FileText, Filter, RotateCcw } from 'lucide-react';
import { facturaSchema, detalleFacturaSchema } from '../schemas/facturaSchema';
import { ConfirmModal } from '../components/ConfirmModal';

export const FacturasView = () => {
  const { hasRole, isAdmin } = useAuth();
  const canCreateOrEdit = hasRole(['Administrador', 'Veterinario']);
  const canDelete = isAdmin;

  const [facturas, setFacturas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [consultas, setConsultas] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [searchRut, setSearchRut] = useState('');

  // Filtros de API
  const [filters, setFilters] = useState({
    clienteId: '',
    fechaDesde: '',
    fechaHasta: '',
    montoMin: '',
    montoMax: ''
  });

  // Ver detalle
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [isDetalleModalOpen, setIsDetalleModalOpen] = useState(false);
  const [detalleError, setDetalleError] = useState('');
  const [detalleFieldErrors, setDetalleFieldErrors] = useState({});
  const [nuevoItem, setNuevoItem] = useState({
    tipo: 'insumo',
    insumoId: '',
    consultaId: '',
    subtotal: 0
  });

  // Modal Confirmación Borrado Factura
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });
  // Modal Confirmación Borrado Detalle
  const [deleteDetalleConfirm, setDeleteDetalleConfirm] = useState({ isOpen: false, id: null, loading: false });

  const [formData, setFormData] = useState({
    clienteId: '',
    fechaEmision: new Date().toISOString().slice(0, 10),
    montoImpuestos: 0,
    montoTotal: 0
  });

  useEffect(() => {
    fetchAuxiliares();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFacturas();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const fetchAuxiliares = async () => {
    try {
      const [cliRes, conRes, insRes, detRes] = await Promise.allSettled([
        api.get('/api/v1/clientes'),
        api.get('/api/v1/consultas'),
        api.get('/api/v1/insumos'),
        api.get('/api/v1/detallefac')
      ]);

      if (cliRes.status === 'fulfilled') setClientes(cliRes.value.data || []);
      if (conRes.status === 'fulfilled') setConsultas(conRes.value.data || []);
      if (insRes.status === 'fulfilled') setInsumos(insRes.value.data || []);
      if (detRes.status === 'fulfilled') setDetalles(detRes.value.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFacturas = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.clienteId) params.clienteId = filters.clienteId;
      if (filters.fechaDesde) params.fechaDesde = filters.fechaDesde;
      if (filters.fechaHasta) params.fechaHasta = filters.fechaHasta;
      if (filters.montoMin) params.montoMin = filters.montoMin;
      if (filters.montoMax) params.montoMax = filters.montoMax;

      const res = await api.get('/api/v1/facturas', { params });
      setFacturas(res.data || []);
    } catch (err) {
      console.error(err);
      setError('Error al obtener datos de facturación.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      clienteId: '',
      fechaDesde: '',
      fechaHasta: '',
      montoMin: '',
      montoMax: ''
    });
    setSearchRut('');
  };

  const handleOpenModal = (factura = null) => {
    setError('');
    setFieldErrors({});
    if (factura) {
      setEditingId(factura.id);
      setFormData({
        clienteId: String(factura.clienteId),
        fechaEmision: factura.fechaEmision,
        montoImpuestos: factura.montoImpuestos,
        montoTotal: factura.montoTotal
      });
    } else {
      setEditingId(null);
      setFormData({
        clienteId: clientes[0]?.id ? String(clientes[0].id) : '',
        fechaEmision: new Date().toISOString().slice(0, 10),
        montoImpuestos: 0,
        montoTotal: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const validation = facturaSchema.safeParse(formData);
    if (!validation.success) {
      const errors = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0]] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    const payload = {
      clienteId: validation.data.clienteId,
      fechaEmision: validation.data.fechaEmision,
      montoImpuestos: validation.data.montoImpuestos,
      montoTotal: validation.data.montoTotal
    };

    try {
      if (editingId) {
        await api.put(`/api/v1/facturas/${editingId}`, payload);
      } else {
        await api.post('/api/v1/facturas', payload);
      }
      setIsModalOpen(false);
      fetchFacturas();
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(Object.values(err.response.data.errors).flat().join(' '));
      } else {
        setError(err.response?.data?.message || 'Error al guardar la factura.');
      }
    }
  };

  const handleRequestDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id, loading: false });
  };

  const handleConfirmDelete = async () => {
    setDeleteConfirm(prev => ({ ...prev, loading: true }));
    try {
      await api.delete(`/api/v1/facturas/${deleteConfirm.id}`);
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
      fetchFacturas();
    } catch (err) {
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
      alert(err.response?.data?.message || 'Error al eliminar factura.');
    }
  };

  const handleVerDetalles = async (fac) => {
    setSelectedFactura(fac);
    setDetalleError('');
    setDetalleFieldErrors({});
    const initialInsumo = insumos[0];
    setNuevoItem({
      tipo: 'insumo',
      insumoId: initialInsumo?.id ? String(initialInsumo.id) : '',
      consultaId: consultas[0]?.id ? String(consultas[0].id) : '',
      subtotal: initialInsumo?.precioUnitario || 1000
    });

    try {
      const res = await api.get('/api/v1/detallefac', { params: { facturaId: fac.id } });
      setDetalles(res.data || []);
    } catch (e) {
      console.error(e);
    }

    setIsDetalleModalOpen(true);
  };

  const handleAgregarDetalle = async (e) => {
    e.preventDefault();
    setDetalleError('');
    setDetalleFieldErrors({});

    const validation = detalleFacturaSchema.safeParse(nuevoItem);
    if (!validation.success) {
      const errors = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0]] = err.message;
      });
      setDetalleFieldErrors(errors);
      return;
    }

    try {
      const payload = {
        facturaId: selectedFactura.id,
        consultaId: validation.data.tipo === 'consulta' && validation.data.consultaId ? Number(validation.data.consultaId) : null,
        insumoId: validation.data.tipo === 'insumo' && validation.data.insumoId ? Number(validation.data.insumoId) : null,
        subtotal: validation.data.subtotal
      };

      await api.post('/api/v1/detallefac', payload);
      const res = await api.get('/api/v1/detallefac', { params: { facturaId: selectedFactura.id } });
      setDetalles(res.data || []);
    } catch (err) {
      if (err.response?.data?.errors) {
        setDetalleError(Object.values(err.response.data.errors).flat().join(' '));
      } else {
        setDetalleError(err.response?.data?.message || 'Error al agregar ítem a la factura.');
      }
    }
  };

  const handleRequestDeleteDetalle = (detalleId) => {
    setDeleteDetalleConfirm({ isOpen: true, id: detalleId, loading: false });
  };

  const handleConfirmDeleteDetalle = async () => {
    setDeleteDetalleConfirm(prev => ({ ...prev, loading: true }));
    try {
      await api.delete(`/api/v1/detallefac/${deleteDetalleConfirm.id}`);
      const res = await api.get('/api/v1/detallefac', { params: { facturaId: selectedFactura.id } });
      setDetalles(res.data || []);
      setDeleteDetalleConfirm({ isOpen: false, id: null, loading: false });
    } catch (err) {
      setDeleteDetalleConfirm(prev => ({ ...prev, loading: false }));
      alert('Error al eliminar línea.');
    }
  };

  const facturaDetalles = selectedFactura 
    ? detalles.filter(d => d.facturaId === selectedFactura.id)
    : [];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <DollarSign size={24} color="#10b981" />
              Gestión de Facturación y Cobros
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Filtros directos a `/api/v1/facturas` por cliente, rangos de fechas y montos
            </p>
          </div>
          {canCreateOrEdit && (
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={18} />
              Emitir Factura
            </button>
          )}
        </div>

        {/* Panel de Filtros para Endpoint */}
        <div className="filter-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>
            <Filter size={16} /> Filtros de Facturas (API)
          </div>
          <div className="filter-grid">
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Dueño / Cliente (Buscar por RUT o Nombre)</label>
              <input
                type="text"
                className="form-input"
                placeholder="RUT o Nombre del cliente..."
                value={searchRut}
                onChange={(e) => setSearchRut(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Cliente</label>
              <select
                className="form-select"
                value={filters.clienteId}
                onChange={(e) => setFilters({ ...filters, clienteId: e.target.value })}
              >
                <option value="">Todos los clientes</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombreCompleto} — RUT: {c.documentoIdentidad}</option>
                ))}
              </select>
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

            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Hasta Fecha</label>
              <input
                type="date"
                className="form-input"
                value={filters.fechaHasta}
                onChange={(e) => setFilters({ ...filters, fechaHasta: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Monto Min ($)</label>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                value={filters.montoMin}
                onChange={(e) => setFilters({ ...filters, montoMin: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Monto Max ($)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Sin límite"
                value={filters.montoMax}
                onChange={(e) => setFilters({ ...filters, montoMax: e.target.value })}
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
          const displayedFacturas = facturas.filter((f) => {
            if (!searchRut) return true;
            const term = searchRut.toLowerCase();
            const cliente = clientes.find(c => c.id === f.clienteId);
            const nombre = cliente?.nombreCompleto?.toLowerCase() || '';
            const rut = cliente?.documentoIdentidad?.toLowerCase() || '';
            return nombre.includes(term) || rut.includes(term);
          });

          if (loading) {
            return (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                Cargando facturas...
              </div>
            );
          }
          if (displayedFacturas.length === 0) {
            return (
              <p style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                No hay facturas registradas con los filtros seleccionados.
              </p>
            );
          }
          return (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Cliente / Dueño</th>
                    <th>RUT / Documento</th>
                    <th>Fecha Emisión</th>
                    <th>Impuestos</th>
                    <th>Total Facturado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedFacturas.map((f) => {
                    const cliente = clientes.find(c => c.id === f.clienteId);
                    return (
                      <tr key={f.id}>
                        <td data-label="Cliente">
                          <strong style={{ color: '#0f172a' }}>{cliente ? cliente.nombreCompleto : 'Cliente'}</strong>
                        </td>
                        <td data-label="RUT">
                          <span className="badge badge-secondary" style={{ fontFamily: 'monospace', letterSpacing: '0.04em', fontWeight: 700, color: '#0f766e', background: '#ccfbf1' }}>
                            {cliente?.documentoIdentidad || '—'}
                          </span>
                        </td>
                        <td data-label="Fecha Emisión">{f.fechaEmision}</td>
                        <td data-label="Impuestos">${Number(f.montoImpuestos).toFixed(2)}</td>
                        <td data-label="Total">
                          <strong style={{ color: '#16a34a', fontSize: '1rem' }}>
                            ${Number(f.montoTotal).toFixed(2)}
                          </strong>
                        </td>
                        <td data-label="Acciones" style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => handleVerDetalles(f)}
                            title="Gestionar Detalle de Factura"
                            aria-label="Gestionar Detalle de Factura"
                          >
                            <FileText size={14} />
                            Detalles
                          </button>
                          {canCreateOrEdit && (
                            <button className="btn-icon" onClick={() => handleOpenModal(f)} title="Editar" aria-label="Editar factura">
                              <Edit2 size={16} />
                            </button>
                          )}
                          {canDelete && (
                            <button className="btn-icon danger" onClick={() => handleRequestDelete(f.id)} title="Eliminar" aria-label="Eliminar factura">
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

      {/* Modal Factura */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                {editingId ? 'Editar Factura' : 'Emitir Nueva Factura'}
              </h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
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
                  <label className="form-label" htmlFor="factura-cliente">Cliente Facturado *</label>
                  <select
                    id="factura-cliente"
                    className={`form-select ${fieldErrors.clienteId ? 'border-red-500' : ''}`}
                    value={formData.clienteId}
                    onChange={(e) => {
                      setFormData({ ...formData, clienteId: e.target.value });
                      if (fieldErrors.clienteId) setFieldErrors(prev => ({ ...prev, clienteId: null }));
                    }}
                    aria-invalid={!!fieldErrors.clienteId}
                    aria-describedby={fieldErrors.clienteId ? 'factura-cliente-error' : undefined}
                  >
                    <option value="">Seleccione cliente...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombreCompleto} — RUT: {c.documentoIdentidad}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.clienteId && (
                    <span id="factura-cliente-error" role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                      {fieldErrors.clienteId}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="factura-fecha">Fecha de Emisión *</label>
                  <input
                    id="factura-fecha"
                    type="date"
                    className={`form-input ${fieldErrors.fechaEmision ? 'border-red-500' : ''}`}
                    value={formData.fechaEmision}
                    onChange={(e) => {
                      setFormData({ ...formData, fechaEmision: e.target.value });
                      if (fieldErrors.fechaEmision) setFieldErrors(prev => ({ ...prev, fechaEmision: null }));
                    }}
                    aria-invalid={!!fieldErrors.fechaEmision}
                    aria-describedby={fieldErrors.fechaEmision ? 'factura-fecha-error' : undefined}
                  />
                  {fieldErrors.fechaEmision && (
                    <span id="factura-fecha-error" role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                      {fieldErrors.fechaEmision}
                    </span>
                  )}
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="factura-impuestos">Monto de Impuestos ($)</label>
                    <input
                      id="factura-impuestos"
                      type="number"
                      step="0.01"
                      className={`form-input ${fieldErrors.montoImpuestos ? 'border-red-500' : ''}`}
                      value={formData.montoImpuestos}
                      onChange={(e) => {
                        setFormData({ ...formData, montoImpuestos: e.target.value });
                        if (fieldErrors.montoImpuestos) setFieldErrors(prev => ({ ...prev, montoImpuestos: null }));
                      }}
                      aria-invalid={!!fieldErrors.montoImpuestos}
                      aria-describedby={fieldErrors.montoImpuestos ? 'factura-impuestos-error' : undefined}
                    />
                    {fieldErrors.montoImpuestos && (
                      <span id="factura-impuestos-error" role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                        {fieldErrors.montoImpuestos}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="factura-total">Monto Total ($) *</label>
                    <input
                      id="factura-total"
                      type="number"
                      step="0.01"
                      className={`form-input ${fieldErrors.montoTotal ? 'border-red-500' : ''}`}
                      value={formData.montoTotal}
                      onChange={(e) => {
                        setFormData({ ...formData, montoTotal: e.target.value });
                        if (fieldErrors.montoTotal) setFieldErrors(prev => ({ ...prev, montoTotal: null }));
                      }}
                      aria-invalid={!!fieldErrors.montoTotal}
                      aria-describedby={fieldErrors.montoTotal ? 'factura-total-error' : undefined}
                    />
                    {fieldErrors.montoTotal && (
                      <span id="factura-total-error" role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                        {fieldErrors.montoTotal}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Actualizar Factura' : 'Emitir Factura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalles de Factura */}
      {isDetalleModalOpen && selectedFactura && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                Detalles de Factura — Cliente: {clientes.find(c => c.id === selectedFactura.clienteId)?.nombreCompleto || 'Cliente'} (RUT: {clientes.find(c => c.id === selectedFactura.clienteId)?.documentoIdentidad || '—'})
              </h3>
              <button className="btn-icon" onClick={() => setIsDetalleModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {detalleError && (
                <div className="alert alert-danger" role="alert" style={{ marginBottom: '1rem' }}>
                  <AlertCircle size={18} />
                  <span>{detalleError}</span>
                </div>
              )}

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: '#1e293b' }}>
                  Añadir Ítem / Concepto al Detalle
                </h4>
                <form onSubmit={handleAgregarDetalle} noValidate style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="detalle-tipo">Tipo</label>
                    <select
                      id="detalle-tipo"
                      className="form-select"
                      value={nuevoItem.tipo}
                      onChange={(e) => {
                        setNuevoItem({ ...nuevoItem, tipo: e.target.value });
                        setDetalleFieldErrors({});
                      }}
                    >
                      <option value="insumo">Insumo/Medicamento</option>
                      <option value="consulta">Consulta Médica</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="detalle-concepto">Concepto</label>
                    {nuevoItem.tipo === 'insumo' ? (
                      <select
                        id="detalle-concepto"
                        className={`form-select ${detalleFieldErrors.tipo ? 'border-red-500' : ''}`}
                        value={nuevoItem.insumoId}
                        onChange={(e) => {
                          const ins = insumos.find(i => i.id === Number(e.target.value));
                          setNuevoItem({ 
                            ...nuevoItem, 
                            insumoId: e.target.value,
                            subtotal: ins ? ins.precioUnitario : nuevoItem.subtotal
                          });
                          setDetalleFieldErrors({});
                        }}
                      >
                        <option value="">Seleccione insumo...</option>
                        {insumos.map(i => (
                          <option key={i.id} value={i.id}>{i.nombreProducto} (${i.precioUnitario})</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        id="detalle-concepto"
                        className={`form-select ${detalleFieldErrors.tipo ? 'border-red-500' : ''}`}
                        value={nuevoItem.consultaId}
                        onChange={(e) => {
                          setNuevoItem({ ...nuevoItem, consultaId: e.target.value });
                          setDetalleFieldErrors({});
                        }}
                      >
                        <option value="">Seleccione consulta...</option>
                        {consultas.map(c => (
                          <option key={c.id} value={c.id}>Consulta Médica: {c.motivo}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="detalle-subtotal">Subtotal ($)</label>
                    <input
                      id="detalle-subtotal"
                      type="number"
                      step="0.01"
                      className={`form-input ${detalleFieldErrors.subtotal ? 'border-red-500' : ''}`}
                      value={nuevoItem.subtotal}
                      onChange={(e) => {
                        setNuevoItem({ ...nuevoItem, subtotal: e.target.value });
                        if (detalleFieldErrors.subtotal) setDetalleFieldErrors(prev => ({ ...prev, subtotal: null }));
                      }}
                    />
                  </div>

                  <div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                      <Plus size={16} /> Agregar
                    </button>
                  </div>
                </form>
                {detalleFieldErrors.tipo && (
                  <span role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.4rem', display: 'block' }}>
                    {detalleFieldErrors.tipo}
                  </span>
                )}
                {detalleFieldErrors.subtotal && (
                  <span role="alert" style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.4rem', display: 'block' }}>
                    {detalleFieldErrors.subtotal}
                  </span>
                )}
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
                Líneas de la Factura
              </h4>
              {facturaDetalles.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', textAlign: 'center', padding: '1.5rem' }}>
                  No se han registrado líneas de detalle para esta factura todavía.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Concepto / Tipo</th>
                        <th>Subtotal</th>
                        <th style={{ textAlign: 'right' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturaDetalles.map(d => {
                        const ins = insumos.find(i => i.id === d.insumoId);
                        const con = consultas.find(c => c.id === d.consultaId);
                        return (
                          <tr key={d.id}>
                            <td data-label="Concepto / Tipo">
                              {ins && <span><strong>Insumo:</strong> {ins.nombreProducto}</span>}
                              {con && <span><strong>Consulta:</strong> {con.motivo}</span>}
                              {!ins && !con && <span style={{ color: '#94a3b8' }}>Servicio Veterinario</span>}
                            </td>
                            <td data-label="Subtotal"><strong>${Number(d.subtotal).toFixed(2)}</strong></td>
                            <td data-label="Acción" style={{ textAlign: 'right' }}>
                              <button className="btn-icon danger" onClick={() => handleRequestDeleteDetalle(d.id)} aria-label="Eliminar línea">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsDetalleModalOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ConfirmModal para eliminar factura */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Eliminar Factura"
        message="¿Está seguro de que desea eliminar esta factura? Esta acción eliminará el registro contable permanentemente."
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />

      {/* ConfirmModal para eliminar detalle */}
      <ConfirmModal
        isOpen={deleteDetalleConfirm.isOpen}
        title="Eliminar Línea del Detalle"
        message="¿Está seguro de que desea remover este ítem del detalle de la factura?"
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        loading={deleteDetalleConfirm.loading}
        onConfirm={handleConfirmDeleteDetalle}
        onCancel={() => setDeleteDetalleConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  );
};
