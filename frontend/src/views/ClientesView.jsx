import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, Search, Edit2, Trash2, X, AlertCircle, Phone, Mail, Filter, RotateCcw } from 'lucide-react';

export const ClientesView = () => {
  const { hasRole, isAdmin } = useAuth();
  const canCreate = hasRole(['Administrador', 'Veterinario']);
  const canEditOrDelete = isAdmin;

  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

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
      setError('Error al cargar clientes');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        await api.put(`/api/v1/clientes/${editingId}`, formData);
      } else {
        await api.post('/api/v1/clientes', formData);
      }
      setIsModalOpen(false);
      fetchClientes();
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(Object.values(err.response.data.errors).flat().join(' '));
      } else {
        setError(err.response?.data?.message || 'Error al guardar los datos del cliente.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este cliente? Si tiene mascotas asociadas la BD podría impedirlo.')) return;
    try {
      await api.delete(`/api/v1/clientes/${id}`);
      fetchClientes();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar cliente. Verifique que no tenga mascotas o facturas registradas.');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Users size={24} color="#0f766e" />
              Gestión de Clientes (Dueños)
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.2rem' }}>
              Búsqueda y filtros directos a `/api/v1/clientes`
            </p>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>
            <Filter size={16} /> Filtros de Clientes (API)
          </div>
          <div className="filter-grid">
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>DNI / Documento</label>
              <input
                type="text"
                className="form-input"
                placeholder="Filtrar por documento..."
                value={filters.documento}
                onChange={(e) => setFilters({ ...filters, documento: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Nombre Completo</label>
              <input
                type="text"
                className="form-input"
                placeholder="Filtrar por nombre..."
                value={filters.nombre}
                onChange={(e) => setFilters({ ...filters, nombre: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Correo Electrónico</label>
              <input
                type="text"
                className="form-input"
                placeholder="Filtrar por email..."
                value={filters.email}
                onChange={(e) => setFilters({ ...filters, email: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Teléfono</label>
              <input
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
          <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando clientes...</p>
        ) : clientes.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            No se encontraron clientes con los filtros aplicados.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Documento</th>
                  <th>Nombre Completo</th>
                  <th>Teléfono</th>
                  <th>Correo Electrónico</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td data-label="ID" style={{ fontWeight: 600 }}>#{c.id}</td>
                    <td data-label="Documento">
                      <span className="badge badge-secondary">{c.documentoIdentidad}</span>
                    </td>
                    <td data-label="Nombre Completo">
                      <strong style={{ color: '#0f172a' }}>{c.nombreCompleto}</strong>
                    </td>
                    <td data-label="Teléfono">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#475569' }}>
                        <Phone size={14} />
                        {c.telefono || '—'}
                      </div>
                    </td>
                    <td data-label="Correo Electrónico">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#475569' }}>
                        <Mail size={14} />
                        {c.email || '—'}
                      </div>
                    </td>
                    <td data-label="Acciones" style={{ textAlign: 'right' }}>
                      {canEditOrDelete ? (
                        <>
                          <button className="btn-icon" onClick={() => handleOpenModal(c)} title="Editar" aria-label="Editar cliente">
                            <Edit2 size={16} />
                          </button>
                          <button className="btn-icon danger" onClick={() => handleDelete(c.id)} title="Eliminar" aria-label="Eliminar cliente">
                            <Trash2 size={16} />
                          </button>
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
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                {editingId ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
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
                  <label className="form-label">Documento de Identidad (DNI / RUT)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. 12345678-9"
                    required
                    maxLength={20}
                    value={formData.documentoIdentidad}
                    onChange={(e) => setFormData({ ...formData, documentoIdentidad: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nombre Completo</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. María González Silva"
                    required
                    minLength={3}
                    maxLength={100}
                    value={formData.nombreCompleto}
                    onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Teléfono de Contacto</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="Ej. +56912345678"
                      required
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Correo Electrónico</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="cliente@correo.com"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
