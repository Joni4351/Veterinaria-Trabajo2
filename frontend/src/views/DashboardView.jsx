import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Users, Dog, Calendar, DollarSign, Package, Stethoscope, 
  TrendingUp, Clock, AlertCircle, CheckCircle2 
} from 'lucide-react';

export const DashboardView = ({ onNavigate }) => {
  const navigate = useNavigate();
  const handleNav = (target) => {
    if (onNavigate) {
      onNavigate(target);
    } else {
      navigate('/' + target);
    }
  };

  const [stats, setStats] = useState({
    pacientes: 0,
    clientes: 0,
    citas: 0,
    facturas: 0,
    insumos: 0,
    consultas: 0
  });
  const [citasRecientes, setCitasRecientes] = useState([]);
  const [insumosBajoStock, setInsumosBajoStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [pacRes, cliRes, citRes, facRes, insRes, conRes] = await Promise.allSettled([
        api.get('/api/v1/pacientes'),
        api.get('/api/v1/clientes'),
        api.get('/api/v1/citas'),
        api.get('/api/v1/facturas'),
        api.get('/api/v1/insumos'),
        api.get('/api/v1/consultas')
      ]);

      const pacientes = pacRes.status === 'fulfilled' ? pacRes.value.data : [];
      const clientes = cliRes.status === 'fulfilled' ? cliRes.value.data : [];
      const citas = citRes.status === 'fulfilled' ? citRes.value.data : [];
      const facturas = facRes.status === 'fulfilled' ? facRes.value.data : [];
      const insumos = insRes.status === 'fulfilled' ? insRes.value.data : [];
      const consultas = conRes.status === 'fulfilled' ? conRes.value.data : [];

      setStats({
        pacientes: pacientes.length || 0,
        clientes: clientes.length || 0,
        citas: citas.length || 0,
        facturas: facturas.length || 0,
        insumos: insumos.length || 0,
        consultas: consultas.length || 0
      });

      // Ordenar citas por fecha descendente
      if (Array.isArray(citas)) {
        setCitasRecientes(citas.slice(0, 5));
      }

      // Filtrar insumos con stock crítico (< 10)
      if (Array.isArray(insumos)) {
        setInsumosBajoStock(insumos.filter(i => i.stockActual <= 10).slice(0, 5));
      }
    } catch (err) {
      console.error("Error cargando dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Pacientes Registrados', val: stats.pacientes, icon: Dog, color: '#0284c7', bg: '#e0f2fe', nav: 'pacientes' },
    { label: 'Clientes / Dueños', val: stats.clientes, icon: Users, color: '#0f766e', bg: '#ccfbf1', nav: 'clientes' },
    { label: 'Citas Médicas', val: stats.citas, icon: Calendar, color: '#8b5cf6', bg: '#ede9fe', nav: 'citas' },
    { label: 'Consultas Realizadas', val: stats.consultas, icon: Stethoscope, color: '#10b981', bg: '#d1fae5', nav: 'consultas' },
    { label: 'Facturas Emitidas', val: stats.facturas, icon: DollarSign, color: '#f59e0b', bg: '#fef3c7', nav: 'facturas' },
    { label: 'Insumos en Inventario', val: stats.insumos, icon: Package, color: '#ec4899', bg: '#fce7f3', nav: 'insumos' }
  ];

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Panel de Control Veterinario</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Visión general del estado clínico, citas e inventario en tiempo real.</p>
      </div>

      {/* Grid de Métricas */}
      <div className="stats-grid">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div 
              key={i} 
              className="stat-card" 
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
              onClick={() => handleNav(c.nav)}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="stat-icon" style={{ backgroundColor: c.bg, color: c.color }}>
                <Icon size={26} />
              </div>
              <div>
                <div className="stat-value">{loading ? '...' : c.val}</div>
                <div className="stat-label">{c.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.25rem' }}>
        {/* Próximas Citas */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Calendar size={20} color="#0284c7" />
              Últimas Citas Agendadas
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => handleNav('citas')}>
              Ver Todas
            </button>
          </div>

          {citasRecientes.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
              No hay citas registradas en el sistema.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Paciente</th>
                    <th>Fecha & Hora</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {citasRecientes.map((cita) => (
                    <tr key={cita.id}>
                      <td data-label="ID" style={{ fontWeight: 600 }}>#{cita.id}</td>
                      <td data-label="Paciente">ID Paciente: {cita.pacienteId}</td>
                      <td data-label="Fecha & Hora">{new Date(cita.fechaHora).toLocaleString()}</td>
                      <td data-label="Estado">
                        <span className={`badge ${
                          cita.estado?.toLowerCase() === 'completada' ? 'badge-success' :
                          cita.estado?.toLowerCase() === 'cancelada' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {cita.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Alertas de Stock Bajo */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <AlertCircle size={20} color="#ef4444" />
              Alerta de Stock de Medicamentos
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => handleNav('insumos')}>
              Gestionar Stock
            </button>
          </div>

          {insumosBajoStock.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#10b981' }}>
              <CheckCircle2 size={36} style={{ margin: '0 auto 0.5rem' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Todos los insumos cuentan con stock óptimo.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Stock Actual</th>
                    <th>Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {insumosBajoStock.map((insumo) => (
                    <tr key={insumo.id}>
                      <td data-label="Producto" style={{ fontWeight: 600 }}>{insumo.nombreProducto}</td>
                      <td data-label="Tipo">{insumo.tipo}</td>
                      <td data-label="Stock Actual">
                        <span className="badge badge-danger">
                          {insumo.stockActual} unidades
                        </span>
                      </td>
                      <td data-label="Precio">${Number(insumo.precioUnitario).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
