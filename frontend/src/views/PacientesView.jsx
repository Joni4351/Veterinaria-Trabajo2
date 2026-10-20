import React, { useState, useEffect, useId } from 'react';
import pacientesService from '../services/pacientesService';
import clientesService from '../services/clientesService';
import { pacienteSchema } from '../schemas/pacienteSchema';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { 
  Dog, Plus, Search, Edit2, Trash2, Eye, X, AlertCircle, Filter, 
  RotateCcw, ChevronLeft, ChevronRight, User, Weight, Stethoscope 
} from 'lucide-react';

export const PacientesView = () => {
  const { hasRole, isAdmin } = useAuth();
  const canCreateOrEdit = typeof hasRole === 'function' ? hasRole(['Administrador', 'Veterinario']) : false;
  const canDelete = isAdmin || (typeof hasRole === 'function' && hasRole(['Administrador']));

  // Estados de datos
  const [pacientes, setPacientes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailPaciente, setDetailPaciente] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal de confirmación de eliminación
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, nombre: '', loading: false });

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Filtros de búsqueda (consumo de query params del backend)
  const [filters, setFilters] = useState({
    nombre: '',
    especie: '',
    raza: '',
    dueno: ''
  });

  // Estado del formulario
  const [formData, setFormData] = useState({
    clienteId: '',
    nombre: '',
    especie: 'Canino',
    raza: '',
    peso: '',
    alergias: ''
  });

  // Errores de validación en cliente (Zod) y servidor (400)
  const [fieldErrors, setFieldErrors] = useState({});
  const [formGlobalError, setFormGlobalError] = useState('');

  // Identificadores únicos de accesibilidad
  const formId = useId();

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPacientes();
      setCurrentPage(1); // Reiniciar a la primera página con nuevos filtros
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const fetchClientes = async () => {
    try {
      const data = await clientesService.getAll();
      setClientes(data || []);
    } catch (err) {
      console.error('Error al cargar clientes asociados:', err);
    }
  };

  const fetchPacientes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pacientesService.getAll(filters);
      setPacientes(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al conectar con el servidor para obtener los pacientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      nombre: '',
      especie: '',
      raza: '',
      dueno: ''
    });
  };

  // Abrir modal de creación / edición
  const handleOpenModal = (paciente = null) => {
    setFieldErrors({});
    setFormGlobalError('');
    if (paciente) {
      setEditingId(paciente.id);
      setFormData({
        clienteId: String(paciente.clienteId),
        nombre: paciente.nombre,
        especie: paciente.especie,
        raza: paciente.raza || '',
        peso: paciente.peso !== null && paciente.peso !== undefined ? String(paciente.peso) : '',
        alergias: paciente.alergias || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        clienteId: clientes[0]?.id ? String(clientes[0].id) : '',
        nombre: '',
        especie: 'Canino',
        raza: '',
        peso: '',
        alergias: ''
      });
    }
    setIsModalOpen(true);
  };

  // Abrir modal de detalle
  const handleViewDetail = (paciente) => {
    setDetailPaciente(paciente);
    setIsDetailOpen(true);
  };

  // Validación y envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setFormGlobalError('');

    // 1. Validación en el cliente con Zod
    const validationResult = pacienteSchema.safeParse(formData);
    if (!validationResult.success) {
      const formattedErrors = {};
      const issues = validationResult.error.issues || validationResult.error.errors || [];
      issues.forEach((err) => {
        const field = err.path[0];
        if (!formattedErrors[field]) {
          formattedErrors[field] = err.message;
        }
      });
      setFieldErrors(formattedErrors);
      setFormGlobalError('Por favor revise los campos con error antes de continuar.');
      return;
    }

    setSubmitting(true);
    const validData = validationResult.data;

    const payload = {
      clienteId: Number(validData.clienteId),
      nombre: validData.nombre,
      especie: validData.especie,
      raza: validData.raza || null,
      peso: validData.peso ? Number(validData.peso) : null,
      alergias: validData.alergias || null
    };

    try {
      if (editingId) {
        await pacientesService.update(editingId, payload);
      } else {
        await pacientesService.create(payload);
      }
      setIsModalOpen(false);
      fetchPacientes();
    } catch (err) {
      // 2. Mapeo de errores de validación devueltos por el backend (400 o 422)
      if (err.response?.data?.errors) {
        const serverErrors = {};
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          const lowerField = field.charAt(0).toLowerCase() + field.slice(1);
          serverErrors[lowerField] = Array.isArray(messages) ? messages[0] : String(messages);
        });
        setFieldErrors(serverErrors);
        setFormGlobalError('El servidor rechazó los datos ingresados debido a errores de validación.');
      } else {
        setFormGlobalError(err.response?.data?.message || 'Error al guardar el paciente. Verifique su conexión y permisos.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Solicitud de confirmación de eliminación
  const requestDelete = (paciente) => {
    setDeleteConfirm({
      isOpen: true,
      id: paciente.id,
      nombre: paciente.nombre,
      loading: false
    });
  };

  const handleConfirmDelete = async () => {
    setDeleteConfirm(prev => ({ ...prev, loading: true }));
    try {
      await pacientesService.delete(deleteConfirm.id);
      setDeleteConfirm({ isOpen: false, id: null, nombre: '', loading: false });
      fetchPacientes();
    } catch (err) {
      alert(err.response?.data?.message || 'No se pudo eliminar el paciente. Puede poseer citas o consultas asociadas.');
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
    }
  };

  // Cálculo de paginación en memoria sobre resultados filtrados
  const totalPages = Math.ceil(pacientes.length / pageSize) || 1;
  const paginatedPacientes = pacientes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <main role="main" aria-label="Gestión de Pacientes">
      <div className="card">
        {/* Encabezado semántico */}
        <header className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="card-title" style={{ fontSize: '1.4rem' }}>
              <Dog size={26} color="#0284c7" aria-hidden="true" />
              Gestión de Pacientes (Mascotas)
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.25rem' }}>
              Operación completa CRUD del recurso principal consumiendo `/api/v1/pacientes`
            </p>
          </div>
          {canCreateOrEdit && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleOpenModal()}
              style={{ minHeight: '44px', minWidth: '44px' }}
              aria-label="Registrar un nuevo paciente"
            >
              <Plus size={18} aria-hidden="true" />
              Nuevo Paciente
            </button>
          )}
        </header>

        {/* Panel de Filtros de Búsqueda */}
        <section className="filter-panel" aria-label="Filtros de búsqueda de pacientes">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>
            <Filter size={16} aria-hidden="true" />
            <span>Filtros de Búsqueda de Pacientes</span>
          </div>
          <div className="filter-grid">
            <div>
              <label htmlFor="filter-nombre" className="form-label" style={{ fontSize: '0.75rem' }}>Nombre</label>
              <input
                id="filter-nombre"
                type="text"
                className="form-input"
                placeholder="Buscar por nombre..."
                value={filters.nombre}
                onChange={(e) => setFilters({ ...filters, nombre: e.target.value })}
                style={{ minHeight: '44px' }}
              />
            </div>
            <div>
              <label htmlFor="filter-especie" className="form-label" style={{ fontSize: '0.75rem' }}>Especie</label>
              <select
                id="filter-especie"
                className="form-select"
                value={filters.especie}
                onChange={(e) => setFilters({ ...filters, especie: e.target.value })}
                style={{ minHeight: '44px' }}
              >
                <option value="">Todas las especies</option>
                <option value="Canino">Canino (Perro)</option>
                <option value="Felino">Felino (Gato)</option>
                <option value="Ave">Ave</option>
                <option value="Conejo">Conejo</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-raza" className="form-label" style={{ fontSize: '0.75rem' }}>Raza</label>
              <input
                id="filter-raza"
                type="text"
                className="form-input"
                placeholder="Buscar por raza..."
                value={filters.raza}
                onChange={(e) => setFilters({ ...filters, raza: e.target.value })}
                style={{ minHeight: '44px' }}
              />
            </div>
            <div>
              <label htmlFor="filter-dueno" className="form-label" style={{ fontSize: '0.75rem' }}>Dueño (Buscar por RUT o Nombre)</label>
              <input
                id="filter-dueno"
                type="text"
                className="form-input"
                placeholder="Buscar por RUT o Nombre de dueño..."
                value={filters.dueno}
                onChange={(e) => setFilters({ ...filters, dueno: e.target.value })}
                style={{ minHeight: '44px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', minHeight: '44px' }}
                onClick={handleResetFilters}
                aria-label="Restablecer todos los filtros de búsqueda"
              >
                <RotateCcw size={15} aria-hidden="true" /> Limpiar Filtros
              </button>
            </div>
          </div>
        </section>

        {/* 1. Estado de Carga (Loading State) */}
        {loading && (
          <LoadingSpinner message="Consultando catálogo de pacientes en el servidor..." />
        )}

        {/* 2. Estado de Error (Error State con opción de reintentar) */}
        {!loading && error && (
          <div
            role="alert"
            aria-live="assertive"
            className="alert alert-danger"
            style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={20} aria-hidden="true" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchPacientes}
              style={{ minHeight: '38px', fontSize: '0.82rem' }}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* 3. Estado Vacío (Empty State) */}
        {!loading && !error && pacientes.length === 0 && (
          <EmptyState
            icon={Dog}
            title="No se encontraron pacientes"
            description="No hay pacientes registrados que coincidan con los criterios de búsqueda aplicados."
            actionLabel={canCreateOrEdit ? "Registrar Primer Paciente" : undefined}
            onAction={canCreateOrEdit ? () => handleOpenModal() : undefined}
          />
        )}

        {/* 4. Estado con Datos: Tabla Accesible y Responsiva */}
        {!loading && !error && pacientes.length > 0 && (
          <>
            <div className="table-responsive">
              <table className="custom-table" aria-label="Listado de mascotas y pacientes">
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Especie</th>
                    <th scope="col">Raza</th>
                    <th scope="col">Peso</th>
                    <th scope="col">Dueño Responsable</th>
                    <th scope="col">Alergias</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPacientes.map((p) => {
                    const cliente = clientes.find(c => c.id === p.clienteId);
                    return (
                      <tr key={p.id}>
                        <td data-label="Nombre">
                          <strong style={{ color: '#0f172a' }}>{p.nombre}</strong>
                        </td>
                        <td data-label="Especie">
                          <span className="badge badge-primary">{p.especie}</span>
                        </td>
                        <td data-label="Raza">{p.raza || '—'}</td>
                        <td data-label="Peso">{p.peso ? `${p.peso} kg` : '—'}</td>
                        <td data-label="Dueño Responsable">
                          {cliente ? (
                            <div>
                              <strong style={{ color: '#0f172a' }}>{cliente.nombreCompleto}</strong>
                              <div style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 600 }}>RUT: {cliente.documentoIdentidad}</div>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Sin dueño asignado</span>
                          )}
                        </td>
                        <td data-label="Alergias">
                          {p.alergias ? (
                            <span className="badge badge-danger">{p.alergias}</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Ninguna</span>
                          )}
                        </td>
                        <td data-label="Acciones" style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            {/* Ver detalle */}
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => handleViewDetail(p)}
                              title={`Ver ficha clínica de ${p.nombre}`}
                              aria-label={`Ver ficha clínica de ${p.nombre}`}
                              style={{ minHeight: '44px', minWidth: '44px' }}
                            >
                              <Eye size={17} aria-hidden="true" />
                            </button>

                            {/* Editar */}
                            {canCreateOrEdit && (
                              <button
                                type="button"
                                className="btn-icon"
                                onClick={() => handleOpenModal(p)}
                                title={`Editar datos de ${p.nombre}`}
                                aria-label={`Editar datos de ${p.nombre}`}
                                style={{ minHeight: '44px', minWidth: '44px' }}
                              >
                                <Edit2 size={16} aria-hidden="true" />
                              </button>
                            )}

                            {/* Eliminar (Solo Admin) */}
                            {canDelete && (
                              <button
                                type="button"
                                className="btn-icon danger"
                                onClick={() => requestDelete(p)}
                                title={`Eliminar paciente ${p.nombre}`}
                                aria-label={`Eliminar paciente ${p.nombre}`}
                                style={{ minHeight: '44px', minWidth: '44px' }}
                              >
                                <Trash2 size={16} aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginador Accesible */}
            <nav
              aria-label="Navegación de páginas de pacientes"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 0.5rem 0.5rem',
                borderTop: '1px solid #e2e8f0',
                marginTop: '1rem',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Mostrando <strong>{paginatedPacientes.length}</strong> de <strong>{pacientes.length}</strong> pacientes (Página {currentPage} de {totalPages})
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  style={{ minHeight: '44px', minWidth: '44px', padding: '0 0.75rem' }}
                  aria-label="Página anterior de pacientes"
                >
                  <ChevronLeft size={16} aria-hidden="true" /> Anterior
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  style={{ minHeight: '44px', minWidth: '44px', padding: '0 0.75rem' }}
                  aria-label="Página siguiente de pacientes"
                >
                  Siguiente <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </nav>
          </>
        )}
      </div>

      {/* =========================================================================
          MODAL DETALLE DE PACIENTE (Lectura)
          ========================================================================= */}
      {isDetailOpen && detailPaciente && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDetailOpen(false);
          }}
        >
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-modal-title"
            style={{ maxWidth: '480px' }}
          >
            <div className="modal-header">
              <h2 id="detail-modal-title" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Dog size={22} color="#0284c7" aria-hidden="true" />
                Ficha Clínica: {detailPaciente.nombre}
              </h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsDetailOpen(false)}
                aria-label="Cerrar ficha del paciente"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="modal-body" style={{ lineHeight: 1.8 }}>
              <p><strong>Nombre del Paciente:</strong> {detailPaciente.nombre}</p>
              <p><strong>Especie:</strong> {detailPaciente.especie}</p>
              <p><strong>Raza:</strong> {detailPaciente.raza || 'No especificada'}</p>
              <p><strong>Peso Corporal:</strong> {detailPaciente.peso ? `${detailPaciente.peso} kg` : 'Sin registrar'}</p>
              <p>
                <strong>Dueño / Tutor:</strong>{' '}
                {(() => {
                  const cli = clientes.find(c => c.id === detailPaciente.clienteId);
                  return cli ? `${cli.nombreCompleto} (RUT: ${cli.documentoIdentidad})` : 'Sin dueño asignado';
                })()}
              </p>
              <p>
                <strong>Alergias o Observaciones:</strong>{' '}
                <span style={{ color: detailPaciente.alergias ? '#dc2626' : '#64748b' }}>
                  {detailPaciente.alergias || 'Sin alergias conocidas'}
                </span>
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsDetailOpen(false)}
                style={{ minHeight: '44px' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL CREAR / EDITAR PACIENTE (Formulario con validación Zod)
          ========================================================================= */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setIsModalOpen(false);
          }}
        >
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-modal-title"
          >
            <div className="modal-header">
              <h2 id="form-modal-title" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                {editingId ? `Editar Paciente: ${formData.nombre}` : 'Registrar Nuevo Paciente'}
              </h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
                aria-label="Cerrar formulario de paciente"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body">
                {formGlobalError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="alert alert-danger"
                    style={{ marginBottom: '1.25rem' }}
                  >
                    <AlertCircle size={18} aria-hidden="true" />
                    <span>{formGlobalError}</span>
                  </div>
                )}

                {/* Campo Dueño */}
                <div className="form-group">
                  <label htmlFor={`${formId}-clienteId`} className="form-label">
                    Dueño / Cliente Responsable <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    id={`${formId}-clienteId`}
                    className={`form-select ${fieldErrors.clienteId ? 'border-danger' : ''}`}
                    value={formData.clienteId}
                    onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                    aria-invalid={!!fieldErrors.clienteId}
                    aria-describedby={fieldErrors.clienteId ? `${formId}-clienteId-error` : undefined}
                    style={{ minHeight: '44px' }}
                    required
                  >
                    <option value="">Seleccione un cliente por RUT o Nombre...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombreCompleto} — RUT: {c.documentoIdentidad}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.clienteId && (
                    <span id={`${formId}-clienteId-error`} role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                      {fieldErrors.clienteId}
                    </span>
                  )}
                </div>

                <div className="form-grid">
                  {/* Campo Nombre */}
                  <div className="form-group">
                    <label htmlFor={`${formId}-nombre`} className="form-label">
                      Nombre del Paciente <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      id={`${formId}-nombre`}
                      type="text"
                      className={`form-input ${fieldErrors.nombre ? 'border-danger' : ''}`}
                      placeholder="Ej. Max, Luna, Toby"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      aria-invalid={!!fieldErrors.nombre}
                      aria-describedby={fieldErrors.nombre ? `${formId}-nombre-error` : undefined}
                      style={{ minHeight: '44px' }}
                      required
                    />
                    {fieldErrors.nombre && (
                      <span id={`${formId}-nombre-error`} role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                        {fieldErrors.nombre}
                      </span>
                    )}
                  </div>

                  {/* Campo Especie */}
                  <div className="form-group">
                    <label htmlFor={`${formId}-especie`} className="form-label">
                      Especie <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      id={`${formId}-especie`}
                      className={`form-select ${fieldErrors.especie ? 'border-danger' : ''}`}
                      value={formData.especie}
                      onChange={(e) => setFormData({ ...formData, especie: e.target.value })}
                      aria-invalid={!!fieldErrors.especie}
                      aria-describedby={fieldErrors.especie ? `${formId}-especie-error` : undefined}
                      style={{ minHeight: '44px' }}
                      required
                    >
                      <option value="Canino">Canino (Perro)</option>
                      <option value="Felino">Felino (Gato)</option>
                      <option value="Ave">Ave</option>
                      <option value="Conejo">Conejo</option>
                      <option value="Otro">Otro</option>
                    </select>
                    {fieldErrors.especie && (
                      <span id={`${formId}-especie-error`} role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                        {fieldErrors.especie}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-grid">
                  {/* Campo Raza */}
                  <div className="form-group">
                    <label htmlFor={`${formId}-raza`} className="form-label">Raza</label>
                    <input
                      id={`${formId}-raza`}
                      type="text"
                      className={`form-input ${fieldErrors.raza ? 'border-danger' : ''}`}
                      placeholder="Ej. Golden Retriever"
                      value={formData.raza}
                      onChange={(e) => setFormData({ ...formData, raza: e.target.value })}
                      aria-invalid={!!fieldErrors.raza}
                      aria-describedby={fieldErrors.raza ? `${formId}-raza-error` : undefined}
                      style={{ minHeight: '44px' }}
                    />
                    {fieldErrors.raza && (
                      <span id={`${formId}-raza-error`} role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                        {fieldErrors.raza}
                      </span>
                    )}
                  </div>

                  {/* Campo Peso */}
                  <div className="form-group">
                    <label htmlFor={`${formId}-peso`} className="form-label">Peso (kg)</label>
                    <input
                      id={`${formId}-peso`}
                      type="number"
                      step="0.1"
                      className={`form-input ${fieldErrors.peso ? 'border-danger' : ''}`}
                      placeholder="Ej. 12.5"
                      value={formData.peso}
                      onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
                      aria-invalid={!!fieldErrors.peso}
                      aria-describedby={fieldErrors.peso ? `${formId}-peso-error` : undefined}
                      style={{ minHeight: '44px' }}
                    />
                    {fieldErrors.peso && (
                      <span id={`${formId}-peso-error`} role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                        {fieldErrors.peso}
                      </span>
                    )}
                  </div>
                </div>

                {/* Campo Alergias */}
                <div className="form-group">
                  <label htmlFor={`${formId}-alergias`} className="form-label">Alergias o Condiciones Médicas</label>
                  <textarea
                    id={`${formId}-alergias`}
                    className={`form-textarea ${fieldErrors.alergias ? 'border-danger' : ''}`}
                    rows="3"
                    placeholder="Detalle alergias a medicamentos, alimentos, vacunas..."
                    value={formData.alergias}
                    onChange={(e) => setFormData({ ...formData, alergias: e.target.value })}
                    aria-invalid={!!fieldErrors.alergias}
                    aria-describedby={fieldErrors.alergias ? `${formId}-alergias-error` : undefined}
                  />
                  {fieldErrors.alergias && (
                    <span id={`${formId}-alergias-error`} role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                      {fieldErrors.alergias}
                    </span>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  style={{ minHeight: '44px', minWidth: '44px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ minHeight: '44px', minWidth: '44px' }}
                >
                  {submitting ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Registrar Paciente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal accesible de confirmación para eliminación */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="¿Eliminar paciente?"
        message={`¿Está seguro de que desea eliminar a "${deleteConfirm.nombre}"? Esta acción borrará el registro del paciente del sistema.`}
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        loading={deleteConfirm.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, nombre: '', loading: false })}
      />
    </main>
  );
};

export default PacientesView;
