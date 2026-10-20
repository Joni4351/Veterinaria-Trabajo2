import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { insumoSchema } from '../schemas/insumoSchema';
import { ConfirmModal } from '../components/ConfirmModal';
import { Package, Plus, Search, Edit2, Trash2, X, AlertCircle, Filter, RotateCcw } from 'lucide-react';

export const InsumosView = () => {
  const { hasRole, isAdmin } = useAuth();
  const canCreateOrEdit = hasRole(['Administrador', 'Veterinario']);
  const canDelete = isAdmin;

  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    id: null,
    nombre: '',
    loading: false
  });

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
      setError('Error al obtener lista de insumos.');
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
    setFieldErrors({});
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
    setFieldErrors({});

    // Validación Zod
    const result = insumoSchema.safeParse(formData);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      setError('Por favor corrija los errores en el formulario.');
      return;
    }

    const payload = {
      nombreProducto: result.data.nombreProducto,
      tipo: result.data.tipo,
      stockActual: result.data.stockActual,
      precioUnitario: result.data.precioUnitario
    };

    setSubmitting(true);
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
        setFieldErrors(err.response.data.errors);
        setError(Object.values(err.response.data.errors).flat().join(' '));
      } else {
        setError(err.response?.data?.message || 'Error al guardar insumo o producto.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestDelete = (insumo) => {
    setDeleteConfirm({
      isOpen: true,
      id: insumo.id,
      nombre: `${insumo.nombreProducto} (${insumo.tipo})`,
      loading: false
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleteConfirm((prev) => ({ ...prev, loading: true }));
    try {
      await api.delete(`/api/v1/insumos/${deleteConfirm.id}`);
      setDeleteConfirm({ isOpen: false, id: null, nombre: '', loading: false });
      fetchInsumos();
    } catch (err) {
      alert(err.response?.data?.message || 'No se pudo eliminar el insumo. Verifique si está asociado a recetas o atenciones clínicas.');
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Package size={24} color="#0f766e" />
              Gestión de Insumos y Medicamentos
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Control de inventario, stock y tarifas
            </p>
          </div>
          {canCreateOrEdit && (
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={18} />
              Nuevo Insumo
            </button>
          )}
        </div>

        {/* Panel de Filtros */}
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
                placeholder="Nombre del insumo..."
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
                <option value="">Todos los tipos</option>
                <option value="Medicamento">Medicamento</option>
                <option value="Vacuna">Vacuna</option>
                <option value="Material Quirúrgico">Material Quirúrgico</option>
                <option value="Alimento">Alimento Especializado</option>
                <option value="Higiene / Cuidado">Higiene / Cuidado</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Stock Mínimo</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ej. 5"
                value={filters.stockMinimo}
                onChange={(e) => setFilters({ ...filters, stockMinimo: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Precio Máximo</label>
              <input
                type="number"
                className="form-input"
                placeholder="Ej. 10000"
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
            No se encontraron insumos con los filtros seleccionados.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Producto / Insumo</th>
                  <th>Categoría</th>
                  <th>Stock Actual</th>
                  <th>Precio Unitario</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {insumos.map((i) => (
                  <tr key={i.id}>
                    <td data-label="Producto">
                      <strong style={{ color: '#0f172a' }}>{i.nombreProducto}</strong>
                    </td>
                    <td data-label="Categoría">
                      <span className="badge badge-secondary">{i.tipo}</span>
                    </td>
                    <td data-label="Stock">
                      <span style={{ 
                        fontWeight: 700, 
                        color: i.stockActual < 5 ? '#ef4444' : '#10b981',
                        backgroundColor: i.stockActual < 5 ? '#fef2f2' : '#ecfdf5',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}>
                        {i.stockActual} unidades {i.stockActual < 5 && '⚠️ (Bajo Stock)'}
                      </span>
                    </td>
                    <td data-label="Precio" style={{ fontWeight: 600, color: '#334155' }}>
                      ${Number(i.precioUnitario).toLocaleString('es-CL')}
                    </td>
                    <td data-label="Acciones" style={{ textAlign: 'right' }}>
                      {canCreateOrEdit ? (
                        <>
                          <button className="btn-icon" onClick={() => handleOpenModal(i)} title="Editar" aria-label={`Editar insumo ${i.nombreProducto}`}>
                            <Edit2 size={16} />
                          </button>
                          {canDelete && (
                            <button className="btn-icon danger" onClick={() => handleRequestDelete(i)} title="Eliminar" aria-label={`Eliminar insumo ${i.nombreProducto}`}>
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
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-insumo-title">
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="modal-insumo-title" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                {editingId ? 'Editar Insumo / Producto' : 'Registrar Nuevo Insumo'}
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
                  <label htmlFor="insumo-nombre" className="form-label">
                    Nombre del Producto o Medicamento <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="insumo-nombre"
                    type="text"
                    className={`form-input ${fieldErrors.nombreProducto ? 'border-danger' : ''}`}
                    placeholder="Ej. Amoxicilina 250mg, Jeringa 5ml, Vacuna Antirrábica"
                    value={formData.nombreProducto}
                    onChange={(e) => {
                      setFormData({ ...formData, nombreProducto: e.target.value });
                      if (fieldErrors.nombreProducto) setFieldErrors({ ...fieldErrors, nombreProducto: null });
                    }}
                    aria-invalid={!!fieldErrors.nombreProducto}
                    aria-describedby={fieldErrors.nombreProducto ? 'error-nombreProducto' : undefined}
                  />
                  {fieldErrors.nombreProducto && (
                    <span id="error-nombreProducto" className="form-error" role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                      {Array.isArray(fieldErrors.nombreProducto) ? fieldErrors.nombreProducto[0] : fieldErrors.nombreProducto}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="insumo-tipo" className="form-label">
                    Tipo / Categoría <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    id="insumo-tipo"
                    className="form-select"
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
                    <label htmlFor="insumo-stock" className="form-label">
                      Stock Actual <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      id="insumo-stock"
                      type="number"
                      min="0"
                      className={`form-input ${fieldErrors.stockActual ? 'border-danger' : ''}`}
                      value={formData.stockActual}
                      onChange={(e) => {
                        setFormData({ ...formData, stockActual: e.target.value });
                        if (fieldErrors.stockActual) setFieldErrors({ ...fieldErrors, stockActual: null });
                      }}
                      aria-invalid={!!fieldErrors.stockActual}
                      aria-describedby={fieldErrors.stockActual ? 'error-stockActual' : undefined}
                    />
                    {fieldErrors.stockActual && (
                      <span id="error-stockActual" className="form-error" role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                        {Array.isArray(fieldErrors.stockActual) ? fieldErrors.stockActual[0] : fieldErrors.stockActual}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="insumo-precio" className="form-label">
                      Precio Unitario ($) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      id="insumo-precio"
                      type="number"
                      step="0.01"
                      min="0.01"
                      className={`form-input ${fieldErrors.precioUnitario ? 'border-danger' : ''}`}
                      value={formData.precioUnitario}
                      onChange={(e) => {
                        setFormData({ ...formData, precioUnitario: e.target.value });
                        if (fieldErrors.precioUnitario) setFieldErrors({ ...fieldErrors, precioUnitario: null });
                      }}
                      aria-invalid={!!fieldErrors.precioUnitario}
                      aria-describedby={fieldErrors.precioUnitario ? 'error-precioUnitario' : undefined}
                    />
                    {fieldErrors.precioUnitario && (
                      <span id="error-precioUnitario" className="form-error" role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                        {Array.isArray(fieldErrors.precioUnitario) ? fieldErrors.precioUnitario[0] : fieldErrors.precioUnitario}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : (editingId ? 'Actualizar Insumo' : 'Guardar Insumo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ConfirmModal para eliminar insumo */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Confirmar Eliminación de Insumo"
        message={`¿Estás seguro de que deseas eliminar el producto o insumo "${deleteConfirm.nombre}"?`}
        confirmText="Eliminar Insumo"
        cancelText="Volver"
        isDangerous={true}
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, nombre: '', loading: false })}
      />
    </div>
  );
};
