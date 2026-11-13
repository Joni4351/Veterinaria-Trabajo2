import { TablePagination, pageRows } from '../components/TablePagination';
import { NumericInput } from '../components/NumericInput';
import { todayInChile } from '../schemas/dateValidation';
import './FacturasView.css';
import { normalizeFieldErrors } from '../services/apiErrors';
import { AccessibleDialog } from "../components/AccessibleDialog";
import { AccessibleForm, RequiredIndicator, SubmitButton } from "../components/AccessibleForm";
import { notifySuccess, notifyConflict } from '../services/notifications';
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DollarSign, Plus, Edit2, Trash2, X, AlertCircle, FileText, Filter, RotateCcw, CheckCircle2, ShoppingBag, Calendar, Minus } from 'lucide-react';
import { facturaSchema, detalleFacturaSchema } from '../schemas/facturaSchema';
import { ConfirmModal } from '../components/ConfirmModal';

export const FacturasView = () => {
  const { hasRole, isAdmin } = useAuth();
  const canCreateOrEdit = hasRole(['Administrador', 'Veterinario']);
  const canDelete = isAdmin;

  const [facturas, setFacturas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clientSearch, setClientSearch] = useState(null);
  const clientLabel = c => `${c.nombreCompleto} — RUT: ${c.documentoIdentidad}`;
  const normalizeClientSearch = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const matchesClient = c => {
    const text = normalizeClientSearch(clientSearch || '');
    const rut = text.replace(/[.\-\s]/g, '');
    return normalizeClientSearch(c.nombreCompleto || '').includes(text) ||
      (rut.length > 0 && normalizeClientSearch(c.documentoIdentidad || '').replace(/[.\-\s]/g, '').includes(rut));
  };
  const [consultas, setConsultas] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [detalles, setDetalles] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [citas, setCitas] = useState([]);
  const [itemsFactura, setItemsFactura] = useState([]);
  const [selectedCitaId, setSelectedCitaId] = useState('');
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [insumoCantidad, setInsumoCantidad] = useState(1);
  const [itemError, setItemError] = useState('');
  const [tablePage, setTablePage] = useState(1), [tableOrder, setTableOrder] = useState('asc');
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
  useEffect(() => setTablePage(1), [filters, searchRut]);


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
    fechaEmision: todayInChile(),
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
      const [cliRes, conRes, insRes, detRes, espRes, citRes] = await Promise.allSettled([
        api.get('/api/v1/clientes'),
        api.get('/api/v1/consultas'),
        api.get('/api/v1/insumos'),
        api.get('/api/v1/detallefac'),
        api.get('/api/v1/especialidades'),
        api.get('/api/v1/citas')
      ]);

      if (cliRes.status === 'fulfilled') setClientes(Array.isArray(cliRes.value.data) ? cliRes.value.data : []);
      if (conRes.status === 'fulfilled') setConsultas(Array.isArray(conRes.value.data) ? conRes.value.data : []);
      if (insRes.status === 'fulfilled') setInsumos(Array.isArray(insRes.value.data) ? insRes.value.data : []);
      if (detRes.status === 'fulfilled') setDetalles(Array.isArray(detRes.value.data) ? detRes.value.data : []);
      if (espRes.status === 'fulfilled') setEspecialidades(Array.isArray(espRes.value.data) ? espRes.value.data : []);
      if (citRes.status === 'fulfilled') setCitas(Array.isArray(citRes.value.data) ? citRes.value.data : []);
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
      setFacturas(Array.isArray(res.data) ? res.data : []);
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

  // Cálculo automático del IVA (19%) y redondeo en pesos chilenos (CLP)
  // Cita actualmente seleccionada en el detalle de la factura (máximo 1 cita por factura)
  const citaSeleccionada = useMemo(() => {
    if (!Array.isArray(itemsFactura)) return null;
    return itemsFactura.find(it => it.tipo === 'cita');
  }, [itemsFactura]);

  const tieneCitaSeleccionada = Boolean(citaSeleccionada);

  // Lista de citas médicas cargadas desde la agenda
  const citasDisponibles = useMemo(() => {
    if (!Array.isArray(citas)) return [];
    if (!formData.clienteId) return [];
    const cid = Number(formData.clienteId);
    return citas.filter(c => Number(c.paciente?.clienteId ?? c.paciente?.cliente?.id) === cid);
  }, [citas, formData.clienteId]);

  const calcularTotalesFactura = (items) => {
    const subtotalNeto = items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
    const iva = Math.round(subtotalNeto * 0.19);
    const total = subtotalNeto + iva;
    return { subtotalNeto, iva, total };
  };

  const handleOpenModal = (factura = null) => {
    setClientSearch(null);
    setError('');
    setFieldErrors({});
    setItemError('');
    setSelectedCitaId('');
    setSelectedInsumoId('');
    setInsumoCantidad(1);

    if (factura) {
      setEditingId(factura.id);
      setFormData({
        clienteId: String(factura.clienteId),
        fechaEmision: factura.fechaEmision,
        montoImpuestos: factura.montoImpuestos,
        montoTotal: factura.montoTotal
      });
      // Cargar líneas existentes para visualización
      const facDets = detalles.filter(d => d.facturaId === factura.id);
      const cargados = facDets.map(d => {
        const ins = insumos.find(i => i.id === d.insumoId);
        const con = consultas.find(c => c.id === d.consultaId);
        const cit = con?.citaId 
          ? citas.find(ci => ci.id === con.citaId) 
          : (con?.pacienteId ? citas.find(ci => ci.pacienteId === con.pacienteId) : null);

        let nombreConcepto = 'Atención Médica Clínica';
        if (ins) {
          nombreConcepto = ins.nombreProducto;
        } else if (cit) {
          const espNom = cit.especialidad?.nombre || 'Consulta General';
          nombreConcepto = `Cita #${cit.id} — ${cit.paciente?.nombre || 'Paciente'} (${espNom})`;
        } else if (con) {
          nombreConcepto = `Consulta: ${con.motivo}`;
        }

        return {
          id: `detalle-${d.id}`,
          tipo: ins ? 'insumo' : 'cita',
          insumoId: d.insumoId || null,
          consultaId: d.consultaId || null,
          citaId: cit?.id || null,
          especialidadId: cit?.especialidadId || null,
          nombre: nombreConcepto,
          precioUnitario: Number(d.subtotal),
          cantidad: 1,
          stockMax: ins ? ins.stockActual : 1,
          subtotal: Number(d.subtotal)
        };
      });
      setItemsFactura(cargados);

      // Reformular costo total e IVA al abrir la edición
      if (cargados.length > 0) {
        const { iva, total } = calcularTotalesFactura(cargados);
        setFormData(prev => ({ ...prev, montoImpuestos: iva, montoTotal: total }));
      }
    } else {
      setEditingId(null);
      setItemsFactura([]);
      setFormData({
        clienteId: '',
        fechaEmision: todayInChile(),
        montoImpuestos: 0,
        montoTotal: 0
      });
    }
    setIsModalOpen(true);
  };

  // Agregar la cita médica creada en la agenda (máximo 1 cita por factura; se bloquea tras seleccionarse)
  const handleAgregarCita = () => {
    setItemError('');
    if (!selectedCitaId) return;

    if (tieneCitaSeleccionada) {
      setItemError('Ya ha seleccionado una cita médica para esta factura. Debe eliminarla del detalle antes de seleccionar otra.');
      return;
    }

    const cita = citasDisponibles.find(c => c.id === Number(selectedCitaId));
    if (!cita) return;
    const consulta = consultas.find(c => Number(c.citaId) === Number(cita.id));
    if (!consulta) {
      setItemError('Esta cita no tiene una consulta médica registrada. Registre la consulta antes de agregar la atención a la factura.');
      return;
    }

    const precioCita = Number(cita.especialidad?.costoBase || 0);
    const nombrePaciente = cita.paciente?.nombre || 'Paciente';
    const espNombre = cita.especialidad?.nombre || 'Consulta General';
    const profesional = cita.usuario?.nombreCompleto || 'Profesional';
    const fechaHoraStr = cita.fechaHora ? new Date(cita.fechaHora).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    const nombreItem = `Cita #${cita.id} — ${nombrePaciente} (${espNombre}) con ${profesional} [${fechaHoraStr}]`;

    const nuevoItem = {
      id: `cita-${cita.id}`,
      tipo: 'cita',
      citaId: cita.id,
      especialidadId: cita.especialidadId || null,
      consultaId: consulta.id,
      nombre: nombreItem,
      precioUnitario: precioCita,
      cantidad: 1,
      stockMax: 1,
      subtotal: precioCita
    };

    const updated = [...itemsFactura, nuevoItem];
    setItemsFactura(updated);
    setSelectedCitaId('');

    // Reformular IVA (19%) y total automáticamente
    const { iva, total } = calcularTotalesFactura(updated);
    setFormData(prev => ({ ...prev, montoImpuestos: iva, montoTotal: total }));
    if (fieldErrors.montoTotal) setFieldErrors(prev => ({ ...prev, montoTotal: null }));
  };

  // Agregar insumo validando stock disponible y recalculando IVA
  const handleAgregarInsumo = () => {
    setItemError('');
    if (!selectedInsumoId) return;

    const ins = insumos.find(i => i.id === Number(selectedInsumoId));
    if (!ins) return;

    const cant = Number(insumoCantidad);
    if (!Number.isInteger(cant) || cant <= 0) {
      setItemError('La cantidad del insumo debe ser un número entero mayor a cero.');
      return;
    }

    const existingIndex = itemsFactura.findIndex(it => it.tipo === 'insumo' && it.insumoId === ins.id);
    const cantActual = existingIndex >= 0 ? itemsFactura[existingIndex].cantidad : 0;
    const cantTotal = cantActual + cant;

    if (cantTotal > ins.stockActual) {
      setItemError(`Stock insuficiente para '${ins.nombreProducto}'. Disponible: ${ins.stockActual}, en factura: ${cantActual}, solicitado: ${cant}.`);
      return;
    }

    let updated = [];
    if (existingIndex >= 0) {
      updated = itemsFactura.map((it, idx) => {
        if (idx === existingIndex) {
          const nuevaCant = it.cantidad + cant;
          return {
            ...it,
            cantidad: nuevaCant,
            subtotal: nuevaCant * it.precioUnitario
          };
        }
        return it;
      });
    } else {
      const nuevo = {
        id: `insumo-${ins.id}`,
        tipo: 'insumo',
        insumoId: ins.id,
        nombre: ins.nombreProducto,
        precioUnitario: Number(ins.precioUnitario),
        cantidad: cant,
        stockMax: ins.stockActual,
        subtotal: cant * Number(ins.precioUnitario)
      };
      updated = [...itemsFactura, nuevo];
    }

    setItemsFactura(updated);
    setSelectedInsumoId('');
    setInsumoCantidad(1);

    const { iva, total } = calcularTotalesFactura(updated);
    setFormData(prev => ({ ...prev, montoImpuestos: iva, montoTotal: total }));
    if (fieldErrors.montoTotal) setFieldErrors(prev => ({ ...prev, montoTotal: null }));
  };

  // Modificar cantidad de insumo en la tabla
  const handleModificarCantidad = (itemId, nuevaCantidad) => {
    setItemError('');
    const cant = Number(nuevaCantidad);
    if (!Number.isInteger(cant) || cant <= 0) return;

    const item = itemsFactura.find(it => it.id === itemId);
    if (!item) return;

    const ins = insumos.find(i => i.id === item.insumoId);
    const stockMax = ins ? ins.stockActual : item.stockMax;

    if (cant > stockMax) {
      setItemError(`No es posible asignar ${cant} unidades. Stock disponible: ${stockMax}.`);
      return;
    }

    const updated = itemsFactura.map(it => {
      if (it.id === itemId) {
        return {
          ...it,
          cantidad: cant,
          subtotal: cant * it.precioUnitario
        };
      }
      return it;
    });

    setItemsFactura(updated);
    const { iva, total } = calcularTotalesFactura(updated);
    setFormData(prev => ({ ...prev, montoImpuestos: iva, montoTotal: total }));
  };

  // Eliminar ítem de la factura (liberando la opción para volver a seleccionarse)
  const handleEliminarItem = (itemId) => {
    setItemError('');
    const updated = itemsFactura.filter(it => it.id !== itemId);
    setItemsFactura(updated);

    const { iva, total } = calcularTotalesFactura(updated);
    setFormData(prev => ({ ...prev, montoImpuestos: iva, montoTotal: total }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setItemError('');

    const validation = facturaSchema.safeParse(formData);
    const missingItems = !editingId && itemsFactura.length === 0;
    const pendingSelection = selectedCitaId || selectedInsumoId;
    if (!validation.success || missingItems || pendingSelection) {
      const errors = {};
      validation.error?.issues.forEach((err) => {
        if (err.path[0]) errors[err.path[0]] = err.message;
      });
      setFieldErrors(errors);
      setError('Complete o corrija los datos indicados antes de guardar la factura.');
      if (missingItems) setItemError('Debe agregar al menos una cita médica o un insumo al detalle. Seleccionarlo no basta: pulse «Agregar Cita» o «Agregar Insumo».');
      if (pendingSelection) setItemError('Tiene una cita o un insumo seleccionado sin agregar al detalle. Pulse «Agregar Cita» o «Agregar Insumo», o quite la selección antes de emitir.');
      return;
    }

    const payload = {
      clienteId: validation.data.clienteId,
      fechaEmision: validation.data.fechaEmision,
      montoImpuestos: validation.data.montoImpuestos,
      montoTotal: validation.data.montoTotal,
      items: itemsFactura.map(it => ({
        tipo: it.tipo,
        citaId: it.citaId || null,
        especialidadId: it.especialidadId || null,
        insumoId: it.insumoId || null,
        consultaId: it.consultaId || null,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
        subtotal: it.subtotal
      }))
    };

    try {
      if (editingId) {
        await api.put(`/api/v1/facturas/${editingId}`, payload);
      } else {
        await api.post('/api/v1/facturas', payload);
      }
      notifySuccess(editingId ? 'Factura actualizada correctamente.' : 'Factura registrada correctamente.');
      setIsModalOpen(false);
      fetchFacturas();
      fetchAuxiliares(); // Refresca stock de inventario descontado
    } catch (err) {
      if (err.response?.data?.errors) {
        setFieldErrors(normalizeFieldErrors(err.response.data.errors));
        setError(Object.values(err.response.data.errors).flat().join(' '));
      } else {
        setError(err.userMessage || err.response?.data?.message || 'Error al procesar la factura.');
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
      notifySuccess('Factura eliminada correctamente.');
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
      fetchFacturas();
    } catch (err) {
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
      notifyConflict(err.userMessage || err.response?.data?.message || 'Error al eliminar factura.');
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
      validation.error.issues.forEach((err) => {
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
      notifySuccess('Detalle de factura registrado correctamente.');
      const res = await api.get('/api/v1/detallefac', { params: { facturaId: selectedFactura.id } });
      setDetalles(res.data || []);
    } catch (err) {
      if (err.response?.data?.errors) {
        setDetalleFieldErrors(normalizeFieldErrors(err.response.data.errors));
        setDetalleError(Object.values(err.response.data.errors).flat().join(' '));
      } else {
        setDetalleError(err.userMessage || err.response?.data?.message || 'Error al agregar ítem a la factura.');
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
      notifySuccess('Detalle de factura eliminado correctamente.');
      const res = await api.get('/api/v1/detallefac', { params: { facturaId: selectedFactura.id } });
      setDetalles(res.data || []);
      setDeleteDetalleConfirm({ isOpen: false, id: null, loading: false });
    } catch (err) {
      setDeleteDetalleConfirm(prev => ({ ...prev, loading: false }));
      notifyConflict(err.userMessage || err.response?.data?.message || 'No se pudo eliminar la línea de factura.');
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
            <h1 className="card-title">
              <DollarSign size={24} color="#10b981" />
              Gestión de Facturación y Cobros
            </h1>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.88rem', color: 'var(--gray-700)' }}>
            <Filter size={16} /> Filtros de Facturas (API)
          </div>
          <div className="filter-grid">
            <div>
              <label htmlFor="facturas-field-0" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Dueño / Cliente (Buscar por RUT o Nombre)</label>
              <input id="facturas-field-0"
                type="text"
                className="form-input"
                placeholder="RUT o Nombre del cliente..."
                value={searchRut}
                onChange={(e) => setSearchRut(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="facturas-field-1" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Cliente</label>
              <select id="facturas-field-1"
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
              <label htmlFor="facturas-field-2" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Desde Fecha</label>
              <input id="facturas-field-2"
                type="date"
                className="form-input"
                value={filters.fechaDesde}
                onChange={(e) => setFilters({ ...filters, fechaDesde: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="facturas-field-3" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Hasta Fecha</label>
              <input id="facturas-field-3"
                type="date"
                className="form-input"
                value={filters.fechaHasta}
                onChange={(e) => setFilters({ ...filters, fechaHasta: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="facturas-field-4" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Monto Min ($)</label>
              <NumericInput id="facturas-field-4" allowDecimal
                type="number"
                className="form-input"
                placeholder="0"
                value={filters.montoMin}
                onChange={(e) => setFilters({ ...filters, montoMin: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="facturas-field-5" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>Monto Max ($)</label>
              <NumericInput id="facturas-field-5" allowDecimal
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
            const cliente = (clientes || []).find(c => Number(c.id) === Number(f.clienteId));
            const nombre = cliente?.nombreCompleto?.toLowerCase() || '';
            const rut = cliente?.documentoIdentidad?.toLowerCase() || '';
            return nombre.includes(term) || rut.includes(term);
          });

          if (loading) {
            return (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-500)' }}>
                Cargando facturas...
              </div>
            );
          }
          if (displayedFacturas.length === 0) {
            return (
              <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
                No hay facturas registradas con los filtros seleccionados.
              </p>
            );
          }
          return (
            <div className="table-responsive" tabIndex={0} role="region" aria-label="Tabla de registros">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th scope="col">Cliente / Dueño</th>
                    <th scope="col">RUT / Documento</th>
                    <th scope="col">Fecha Emisión</th>
                    <th scope="col">Impuestos</th>
                    <th scope="col">Total Facturado</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows(displayedFacturas, tablePage, tableOrder).map((f) => {
                    const cliente = clientes.find(c => c.id === f.clienteId);
                    return (
                      <tr key={f.id}>
                        <td data-label="Cliente">
                          <strong style={{ color: 'var(--gray-900)' }}>{cliente ? cliente.nombreCompleto : 'Cliente'}</strong>
                        </td>
                        <td data-label="RUT">
                          <span className="badge badge-secondary" style={{ fontFamily: 'monospace', letterSpacing: '0.04em', fontWeight: 700, color: 'var(--teal-text)', background: 'var(--primary-border)' }}>
                            {cliente?.documentoIdentidad || '—'}
                          </span>
                        </td>
                        <td data-label="Fecha Emisión">{typeof f.fechaEmision === 'string' ? f.fechaEmision : (f.fechaEmision ? String(f.fechaEmision) : '—')}</td>
                        <td data-label="Impuestos">${Number(f.montoImpuestos || 0).toFixed(2)}</td>
                        <td data-label="Total">
                          <strong style={{ color: 'var(--success-text)', fontSize: '1rem' }}>
                            ${Number(f.montoTotal || 0).toFixed(2)}
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
                            <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Solo Lectura</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
<TablePagination total={displayedFacturas.length} page={tablePage} order={tableOrder} onPage={setTablePage} onOrder={setTableOrder} />
            </div>
          );
        })()}
      </div>

      {/* Modal Facturación Unificada y Detallada */}
      {isModalOpen && (() => {
        const { subtotalNeto, iva, total } = calcularTotalesFactura(itemsFactura);
        const selectedInsumo = insumos.find(i => i.id === Number(selectedInsumoId));

        return createPortal(
          <AccessibleDialog className="modal-overlay invoice-overlay" aria-label="Factura" onClose={() => setIsModalOpen(false)}>
            <div className="modal-content invoice-dialog">
              {/* Tarjeta Visual Cabecera */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--gray-200)', borderRadius: '0.85rem', padding: '1.1rem 1.35rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: editingId ? 'var(--secondary-light)' : 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: editingId ? '#0284c7' : 'var(--success-text)', flexShrink: 0 }}>
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                      {editingId ? 'Editar Factura' : 'Emitir Factura de Atención y Cobro'}
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                      Cálculo automático de IVA (19%), desglose de servicios e insumos con control de inventario
                    </span>
                  </div>
                </div>
                <button className="btn-icon" onClick={() => setIsModalOpen(false)} aria-label="Cerrar modal">
                  <X size={20} />
                </button>
              </div>

              <AccessibleForm className="invoice-form" onSubmit={handleSubmit} noValidate>
                <div className="modal-body invoice-body">
                  {error && (
                    <div className="alert alert-danger" role="alert" style={{ marginBottom: '0.85rem' }}>
                      <AlertCircle size={18} />
                      <span>{error}</span>
                    </div>
                  )}

                  {itemError && (
                    <div className="alert alert-danger" role="alert" style={{ marginBottom: '0.85rem' }}>
                      <AlertCircle size={18} />
                      <span>{itemError}</span>
                    </div>
                  )}

                  {/* 1. Datos Generales de la Factura (Tarjeta Visual) */}
                  <div className="invoice-columns">
                  <div className="invoice-column">
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--gray-200)', borderRadius: '0.85rem', padding: '1.1rem 1.35rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <FileText size={18} color="var(--teal-text)" />
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--gray-800)', margin: 0 }}>
                        1. Información Principal del Cliente y Fecha
                      </h3>
                    </div>

                    <div className="form-grid">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor="factura-cliente" style={{ fontWeight: 600, color: 'var(--gray-800)' }}>
                          Cliente Facturado <RequiredIndicator /></label>
                        <input
                          id="factura-cliente"
                          type="search"
                          autoComplete="off"
                          placeholder="Buscar por nombre o RUT..."
                          className={`form-input ${fieldErrors.clienteId ? 'border-red-500' : ''}`}
                          value={clientSearch ?? (clientes.find(c => String(c.id) === formData.clienteId) ? clientLabel(clientes.find(c => String(c.id) === formData.clienteId)) : '')}
                          onKeyDown={e => { if (e.key === 'Escape' && clientSearch?.trim()) { e.stopPropagation(); setClientSearch(null); } }}
                          onChange={(e) => {
                            setClientSearch(e.target.value);
                            setSelectedCitaId('');
                            setFormData(prev => ({ ...prev, clienteId: '' }));
                            if (fieldErrors.clienteId) setFieldErrors(prev => ({ ...prev, clienteId: null }));
                          }}
                          aria-invalid={!!fieldErrors.clienteId}
                          aria-describedby={fieldErrors.clienteId ? 'factura-cliente-error' : undefined} required
                        />
                        {clientSearch?.trim() && <div role="group" aria-label="Resultados de clientes" style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                          {clientes.filter(matchesClient).map(c => (
                            <button key={c.id} type="button" className="form-input" style={{ textAlign: 'left', cursor: 'pointer', whiteSpace: 'normal', height: 'auto' }}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, clienteId: String(c.id) }));
                                setClientSearch(null);
                                setSelectedCitaId('');
                                setFieldErrors(prev => ({ ...prev, clienteId: null }));
                              }}>{clientLabel(c)}</button>
                          ))}
                          {!clientes.some(matchesClient) && <p role="status">No se encontraron clientes.</p>}
                        </div>}
                        {fieldErrors.clienteId && (
                          <span id="factura-cliente-error" role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                            {fieldErrors.clienteId}
                          </span>
                        )}
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor="factura-fecha" style={{ fontWeight: 600, color: 'var(--gray-800)' }}>
                          Fecha de Emisión <RequiredIndicator /></label>
                        <input
                          id="factura-fecha"
                          type="date"
                          className={`form-input ${fieldErrors.fechaEmision ? 'border-red-500' : ''}`}
                          value={formData.fechaEmision} min={todayInChile()} max={todayInChile()}
                          onChange={(e) => {
                            setFormData({ ...formData, fechaEmision: e.target.value });
                            if (fieldErrors.fechaEmision) setFieldErrors(prev => ({ ...prev, fechaEmision: null }));
                          }}
                          aria-invalid={!!fieldErrors.fechaEmision}
                          aria-describedby={fieldErrors.fechaEmision ? 'factura-fecha-error' : undefined} required
                        />
                        {fieldErrors.fechaEmision && (
                          <span id="factura-fecha-error" role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                            {fieldErrors.fechaEmision}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Sección: Selección de Cita Médica de la Agenda (Tarjeta Visual) */}
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--info-border)', borderRadius: '0.85rem', padding: '1.1rem 1.35rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                      <Calendar size={18} color="var(--blue-text)" />
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--gray-800)', margin: 0 }}>
                        2. Selección de Cita Médica Registrada (Agenda de Citas)
                      </h3>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '0.75rem' }}>
                      Seleccione una cita previamente agendada en el sistema. Una vez seleccionada, no podrá seleccionar otra hasta que la quite del detalle.
                    </p>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <select
                        id="select-tipo-cita" aria-label="Cita médica para agregar a la factura"
                        className="form-select"
                        value={selectedCitaId}
                        disabled={tieneCitaSeleccionada}
                        onChange={(e) => {
                          setSelectedCitaId(e.target.value);
                          setItemError('');
                        }}
                        style={{ flex: 1, backgroundColor: tieneCitaSeleccionada ? 'var(--gray-100)' : 'var(--bg-surface)', cursor: tieneCitaSeleccionada ? 'not-allowed' : 'default' }}
                      >
                        <option value="">
                          {tieneCitaSeleccionada 
                            ? 'Cita ya asociada a esta factura (bloqueado)' 
                            : (!formData.clienteId ? 'Seleccione primero un cliente' : citasDisponibles.length === 0 ? 'Este cliente no tiene citas registradas' : 'Seleccione cita médica de la agenda...')}
                        </option>
                        {citasDisponibles.map(c => {
                          const dueno = c.paciente?.cliente?.nombreCompleto || 'Dueño';
                          const rut = c.paciente?.cliente?.documentoIdentidad ? ` (${c.paciente.cliente.documentoIdentidad})` : '';
                          const pac = `${c.paciente?.nombre || 'Paciente'} (${c.paciente?.especie || 'Mascota'})`;
                          const esp = c.especialidad?.nombre || 'Consulta General';
                          const costo = Number(c.especialidad?.costoBase || 0).toLocaleString('es-CL');
                          const fecha = c.fechaHora ? new Date(c.fechaHora).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
                          return (
                            <option key={c.id} value={c.id}>
                              Cita #{c.id}: {pac} — {dueno}{rut} — {esp} (${costo}) — {fecha} [{c.estado}]{!consultas.some(con => Number(con.citaId) === Number(c.id)) ? ' — Sin consulta registrada' : ''}
                            </option>
                          );
                        })}
                      </select>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleAgregarCita}
                        disabled={tieneCitaSeleccionada || !selectedCitaId}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', cursor: (tieneCitaSeleccionada || !selectedCitaId) ? 'not-allowed' : 'pointer' }}
                      >
                        <Plus size={16} /> Agregar Cita
                      </button>
                    </div>

                    {tieneCitaSeleccionada && (
                      <div style={{ marginTop: '0.6rem', padding: '0.5rem 0.75rem', background: 'var(--secondary-light)', border: '1px solid #bfdbfe', borderRadius: '0.375rem', fontSize: '0.8rem', color: 'var(--blue-text)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <AlertCircle size={15} />
                        <span>
                          Ya se ha seleccionado una cita médica para esta factura. Para seleccionar una cita diferente, quítela primero de la tabla de detalle.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 3. Sección: Incorporación de Insumos del Inventario (Tarjeta Visual) */}
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid #bbf7d0', borderRadius: '0.85rem', padding: '1.1rem 1.35rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                      <ShoppingBag size={18} color="#10b981" />
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--gray-800)', margin: 0 }}>
                        3. Insumos y Medicamentos del Inventario
                      </h3>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '0.75rem' }}>
                      Seleccione insumos con stock disponible. Al confirmar la factura, se descontarán automáticamente del inventario.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 130px auto', gap: '0.75rem', alignItems: 'end' }}>
                      <div>
                        <label htmlFor="select-insumo" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                          Insumo disponible
                        </label>
                        <select
                          id="select-insumo"
                          className="form-select"
                          value={selectedInsumoId}
                          onChange={(e) => {
                            setSelectedInsumoId(e.target.value);
                            setInsumoCantidad(1);
                            setItemError('');
                          }}
                        >
                          <option value="">Seleccione insumo o medicamento...</option>
                          {insumos.map(i => (
                            <option key={i.id} value={i.id} disabled={i.stockActual <= 0}>
                              {i.nombreProducto} ({i.tipo}) — Stock: {i.stockActual} — ${Number(i.precioUnitario).toLocaleString('es-CL')} {i.stockActual <= 0 ? '(Agotado)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="facturas-field-6" style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                          Cantidad {selectedInsumo ? `(Máx: ${selectedInsumo.stockActual})` : ''}
                        </label>
                        <NumericInput id="facturas-field-6"
                          type="number"
                          min="1"
                          max={selectedInsumo?.stockActual || 999}
                          className="form-input"
                          value={insumoCantidad}
                          onChange={(e) => {
                            setInsumoCantidad(Math.max(1, parseInt(e.target.value) || 1));
                            setItemError('');
                          }}
                          disabled={!selectedInsumoId}
                        />
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleAgregarInsumo}
                        disabled={!selectedInsumoId || insumoCantidad <= 0 || (selectedInsumo && insumoCantidad > selectedInsumo.stockActual)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
                      >
                        <Plus size={16} /> Agregar Insumo
                      </button>
                    </div>

                    {selectedInsumo && insumoCantidad > selectedInsumo.stockActual && (
                      <span role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.78rem', marginTop: '0.4rem', display: 'block', fontWeight: 600 }}>
                        Stock insuficiente. Solo quedan {selectedInsumo.stockActual} unidades disponibles en inventario.
                      </span>
                    )}
                  </div>

                  {/* 4. Tabla Detallada de Conceptos Seleccionados (Tarjeta Visual) */}
                  </div>
                  <div className="invoice-column">
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--gray-200)', borderRadius: '0.85rem', padding: '1.1rem 1.35rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={18} color="#6366f1" />
                        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--gray-800)', margin: 0 }}>
                          4. Detalle de Conceptos Facturados ({itemsFactura.length})
                        </h3>
                      </div>
                      {itemsFactura.length > 0 && (
                        <span style={{ fontSize: '0.82rem', color: 'var(--teal-text)', fontWeight: 700, background: 'var(--primary-light)', border: '1px solid var(--primary-border)', padding: '0.25rem 0.65rem', borderRadius: '9999px' }}>
                          Subtotal Neto: ${Number(subtotalNeto).toLocaleString('es-CL')} CLP
                        </span>
                      )}
                    </div>

                    {itemsFactura.length === 0 ? (
                      <div style={{ background: 'var(--gray-50)', border: '1px dashed var(--gray-300)', borderRadius: '0.5rem', padding: '1.5rem', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.88rem' }}>
                        No ha seleccionado citas ni insumos todavía. Utilice las secciones de selección para incorporar conceptos a la factura.
                      </div>
                    ) : (
                      <div className="table-responsive" style={{ border: '1px solid var(--gray-200)', borderRadius: '0.5rem', overflowX: 'auto' }}>
                        <table className="custom-table" style={{ margin: 0 }}>
                          <thead style={{ background: 'var(--gray-100)' }}>
                            <tr>
                              <th scope="col">Tipo</th>
                              <th scope="col">Descripción / Concepto</th>
                              <th scope="col" style={{ textAlign: 'center' }}>Cantidad</th>
                              <th scope="col" style={{ textAlign: 'right' }}>Precio Unit.</th>
                              <th scope="col" style={{ textAlign: 'right' }}>Subtotal Neto</th>
                              <th scope="col" style={{ textAlign: 'center', width: '60px' }}>Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itemsFactura.map((it) => (
                              <tr key={it.id}>
                                <td data-label="Tipo">
                                  {it.tipo === 'cita' ? (
                                    <span style={{ background: 'var(--secondary-light)', color: 'var(--blue-text)', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                      Cita Médica
                                    </span>
                                  ) : (
                                    <span style={{ background: 'var(--success-light)', color: 'var(--success-text)', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                      Insumo / Fármaco
                                    </span>
                                  )}
                                </td>
                                <td data-label="Descripción">
                                  <strong style={{ color: 'var(--gray-900)' }}>{it.nombre}</strong>
                                </td>
                                <td data-label="Cantidad" style={{ textAlign: 'center' }}>
                                  {it.tipo === 'insumo' ? (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                      <button
                                        type="button"
                                        className="btn-icon"
                                        style={{ width: '24px', height: '24px', padding: 0 }}
                                        onClick={() => handleModificarCantidad(it.id, it.cantidad - 1)}
                                        disabled={it.cantidad <= 1}
                                        title="Reducir cantidad"
                                      >
                                        <Minus size={12} />
                                      </button>
                                      <NumericInput
                                        type="number"
                                        min="1"
                                        max={it.stockMax}
                                        value={it.cantidad}
                                        onChange={(e) => handleModificarCantidad(it.id, e.target.value)}
                                        style={{ width: '50px', textAlign: 'center', padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--gray-300)' }}
                                      />
                                      <button
                                        type="button"
                                        className="btn-icon"
                                        style={{ width: '24px', height: '24px', padding: 0 }}
                                        onClick={() => handleModificarCantidad(it.id, it.cantidad + 1)}
                                        disabled={it.cantidad >= it.stockMax}
                                        title="Aumentar cantidad"
                                      >
                                        <Plus size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <span style={{ fontWeight: 600 }}>1</span>
                                  )}
                                </td>
                                <td data-label="Precio Unit." style={{ textAlign: 'right' }}>
                                  ${Number(it.precioUnitario).toLocaleString('es-CL')}
                                </td>
                                <td data-label="Subtotal Neto" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--gray-900)' }}>
                                  ${Number(it.subtotal).toLocaleString('es-CL')}
                                </td>
                                <td data-label="Acción" style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    className="btn-icon danger"
                                    onClick={() => handleEliminarItem(it.id)}
                                    title="Remover de la factura"
                                    aria-label={`Remover ${it.nombre}`}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 5. Resumen Financiero e Impuestos (Tarjeta Visual) */}
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--gray-300)', borderRadius: '0.85rem', padding: '1.1rem 1.35rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '0.75rem' }}>
                      5. Resumen Financiero e Impuestos (Normativa Tributaria Chilena)
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '0.75rem' }}>
                      <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block', fontWeight: 600 }}>SUBTOTAL NETO</span>
                        <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--gray-800)' }}>
                          ${Number(subtotalNeto).toLocaleString('es-CL')} CLP
                        </span>
                      </div>

                      <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block', fontWeight: 600 }}>
                          IVA (19% AUTOMÁTICO)
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                          <NumericInput
                            id="factura-impuestos" allowDecimal
                            type="number"
                            className="form-input"
                            value={formData.montoImpuestos}
                            readOnly
                            style={{ backgroundColor: 'var(--bg-surface)', cursor: 'not-allowed', color: 'var(--blue-text)', fontWeight: 700, maxWidth: '140px', border: '1px solid var(--gray-300)' }}
                            title="Campo bloqueado para edición manual (calculado automáticamente al 19%)"
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>(Readonly)</span>
                        </div>
                      </div>

                      <div style={{ background: 'var(--success-light)', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--success-text)', display: 'block', fontWeight: 600 }}>
                          TOTAL FINAL A COBRAR
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                          <NumericInput
                            id="factura-total" allowDecimal
                            type="number"
                            className={`form-input ${fieldErrors.montoTotal ? 'border-red-500' : ''}`}
                            value={formData.montoTotal}
                            readOnly
                            style={{ backgroundColor: 'var(--bg-surface)', cursor: 'not-allowed', color: 'var(--success-text)', fontWeight: 800, fontSize: '1.05rem', maxWidth: '160px', border: '1px solid #86efac' }}
                            title="Total = Subtotal Neto + IVA (19%)"
                          />
                        </div>
                        {fieldErrors.montoTotal && (
                          <span role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                            {fieldErrors.montoTotal}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                        Fórmula aplicada: <code>IVA = Subtotal × 0.19</code> | <code>Total = Subtotal + IVA</code> (Redondeo CLP)
                      </span>
                      <strong style={{ fontSize: '1.15rem', color: 'var(--gray-900)' }}>
                        Total: ${Number(formData.montoTotal).toLocaleString('es-CL')} CLP
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Pie del Formulario (Tarjeta Visual) */}
                </div>
                </div>
                <div className="invoice-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </button>
                  <SubmitButton type="submit" className="btn btn-primary">
                    {editingId ? 'Actualizar Factura' : 'Confirmar y Emitir Factura'}
                  </SubmitButton>
                </div>
              </AccessibleForm>
            </div>
          </AccessibleDialog>, document.body
        );
      })()}

      {/* Modal Detalles de Factura */}
      {isDetalleModalOpen && selectedFactura && (
        <AccessibleDialog className="modal-overlay" aria-label="Detalles de la factura" onClose={() => setIsDetalleModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '780px', width: '95%', background: 'transparent', border: 'none', boxShadow: 'none' }}>
            {/* Tarjeta Visual Cabecera de Detalles */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--gray-200)', borderRadius: '0.85rem', padding: '1.1rem 1.35rem', marginBottom: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success-text)', flexShrink: 0 }}>
                  <FileText size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                    Detalles de Factura #{selectedFactura.id}
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                    Cliente: <strong>{clientes.find(c => c.id === selectedFactura.clienteId)?.nombreCompleto || 'Cliente'}</strong> (RUT: {clientes.find(c => c.id === selectedFactura.clienteId)?.documentoIdentidad || '—'}) — Fecha: {selectedFactura.fechaEmision}
                  </span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setIsDetalleModalOpen(false)} aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto', padding: 0 }}>
              {detalleError && (
                <div className="alert alert-danger" role="alert" style={{ marginBottom: '0.85rem' }}>
                  <AlertCircle size={18} />
                  <span>{detalleError}</span>
                </div>
              )}

              {/* Tarjeta Visual: Añadir Ítem / Concepto al Detalle */}
              <div style={{ background: 'var(--bg-surface)', padding: '1.1rem 1.35rem', borderRadius: '0.85rem', marginBottom: '0.85rem', border: '1px solid var(--gray-200)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Plus size={18} color="var(--teal-text)" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-800)', margin: 0 }}>
                    Añadir Ítem / Concepto al Detalle
                  </h3>
                </div>

                <AccessibleForm onSubmit={handleAgregarDetalle} noValidate style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.75rem', alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="detalle-tipo" style={{ fontWeight: 600, color: 'var(--gray-800)' }}>Tipo <RequiredIndicator /></label>
                    <select
                      id="detalle-tipo"
                      className="form-select"
                      value={nuevoItem.tipo}
                      onChange={(e) => {
                        setNuevoItem({ ...nuevoItem, tipo: e.target.value });
                        setDetalleFieldErrors({});
                      }} required
                    >
                      <option value="insumo">Insumo/Medicamento</option>
                      <option value="consulta">Consulta Médica</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="detalle-concepto" style={{ fontWeight: 600, color: 'var(--gray-800)' }}>Concepto <RequiredIndicator /> <RequiredIndicator /></label>
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
                        }} required
                      >
                        <option value="">Seleccione insumo...</option>
                        {insumos.map(i => (
                          <option key={i.id} value={i.id}>{i.nombreProducto} (${Number(i.precioUnitario).toLocaleString('es-CL')})</option>
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
                        }} required
                      >
                        <option value="">Seleccione consulta...</option>
                        {consultas.map(c => (
                          <option key={c.id} value={c.id}>Consulta Médica: {c.motivo}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="detalle-subtotal" style={{ fontWeight: 600, color: 'var(--gray-800)' }}>Subtotal ($) <RequiredIndicator /></label>
                    <NumericInput
                      id="detalle-subtotal"
                      type="number"
                      step="0.01"
                      className={`form-input ${detalleFieldErrors.subtotal ? 'border-red-500' : ''}`}
                      value={nuevoItem.subtotal}
                      onChange={(e) => {
                        setNuevoItem({ ...nuevoItem, subtotal: e.target.value });
                        if (detalleFieldErrors.subtotal) setDetalleFieldErrors(prev => ({ ...prev, subtotal: null }));
                      }} required
                    />
                  </div>

                  <div>
                    <SubmitButton type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                      <Plus size={16} /> Agregar
                    </SubmitButton>
                  </div>
                </AccessibleForm>
                {detalleFieldErrors.tipo && (
                  <span role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.78rem', marginTop: '0.4rem', display: 'block' }}>
                    {detalleFieldErrors.tipo}
                  </span>
                )}
                {detalleFieldErrors.subtotal && (
                  <span role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.78rem', marginTop: '0.4rem', display: 'block' }}>
                    {detalleFieldErrors.subtotal}
                  </span>
                )}
              </div>

              {/* Tarjeta Visual: Líneas Registradas de la Factura */}
              <div style={{ background: 'var(--bg-surface)', padding: '1.1rem 1.35rem', borderRadius: '0.85rem', marginBottom: '0.85rem', border: '1px solid var(--gray-200)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-800)', margin: 0 }}>
                    Líneas Registradas de la Factura ({facturaDetalles.length})
                  </h3>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--gray-900)' }}>
                    Total Factura: ${Number(selectedFactura?.montoTotal || 0).toLocaleString('es-CL')} CLP
                  </strong>
                </div>

                {facturaDetalles.length === 0 ? (
                  <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem', textAlign: 'center', padding: '1.5rem', background: 'var(--gray-50)', borderRadius: '0.5rem', border: '1px dashed var(--gray-300)' }}>
                    No se han registrado líneas de detalle para esta factura todavía.
                  </p>
                ) : (
                  <div className="table-responsive" style={{ border: '1px solid var(--gray-200)', borderRadius: '0.5rem', overflowX: 'auto' }}>
                    <table className="custom-table" style={{ margin: 0 }}>
                      <thead style={{ background: 'var(--gray-100)' }}>
                        <tr>
                          <th scope="col">Concepto / Tipo</th>
                          <th scope="col">Subtotal</th>
                          <th scope="col" style={{ textAlign: 'right' }}>Acción</th>
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
                                {!ins && !con && <span style={{ color: 'var(--gray-400)' }}>Servicio Veterinario</span>}
                              </td>
                              <td data-label="Subtotal"><strong style={{ color: 'var(--gray-900)' }}>${Number(d.subtotal).toLocaleString('es-CL')}</strong></td>
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
            </div>

            {/* Tarjeta Visual: Pie del Modal */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--gray-200)', borderRadius: '0.85rem', padding: '0.9rem 1.35rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'flex-end', marginTop: '0.85rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsDetalleModalOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </AccessibleDialog>
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
