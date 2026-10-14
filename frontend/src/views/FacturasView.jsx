import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DollarSign, Plus, Search, Edit2, Trash2, X, AlertCircle, FileText, Filter, RotateCcw } from 'lucide-react';

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
  const [nuevoItem, setNuevoItem] = useState({
    tipo: 'insumo',
    insumoId: '',
    consultaId: '',
    subtotal: 0
  });

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
  };

  const handleOpenModal = (factura = null) => {
    setError('');
    if (factura) {
      setEditingId(factura.id);
      setFormData({
        clienteId: factura.clienteId,
        fechaEmision: factura.fechaEmision,
        montoImpuestos: factura.montoImpuestos,
        montoTotal: factura.montoTotal
      });
    } else {
      setEditingId(null);
      setFormData({
        clienteId: clientes[0]?.id || '',
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

    const payload = {
      clienteId: Number(formData.clienteId),
      fechaEmision: formData.fechaEmision,
      montoImpuestos: parseFloat(formData.montoImpuestos) || 0,
      montoTotal: parseFloat(formData.montoTotal) || 0.01
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

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro de eliminar esta factura?')) return;
    try {
      await api.delete(`/api/v1/facturas/${id}`);
      fetchFacturas();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar factura.');
    }
  };

  const handleVerDetalles = async (fac) => {
    setSelectedFactura(fac);
    setNuevoItem({
      tipo: 'insumo',
      insumoId: insumos[0]?.id || '',
      consultaId: consultas[0]?.id || '',
      subtotal: insumos[0]?.precioUnitario || 1000
    });

    // Cargar detalles específicos vía endpoint con filtro: /api/v1/detallefac?facturaId=...
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
    try {
      const payload = {
        facturaId: selectedFactura.id,
        consultaId: nuevoItem.tipo === 'consulta' && nuevoItem.consultaId ? Number(nuevoItem.consultaId) : null,
        insumoId: nuevoItem.tipo === 'insumo' && nuevoItem.insumoId ? Number(nuevoItem.insumoId) : null,
        subtotal: parseFloat(nuevoItem.subtotal)
      };

      await api.post('/api/v1/detallefac', payload);
      const res = await api.get('/api/v1/detallefac', { params: { facturaId: selectedFactura.id } });
      setDetalles(res.data || []);
      alert('Ítem agregado a la factura correctamente.');
    } catch (err) {
      alert(err.response?.data?.message || 'Error al agregar ítem a la factura.');
    }
  };

  const handleEliminarDetalle = async (detalleId) => {
    if (!window.confirm('¿Eliminar esta línea del detalle?')) return;
    try {
      await api.delete(`/api/v1/detallefac/${detalleId}`);
      const res = await api.get('/api/v1/detallefac', { params: { facturaId: selectedFactura.id } });
      setDetalles(res.data || []);
    } catch (err) {
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
              <DollarSign size={24} color="#f59e0b" />
              Facturación y Cobranzas
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Filtros directos a `/api/v1/facturas` por cliente, rangos de fechas y montos
            </p>
          </div>
          {canCreateOrEdit && (
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={18} />
              Nueva Factura
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
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Cliente Facturado</label>
              <select
                className="form-select"
                value={filters.clienteId}
                onChange={(e) => setFilters({ ...filters, clienteId: e.target.value })}
              >
                <option value="">Todos los clientes</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombreCompleto}</option>
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
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Monto Mínimo ($)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Min..."
                value={filters.montoMin}
                onChange={(e) => setFilters({ ...filters, montoMin: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Monto Máximo ($)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Max..."
                value={filters.montoMax}
                onChange={(e) => setFilters({ ...filters, montoMax: e.target.value })}
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
          <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando facturas...</p>
        ) : facturas.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            No se encontraron facturas con los filtros aplicados.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>N° Factura</th>
                  <th>Cliente</th>
                  <th>Fecha Emisión</th>
                  <th>Impuestos</th>
                  <th>Total Facturado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((fac) => {
                  const cliente = clientes.find(c => c.id === fac.clienteId);
                  return (
                    <tr key={fac.id}>
                      <td data-label="N° Factura" style={{ fontWeight: 700 }}>FAC-{String(fac.id).padStart(5, '0')}</td>
                      <td data-label="Cliente">
                        <strong>{cliente ? cliente.nombreCompleto : `Cliente #${fac.clienteId}`}</strong>
                        {cliente && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>DNI: {cliente.documentoIdentidad}</div>}
                      </td>
                      <td data-label="Fecha Emisión">{fac.fechaEmision}</td>
                      <td data-label="Impuestos">${Number(fac.montoImpuestos).toFixed(2)}</td>
                      <td data-label="Total Facturado">
                        <strong style={{ color: '#0f766e', fontSize: '1rem' }}>
                          ${Number(fac.montoTotal).toFixed(2)}
                        </strong>
                      </td>
                      <td data-label="Acciones" style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleVerDetalles(fac)}
                          title="Gestionar Detalles"
                          aria-label="Gestionar Detalles"
                        >
                          <FileText size={14} />
                          Detalle
                        </button>
                        {canCreateOrEdit && (
                          <button className="btn-icon" onClick={() => handleOpenModal(fac)} title="Editar" aria-label="Editar factura">
                            <Edit2 size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button className="btn-icon danger" onClick={() => handleDelete(fac.id)} title="Eliminar" aria-label="Eliminar factura">
                            <Trash2 size={16} />
                          </button>
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

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && (
                  <div className="alert alert-danger">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Cliente Facturado</label>
                  <select
                    className="form-select"
                    required
                    value={formData.clienteId}
                    onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                  >
                    <option value="">Seleccione cliente...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombreCompleto} (DNI: {c.documentoIdentidad})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha de Emisión</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    value={formData.fechaEmision}
                    onChange={(e) => setFormData({ ...formData, fechaEmision: e.target.value })}
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Monto de Impuestos ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.montoImpuestos}
                      onChange={(e) => setFormData({ ...formData, montoImpuestos: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Monto Total ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-input"
                      required
                      value={formData.montoTotal}
                      onChange={(e) => setFormData({ ...formData, montoTotal: e.target.value })}
                    />
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
                Detalles de Factura #FAC-{String(selectedFactura.id).padStart(5, '0')}
              </h3>
              <button className="btn-icon" onClick={() => setIsDetalleModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: '#1e293b' }}>
                  Añadir Ítem / Concepto al Detalle
                </h4>
                <form onSubmit={handleAgregarDetalle} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Tipo</label>
                    <select
                      className="form-select"
                      value={nuevoItem.tipo}
                      onChange={(e) => setNuevoItem({ ...nuevoItem, tipo: e.target.value })}
                    >
                      <option value="insumo">Insumo/Medicamento</option>
                      <option value="consulta">Consulta Médica</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Concepto</label>
                    {nuevoItem.tipo === 'insumo' ? (
                      <select
                        className="form-select"
                        value={nuevoItem.insumoId}
                        onChange={(e) => {
                          const ins = insumos.find(i => i.id === Number(e.target.value));
                          setNuevoItem({ 
                            ...nuevoItem, 
                            insumoId: e.target.value,
                            subtotal: ins ? ins.precioUnitario : nuevoItem.subtotal
                          });
                        }}
                      >
                        <option value="">Seleccione insumo...</option>
                        {insumos.map(i => (
                          <option key={i.id} value={i.id}>{i.nombreProducto} (${i.precioUnitario})</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        className="form-select"
                        value={nuevoItem.consultaId}
                        onChange={(e) => setNuevoItem({ ...nuevoItem, consultaId: e.target.value })}
                      >
                        <option value="">Seleccione consulta...</option>
                        {consultas.map(c => (
                          <option key={c.id} value={c.id}>Consulta #{c.id} - {c.motivo}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Subtotal ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      required
                      value={nuevoItem.subtotal}
                      onChange={(e) => setNuevoItem({ ...nuevoItem, subtotal: e.target.value })}
                    />
                  </div>

                  <div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                      <Plus size={16} /> Agregar
                    </button>
                  </div>
                </form>
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
                        <th>ID</th>
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
                            <td data-label="ID">#{d.id}</td>
                            <td data-label="Concepto / Tipo">
                              {ins && <span><strong>Insumo:</strong> {ins.nombreProducto}</span>}
                              {con && <span><strong>Consulta:</strong> #{con.id} - {con.motivo}</span>}
                              {!ins && !con && <span style={{ color: '#94a3b8' }}>Servicio Veterinario</span>}
                            </td>
                            <td data-label="Subtotal"><strong>${Number(d.subtotal).toFixed(2)}</strong></td>
                            <td data-label="Acción" style={{ textAlign: 'right' }}>
                              <button className="btn-icon danger" onClick={() => handleEliminarDetalle(d.id)} aria-label="Eliminar línea">
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
    </div>
  );
};
