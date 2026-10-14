import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Package, Plus, Search, Edit2, Trash2, X, AlertCircle, Filter, RotateCcw } from 'lucide-react';

export const InsumosView = () => {
  const { hasRole, isAdmin } = useAuth();
  const canCreateOrEdit = hasRole(['Administrador', 'Veterinario']);
  const canDelete = isAdmin;

  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  // Filtros de API
  const [filters, setFilters] = useState({
    nombre: '',
    tipo: '',
    stockMinimo: '',
    stockMaximo: '',
    precioMin: '',
    precioMax: ''
  });

  const [formData, setFormData] = useState({
    nombreProducto: '',
    tipo: 'Medicamento',
    stockActual: 10,
    precioUnitario: 1000
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInsumos();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const fetchInsumos = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.nombre) params.nombre = filters.nombre;
      if (filters.tipo) params.tipo = filters.tipo;
      if (filters.stockMinimo) params.stockMinimo = filters.stockMinimo;
      if (filters.stockMaximo) params.stockMaximo = filters.stockMaximo;
      if (filters.precioMin) params.precioMin = filters.precioMin;
      if (filters.precioMax) params.precioMax = filters.precioMax;

      const res = await api.get('/api/v1/insumos', { params });
      setInsumos(res.data || []);
    } catch (err) {
      console.error(err);
      setError('Error al obtener lista de insumos');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      nombre: '',
      tipo: '',
      stockMinimo: '',
      stockMaximo: '',
      precioMin: '',
      precioMax: ''
    });
  };

  const handleOpenModal = (insumo = null) => {
    setError('');
    if (insumo) {
      setEditingId(insumo.id);
      setFormData({
        nombreProducto: insumo.nombreProducto,
        tipo: insumo.tipo,
        stockActual: insumo.stockActual,
        precioUnitario: insumo.precioUnitario
      });
    } else {
      setEditingId(null);
      setFormData({
        nombreProducto: '',
        tipo: 'Medicamento',
        stockActual: 10,
        precioUnitario: 1000
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      nombreProducto: formData.nombreProducto,
      tipo: formData.tipo,
      stockActual: parseInt(formData.stockActual, 10),
      precioUnitario: parseFloat(formData.precioUnitario)
    };

    try {
      if (editingId) {
        await api.put(`/api/v1/insumos/${editingId}`, payload);
      } else {
        await api.post('/api/v1/insumos', payload);
      }
      setIsModalOpen(false);
      fetchInsumos();
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(Object.values(err.response.data.errors).flat().join(' '));
      } else {
        setError(err.response?.data?.message || 'Error al guardar insumo o producto.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que desea eliminar este insumo o producto?')) return;
    try {
      await api.delete(`/api/v1/insumos/${id}`);
      fetchInsumos();
    } catch (err) {
      alert(err.response?.data?.message || 'No se pudo eliminar el insumo.');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Package size={24} color="#ec4899" />
              Inventario de Insumos y Medicamentos
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Filtros directos a `/api/v1/insumos` por categoría, rangos de stock y precios
            </p>
          </div>
          {canCreateOrEdit && (
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={18} />
              Nuevo Insumo
            </button>
          )}
        </div>

        {/* Panel de Filtros para Endpoint */}
        <div className="filter-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>
            <Filter size={16} /> Filtros de Inventario (API)
          </div>
          <div className="filter-grid">
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Producto</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nombre del fármaco..."
                value={filters.nombre}
                onChange={(e) => setFilters({ ...filters, nombre: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Tipo / Categoría</label>
              <select
                className="form-select"
                value={filters.tipo}
                onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
              >
                <option value="">Todas las categorías</option>
                <option value="Medicamento">Medicamento</option>
                <option value="Vacuna">Vacuna</option>
                <option value="Material Quirúrgico">Material Quirúrgico</option>
                <option value="Alimento">Alimento Especializado</option>
                <option value="Higiene / Cuidado">Higiene / Cuidado</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Stock Máximo</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ej. 10 (Crítico)"
                value={filters.stockMaximo}
                onChange={(e) => setFilters({ ...filters, stockMaximo: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Precio Mínimo ($)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Min..."
                value={filters.precioMin}
                onChange={(e) => setFilters({ ...filters, precioMin: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Precio Máximo ($)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Max..."
                value={filters.precioMax}
                onChange={(e) => setFilters({ ...filters, precioMax: e.target.value })}
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
          <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando inventario...</p>
        ) : insumos.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            No hay insumos que coincidan con los filtros seleccionados.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre del Producto</th>
                  <th>Tipo / Categoría</th>
                  <th>Stock Actual</th>
                  <th>Precio Unitario</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {insumos.map((i) => (
                  <tr key={i.id}>
                    <td data-label="ID" style={{ fontWeight: 600 }}>#{i.id}</td>
                    <td data-label="Nombre del Producto">
                      <strong style={{ color: '#0f172a' }}>{i.nombreProducto}</strong>
                    </td>
                    <td data-label="Categoría">
                      <span className="badge badge-secondary">{i.tipo}</span>
                    </td>
                    <td data-label="Stock Actual">
                      <span className={`badge ${i.stockActual <= 5 ? 'badge-danger' : i.stockActual <= 20 ? 'badge-warning' : 'badge-success'}`}>
                        {i.stockActual} unidades
                      </span>
                    </td>
                    <td data-label="Precio Unitario" style={{ fontWeight: 600 }}>
                      ${Number(i.precioUnitario).toLocaleString('es-CL', { minimumFractionDigits: 2 })}
                    </td>
                    <td data-label="Acciones" style={{ textAlign: 'right' }}>
                      {canCreateOrEdit && (
                        <button className="btn-icon" onClick={() => handleOpenModal(i)} title="Editar" aria-label="Editar insumo">
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn-icon danger" onClick={() => handleDelete(i.id)} title="Eliminar" aria-label="Eliminar insumo">
                          <Trash2 size={16} />
                        </button>
                      )}
                      {!canCreateOrEdit && !canDelete && (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Solo Lectura</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                {editingId ? 'Editar Insumo' : 'Registrar Nuevo Insumo / Fármaco'}
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
                  <label className="form-label">Nombre del Producto o Medicamento</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Amoxicilina 250mg, Jeringa 5ml, Vacuna Antirrábica"
                    required
                    value={formData.nombreProducto}
                    onChange={(e) => setFormData({ ...formData, nombreProducto: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo / Categoría</label>
                  <select
                    className="form-select"
                    required
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  >
                    <option value="Medicamento">Medicamento</option>
                    <option value="Vacuna">Vacuna</option>
                    <option value="Material Quirúrgico">Material Quirúrgico</option>
                    <option value="Alimento">Alimento Especializado</option>
                    <option value="Higiene / Cuidado">Higiene / Cuidado</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Stock Actual</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      required
                      value={formData.stockActual}
                      onChange={(e) => setFormData({ ...formData, stockActual: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Precio Unitario ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-input"
                      required
                      value={formData.precioUnitario}
                      onChange={(e) => setFormData({ ...formData, precioUnitario: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Actualizar Insumo' : 'Guardar Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
