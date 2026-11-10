import { normalizeFieldErrors } from '../services/apiErrors';
import { AccessibleDialog } from "../components/AccessibleDialog";
import { AccessibleForm, RequiredIndicator } from "../components/AccessibleForm";
import { notifySuccess } from '../services/notifications';
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { clienteSchema, formatearRut } from '../schemas/clienteSchema';
import { ConfirmModal } from '../components/ConfirmModal';
import { Users, Plus, Search, Edit2, Trash2, X, AlertCircle, Phone, Mail, Filter, RotateCcw, ShieldCheck } from 'lucide-react';

export const ClientesView = () => {
  const { hasRole, isAdmin } = useAuth();
  const canCreate = hasRole(['Administrador', 'Veterinario']);
  const canEditOrDelete = isAdmin;

  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Modal de confirmación accesible para eliminación
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    id: null,
    nombre: '',
    loading: false
  });

  // Filtros de API
  const [filters, setFilters] = useState({
    documento: '',
    nombre: '',
    email: '',
    telefono: ''
  });

  const [formData, setFormData] = useState({
    documentoIdentidad: '',
    nombreCompleto: '',
    telefono: '',
    email: ''
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClientes();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.documento) params.documento = filters.documento;
      if (filters.nombre) params.nombre = filters.nombre;
      if (filters.email) params.email = filters.email;
      if (filters.telefono) params.telefono = filters.telefono;

      const res = await api.get('/api/v1/clientes', { params });
      setClientes(res.data || []);
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor para obtener clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      documento: '',
      nombre: '',
      email: '',
      telefono: ''
    });
  };

  const handleOpenModal = (cliente = null) => {
    setError('');
    setFieldErrors({});
    if (cliente) {
      setEditingId(cliente.id);
      setFormData({
        documentoIdentidad: cliente.documentoIdentidad,
        nombreCompleto: cliente.nombreCompleto,
        telefono: cliente.telefono || '',
        email: cliente.email || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        documentoIdentidad: '',
        nombreCompleto: '',
        telefono: '',
        email: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleRutChange = (e) => {
    const rawVal = e.target.value;
    setFormData((prev) => ({ ...prev, documentoIdentidad: rawVal }));
    if (fieldErrors.documentoIdentidad) {
      setFieldErrors((prev) => ({ ...prev, documentoIdentidad: null }));
    }
  };

  const handleRutBlur = () => {
    if (formData.documentoIdentidad) {
      const formateado = formatearRut(formData.documentoIdentidad);
      setFormData((prev) => ({ ...prev, documentoIdentidad: formateado }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // 1. Validación en cliente con Zod (incluyendo Módulo 11 en RUT)
    const result = clienteSchema.safeParse(formData);
    if (!result.success) {
      const formattedErrors = result.error.flatten().fieldErrors;
      setFieldErrors(formattedErrors);
      setError('Por favor corrija los errores marcados en el formulario antes de continuar.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/api/v1/clientes/${editingId}`, formData);
      } else {
        await api.post('/api/v1/clientes', formData);
      }
      notifySuccess(editingId ? 'Cliente actualizado correctamente.' : 'Cliente registrado correctamente.');
      setIsModalOpen(false);
      fetchClientes();
    } catch (err) {
      if (err.response?.data?.errors) {
        setFieldErrors(normalizeFieldErrors(err.response.data.errors));
        setError(Object.values(err.response.data.errors).flat().join(' '));
      } else {
        setError(err.userMessage || err.response?.data?.message || 'Error al guardar los datos del cliente en el servidor.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestDelete = (cliente) => {
    setDeleteConfirm({
      isOpen: true,
      id: cliente.id,
      nombre: `${cliente.nombreCompleto} (RUT: ${cliente.documentoIdentidad})`,
      loading: false
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleteConfirm((prev) => ({ ...prev, loading: true }));
    try {
      await api.delete(`/api/v1/clientes/${deleteConfirm.id}`);
      notifySuccess('Cliente eliminado correctamente.');
      setDeleteConfirm({ isOpen: false, id: null, nombre: '', loading: false });
      fetchClientes();
    } catch (err) {
      alert(err.userMessage || err.response?.data?.message || 'Error al eliminar cliente. Verifique que no tenga mascotas o facturas registradas.');
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Users size={24} color="var(--teal-text)" />
              Gestión de Clientes (Dueños de Pacientes)
            </h2>
            </div>
          {canCreate && (
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={18} />
              Nuevo Cliente
            </button>
          )}
        </div>

        {/* Panel de Filtros para Endpoint */}
        <div className="filter-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.88rem', color: 'var(--gray-700)' }}>
            <Filter size={16} /> Filtros de Clientes (API)
          </div>
          <div className="filter-grid">
            <div>
              <label htmlFor="clientes-field-0" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>RUT / Documento</label>
              <input id="clientes-field-0"
                type="text"
                className="form-input"
                placeholder="Filtrar por RUT..."
                value={filters.documento}
                onChange={(e) => setFilters({ ...filters, documento: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="clientes-field-1" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Nombre Completo</label>
              <input id="clientes-field-1"
                type="text"
                className="form-input"
                placeholder="Filtrar por nombre..."
                value={filters.nombre}
                onChange={(e) => setFilters({ ...filters, nombre: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="clientes-field-2" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Correo Electrónico</label>
              <input id="clientes-field-2"
                type="text"
                className="form-input"
                placeholder="Filtrar por email..."
                value={filters.email}
                onChange={(e) => setFilters({ ...filters, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="clientes-field-3" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Teléfono</label>
              <input id="clientes-field-3"
                type="text"
                className="form-input"
                placeholder="Filtrar por teléfono..."
                value={filters.telefono}
                onChange={(e) => setFilters({ ...filters, telefono: e.target.value })}
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
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>Cargando clientes...</p>
        ) : clientes.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>
            No se encontraron clientes con los filtros aplicados.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>RUT / Documento</th>
                  <th>Nombre Completo</th>
                  <th>Teléfono</th>
                  <th>Correo Electrónico</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td data-label="RUT">
                      <span className="badge badge-secondary" style={{ fontFamily: 'monospace', letterSpacing: '0.04em', fontWeight: 700, color: 'var(--teal-text)', background: 'var(--primary-border)' }}>
                        {c.documentoIdentidad}
                      </span>
                    </td>
                    <td data-label="Nombre Completo">
                      <strong style={{ color: 'var(--gray-900)' }}>{c.nombreCompleto}</strong>
                    </td>
                    <td data-label="Teléfono">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--gray-600)' }}>
                        <Phone size={14} />
                        {c.telefono || '—'}
                      </div>
                    </td>
                    <td data-label="Correo Electrónico">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--gray-600)' }}>
                        <Mail size={14} />
                        {c.email || '—'}
                      </div>
                    </td>
                    <td data-label="Acciones" style={{ textAlign: 'right' }}>
                      {canEditOrDelete ? (
                        <>
                          <button className="btn-icon" onClick={() => handleOpenModal(c)} title="Editar" aria-label={`Editar cliente ${c.nombreCompleto}`}>
                            <Edit2 size={16} />
                          </button>
                          <button className="btn-icon danger" onClick={() => handleRequestDelete(c)} title="Eliminar" aria-label={`Eliminar cliente ${c.nombreCompleto}`}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Solo Lectura</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Creación / Edición con Validación (Estructura de Tarjetas Visuales) */}
      {isModalOpen && (
        <AccessibleDialog className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-cliente-title" aria-label="Cliente" onClose={submitting ? undefined : () => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '580px', width: '95%', background: 'transparent', border: 'none', boxShadow: 'none' }}>
            {/* Tarjeta Visual Cabecera */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--gray-200)', borderRadius: '0.85rem', padding: '1.1rem 1.35rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: editingId ? 'var(--secondary-light)' : 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: editingId ? '#0284c7' : 'var(--success-text)', flexShrink: 0 }}>
                  <Users size={22} />
                </div>
                <div>
                  <h3 id="modal-cliente-title" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                    {editingId ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                    {editingId ? 'Actualice la información del cliente registrado' : 'Ingrese los datos personales y de contacto del cliente'}
                  </span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)} aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <AccessibleForm onSubmit={handleSubmit} noValidate>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--gray-200)', borderRadius: '0.85rem', padding: '1.25rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                {error && (
                  <div className="alert alert-danger" role="alert">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="cliente-documento" className="form-label">
                    RUT Chileno (con dígito verificador) <RequiredIndicator />
                  </label>
                  <input
                    id="cliente-documento"
                    type="text"
                    className={`form-input ${fieldErrors.documentoIdentidad ? 'border-danger' : ''}`}
                    placeholder="Ej. 12.345.678-5 o 12345678-K"
                    maxLength={20}
                    value={formData.documentoIdentidad}
                    onChange={handleRutChange}
                    onBlur={handleRutBlur}
                    aria-invalid={!!fieldErrors.documentoIdentidad}
                    aria-describedby={fieldErrors.documentoIdentidad ? 'error-documentoIdentidad' : 'hint-rut'} required
                  />
                  {fieldErrors.documentoIdentidad ? (
                    <span id="error-documentoIdentidad" className="form-error" role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                      {Array.isArray(fieldErrors.documentoIdentidad) ? fieldErrors.documentoIdentidad[0] : fieldErrors.documentoIdentidad}
                    </span>
                  ) : (
                    <small id="hint-rut" style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                      Validado matemáticamente con algoritmo Módulo 11 (acepta puntos y guion).
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="cliente-nombre" className="form-label">
                    Nombre Completo <RequiredIndicator />
                  </label>
                  <input
                    id="cliente-nombre"
                    type="text"
                    className={`form-input ${fieldErrors.nombreCompleto ? 'border-danger' : ''}`}
                    placeholder="Ej. María González Silva"
                    maxLength={100}
                    value={formData.nombreCompleto}
                    onChange={(e) => {
                      setFormData({ ...formData, nombreCompleto: e.target.value });
                      if (fieldErrors.nombreCompleto) setFieldErrors({ ...fieldErrors, nombreCompleto: null });
                    }}
                    aria-invalid={!!fieldErrors.nombreCompleto}
                    aria-describedby={fieldErrors.nombreCompleto ? 'error-nombreCompleto' : undefined} required
                  />
                  {fieldErrors.nombreCompleto && (
                    <span id="error-nombreCompleto" className="form-error" role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                      {Array.isArray(fieldErrors.nombreCompleto) ? fieldErrors.nombreCompleto[0] : fieldErrors.nombreCompleto}
                    </span>
                  )}
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="cliente-telefono" className="form-label">
                      Teléfono de Contacto <RequiredIndicator />
                    </label>
                    <input
                      id="cliente-telefono"
                      type="tel"
                      className={`form-input ${fieldErrors.telefono ? 'border-danger' : ''}`}
                      placeholder="Ej. +56912345678"
                      value={formData.telefono}
                      onChange={(e) => {
                        setFormData({ ...formData, telefono: e.target.value });
                        if (fieldErrors.telefono) setFieldErrors({ ...fieldErrors, telefono: null });
                      }}
                      aria-invalid={!!fieldErrors.telefono}
                      aria-describedby={fieldErrors.telefono ? 'error-telefono' : undefined} required
                    />
                    {fieldErrors.telefono && (
                      <span id="error-telefono" className="form-error" role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                        {Array.isArray(fieldErrors.telefono) ? fieldErrors.telefono[0] : fieldErrors.telefono}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="cliente-email" className="form-label">
                      Correo Electrónico <RequiredIndicator />
                    </label>
                    <input
                      id="cliente-email"
                      type="email"
                      className={`form-input ${fieldErrors.email ? 'border-danger' : ''}`}
                      placeholder="cliente@correo.com"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: null });
                      }}
                      aria-invalid={!!fieldErrors.email}
                      aria-describedby={fieldErrors.email ? 'error-email' : undefined} required
                    />
                    {fieldErrors.email && (
                      <span id="error-email" className="form-error" role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                        {Array.isArray(fieldErrors.email) ? fieldErrors.email[0] : fieldErrors.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pie de Acciones (Tarjeta Visual) */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--gray-200)', borderRadius: '0.85rem', padding: '0.9rem 1.35rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Registrar Cliente')}
                </button>
              </div>
            </AccessibleForm>
          </div>
        </AccessibleDialog>
      )}

      {/* Modal de confirmación accesible para eliminar cliente */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Confirmar Eliminación de Cliente"
        message={`¿Estás seguro de que deseas eliminar permanentemente al cliente "${deleteConfirm.nombre}"? Si posee mascotas o citas registradas, la base de datos protegerá la integridad relacional.`}
        confirmText="Eliminar Cliente"
        cancelText="Volver"
        isDangerous={true}
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, nombre: '', loading: false })}
      />
    </div>
  );
};
