import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import VeterinaryPet3D from '../components/VeterinaryPet3D';
import { 
  Users, Dog, Calendar, DollarSign, Package, Stethoscope, 
  ArrowRight, Sparkles, Heart, Clock, AlertTriangle, 
  ChevronRight, PlusCircle, CheckCircle2
} from 'lucide-react';

export const DashboardView = ({ onNavigate }) => {
  const { user } = useAuth();
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
        pacientes: Array.isArray(pacientes) ? pacientes.length : 0,
        clientes: Array.isArray(clientes) ? clientes.length : 0,
        citas: Array.isArray(citas) ? citas.length : 0,
        facturas: Array.isArray(facturas) ? facturas.length : 0,
        insumos: Array.isArray(insumos) ? insumos.length : 0,
        consultas: Array.isArray(consultas) ? consultas.length : 0
      });

      if (Array.isArray(citas)) {
        setCitasRecientes(citas.slice(0, 5));
      }
      if (Array.isArray(insumos)) {
        setInsumosBajoStock(insumos.filter(i => (i.stockActual || 0) <= 10).slice(0, 5));
      }
    } catch (err) {
      console.error("Error cargando dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Pacientes Registrados', val: stats.pacientes, icon: Dog, color: '#0d9488', bg: '#f0fdfa', border: '#ccfbf1', nav: 'pacientes' },
    { label: 'Clientes / Dueños', val: stats.clientes, icon: Users, color: '#0284c7', bg: '#f0f9ff', border: '#e0f2fe', nav: 'clientes' },
    { label: 'Citas Médicas', val: stats.citas, icon: Calendar, color: '#7c3aed', bg: '#f5f3ff', border: '#ede9fe', nav: 'citas' },
    { label: 'Consultas Realizadas', val: stats.consultas, icon: Stethoscope, color: '#059669', bg: '#ecfdf5', border: '#d1fae5', nav: 'consultas' },
    { label: 'Facturas Emitidas', val: stats.facturas, icon: DollarSign, color: '#d97706', bg: '#fffbeb', border: '#fef3c7', nav: 'facturas' },
    { label: 'Insumos en Inventario', val: stats.insumos, icon: Package, color: '#db2777', bg: '#fdf2f8', border: '#fce7f3', nav: 'insumos' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* =========================================================================
          HERO BANNER CÁLIDO Y AMIGABLE CON EL PERRITO 3D INTERACTIVO
          ========================================================================= */}
      <section
        style={{
          position: 'relative',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 50%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          padding: '2.25rem 2rem',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.02)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2.5rem',
            alignItems: 'center',
          }}
        >
          {/* Lado Izquierdo: Saludo y Acciones Rápidas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: '#ccfbf1',
                border: '1px solid #99f6e4',
                color: '#0f766e',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                alignSelf: 'flex-start',
              }}
            >
              <Heart size={14} fill="#0d9488" color="#0d9488" />
              <span>SISTEMA CLÍNICO VETERINARIO PROFESIONAL</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(1.9rem, 3.2vw, 2.7rem)',
                fontWeight: 800,
                lineHeight: 1.2,
                color: '#0f172a',
                letterSpacing: '-0.02em',
              }}
            >
              ¡Bienvenido al <span style={{ color: '#0d9488' }}>Portal Clínico</span>!
            </h1>

            <p
              style={{
                fontSize: '1rem',
                color: '#475569',
                lineHeight: 1.6,
                maxWidth: '560px',
              }}
            >
              Gestiona historias clínicas, agenda consultas y cuida la salud de cada mascota
              con una plataforma ágil, segura y diseñada para tu equipo.
            </p>

            {/* Botones de Acción Amigables */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '0.85rem',
                marginTop: '0.5rem',
              }}
            >
              <button
                type="button"
                onClick={() => handleNav('pacientes')}
                className="btn btn-primary"
                style={{
                  fontSize: '0.92rem',
                  padding: '12px 24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '999px',
                }}
              >
                <PlusCircle size={18} />
                <span>Gestionar Pacientes</span>
              </button>

              <button
                type="button"
                onClick={() => handleNav('citas')}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.92rem',
                  padding: '12px 22px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '999px',
                }}
              >
                <Calendar size={18} color="#0d9488" />
                <span>Agenda de Citas</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Ventajas y Certificaciones */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '1.25rem',
                marginTop: '0.75rem',
                paddingTop: '1rem',
                borderTop: '1px solid #e2e8f0',
                fontSize: '0.78rem',
                color: '#64748b',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} color="#0d9488" />
                <span>Base de Datos SQL Server Activa</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} color="#f59e0b" />
                <span>Control de Acceso Seguro (JWT)</span>
              </div>
            </div>
          </div>

          {/* Lado Derecho: El Perrito 3D Interactivo */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <VeterinaryPet3D />
          </div>
        </div>
      </section>

      {/* =========================================================================
          MÉTRICAS DEL SISTEMA VETERINARIO (CONECTADAS A SQL SERVER)
          ========================================================================= */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Resumen Clínico y Operativo
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
              Métricas sincronizadas en tiempo real con la base de datos de la clínica.
            </p>
          </div>
        </div>

        {/* Grid de Métricas */}
        <div className="stats-grid">
          {statCards.map((c, i) => {
            const Icon = c.icon;
            return (
              <div 
                key={i} 
                className="stat-card"
                onClick={() => handleNav(c.nav)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNav(c.nav); }}
                style={{
                  cursor: 'pointer',
                  background: '#ffffff',
                  border: `1px solid ${c.border}`,
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div 
                  className="stat-icon" 
                  style={{ 
                    color: c.color, 
                    backgroundColor: c.bg,
                    border: `1px solid ${c.border}`
                  }}
                >
                  <Icon size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value" style={{ color: '#0f172a' }}>{c.val}</div>
                  <div className="stat-label" style={{ color: '#64748b' }}>{c.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          PANEL INFERIOR: PRÓXIMAS CITAS E INVENTARIO CRÍTICO
          ========================================================================= */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '1.5rem' 
        }}
      >
        {/* Próximas Citas */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="#0d9488" />
              Próximas Citas Médicas
            </h3>
            <button 
              className="btn btn-sm btn-secondary" 
              onClick={() => handleNav('citas')}
              style={{ fontSize: '0.78rem' }}
            >
              Ver Todas <ChevronRight size={14} />
            </button>
          </div>

          {citasRecientes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
              <Calendar size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4, color: '#0d9488' }} />
              <p style={{ fontSize: '0.9rem' }}>No hay citas agendadas actualmente en el sistema.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {citasRecientes.map((cita) => (
                <div 
                  key={cita.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: '#f0fdfa',
                      border: '1px solid #ccfbf1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0d9488'
                    }}>
                      <Dog size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                        Paciente #{cita.pacienteId || cita.id}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {cita.fechaHora ? new Date(cita.fechaHora).toLocaleString() : 'Fecha pendiente'}
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-success" style={{ textTransform: 'capitalize' }}>
                    {cita.estado || 'Agendada'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Insumos con Stock Bajo */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} color="#d97706" />
              Insumos con Stock Crítico
            </h3>
            <button 
              className="btn btn-sm btn-secondary" 
              onClick={() => handleNav('insumos')}
              style={{ fontSize: '0.78rem' }}
            >
              Ver Inventario <ChevronRight size={14} />
            </button>
          </div>

          {insumosBajoStock.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
              <Package size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4, color: '#0d9488' }} />
              <p style={{ fontSize: '0.9rem' }}>Todos los medicamentos y suministros tienen stock suficiente.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {insumosBajoStock.map((insumo) => (
                <div 
                  key={insumo.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    background: '#fffbeb',
                    border: '1px solid #fef3c7',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                      {insumo.nombreProducto || `Insumo #${insumo.id}`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Categoría: {insumo.tipo || 'Clínico'}
                    </div>
                  </div>
                  <span className="badge badge-warning">
                    Stock: {insumo.stockActual} u.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
