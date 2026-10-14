import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AuraBioHologram3D from '../components/AuraBioHologram3D';
import AuraTelemetryCard from '../components/AuraTelemetryCard';
import { 
  Users, Dog, Calendar, DollarSign, Package, Stethoscope, 
  ArrowRight, Sparkles, Shield, Dna, Radio, Activity,
  AlertTriangle, Clock, ChevronRight
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
    { label: 'Pacientes Registrados', val: stats.pacientes, icon: Dog, color: '#00f5a0', bg: 'rgba(0, 245, 160, 0.1)', nav: 'pacientes' },
    { label: 'Clientes / Dueños', val: stats.clientes, icon: Users, color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.1)', nav: 'clientes' },
    { label: 'Citas Médicas', val: stats.citas, icon: Calendar, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)', nav: 'citas' },
    { label: 'Consultas Realizadas', val: stats.consultas, icon: Stethoscope, color: '#05f2af', bg: 'rgba(5, 242, 175, 0.1)', nav: 'consultas' },
    { label: 'Facturas Emitidas', val: stats.facturas, icon: DollarSign, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', nav: 'facturas' },
    { label: 'Insumos en Inventario', val: stats.insumos, icon: Package, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)', nav: 'insumos' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      
      {/* =========================================================================
          HERO SECTION - ESTILO AURA VET (Bio-Resonancia e Inteligencia Clínica)
          ========================================================================= */}
      <section
        style={{
          position: 'relative',
          borderRadius: '24px',
          background: 'radial-gradient(ellipse at 80% 20%, rgba(0, 245, 160, 0.12) 0%, rgba(6, 16, 13, 0.95) 70%)',
          border: '1px solid rgba(0, 245, 160, 0.2)',
          padding: '2.5rem 2rem',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2.5rem',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Lado Izquierdo: Copy Futurista y Acciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Pill superior */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'rgba(0, 245, 160, 0.1)',
                border: '1px solid rgba(0, 245, 160, 0.3)',
                color: '#00f5a0',
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                alignSelf: 'flex-start',
                backdropFilter: 'blur(10px)',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#00f5a0',
                  boxShadow: '0 0 10px #00f5a0',
                }}
              />
              <span>MEDICINA VETERINARIA PREDICTIVA • BIO-MONITOREO CUÁNTICO</span>
            </div>

            {/* Gran Título Cinético */}
            <h1
              style={{
                fontSize: 'clamp(2rem, 3.8vw, 3.2rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                color: '#ffffff',
                letterSpacing: '-0.03em',
              }}
            >
              El futuro del cuidado animal guiado por{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #00f5a0 0%, #2dd4bf 50%, #38bdf8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                bio-resonancia
              </span>{' '}
              e inteligencia clínica.
            </h1>

            {/* Subtítulo descriptivo */}
            <p
              style={{
                fontSize: '1rem',
                color: '#94a3b8',
                lineHeight: 1.6,
                maxWidth: '620px',
              }}
            >
              Redefinimos la salud de tus compañeros con espacios libres de estrés acústico,
              diagnósticos moleculares instantáneos y telemetría no invasiva en tiempo real.
            </p>

            {/* Botones de Acción Estilo Aura Pill */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '1rem',
                marginTop: '0.5rem',
              }}
            >
              <button
                onClick={() => handleNav('citas')}
                style={{
                  background: 'linear-gradient(135deg, #00f5a0, #05f2af)',
                  color: '#04100c',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  padding: '13px 26px',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 0 25px rgba(0, 245, 160, 0.45)',
                  transition: 'all 0.25s ease',
                  minHeight: '44px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 0 35px rgba(0, 245, 160, 0.65)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 245, 160, 0.45)';
                }}
              >
                <Calendar size={18} />
                <span>Agendar Chequeo Integral</span>
              </button>

              <button
                onClick={() => handleNav('pacientes')}
                style={{
                  background: 'rgba(10, 25, 22, 0.75)',
                  color: '#e2e8f0',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  padding: '13px 24px',
                  borderRadius: '999px',
                  border: '1px solid rgba(0, 245, 160, 0.35)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.25s ease',
                  minHeight: '44px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#00f5a0';
                  e.currentTarget.style.background = 'rgba(15, 35, 30, 0.9)';
                  e.currentTarget.style.color = '#00f5a0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0, 245, 160, 0.35)';
                  e.currentTarget.style.background = 'rgba(10, 25, 22, 0.75)';
                  e.currentTarget.style.color = '#e2e8f0';
                }}
              >
                <span>Explorar Suite Diagnóstica 360°</span>
                <ArrowRight size={18} />
              </button>
            </div>

            {/* Badges de Certificación Footer */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '1.25rem',
                marginTop: '1rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid rgba(45, 212, 191, 0.15)',
                fontSize: '0.75rem',
                color: '#94a3b8',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} color="#00f5a0" />
                <span>CERTIFICACIÓN LIBRE DE ESTRÉS NIVEL V</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Dna size={16} color="#2dd4bf" />
                <span>SECUENCIACIÓN GENÓMICA EN 12 MIN</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio size={16} color="#38bdf8" />
                <span>TELEMETRÍA REMOTA 24/7</span>
              </div>
            </div>
          </div>

          {/* Lado Derecho: Modelado 3D Interactivo + Tarjeta de Telemetría */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
              justifyContent: 'center',
            }}
          >
            {/* Modelado 3D en Three.js con Anillos Giroscópicos */}
            <AuraBioHologram3D />

            {/* Tarjeta de Telemetría Vital con ECG en vivo */}
            <AuraTelemetryCard />
          </div>
        </div>
      </section>

      {/* =========================================================================
          MÉTRICAS DEL SISTEMA VETERINARIO (CONECTADAS A SQL SERVER)
          ========================================================================= */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Métricas Operativas de la Clínica
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Datos sincronizados en tiempo real con la base de datos SQL Server.
            </p>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#00f5a0',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f5a0' }} />
            API RESTful Conectada
          </span>
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
                  background: 'rgba(9, 21, 18, 0.75)',
                  border: '1px solid rgba(0, 245, 160, 0.18)',
                  backdropFilter: 'blur(16px)',
                  transition: 'all 0.25s ease',
                }}
              >
                <div 
                  className="stat-icon" 
                  style={{ 
                    color: c.color, 
                    backgroundColor: c.bg,
                    border: `1px solid ${c.color}30`
                  }}
                >
                  <Icon size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value" style={{ color: '#ffffff' }}>{c.val}</div>
                  <div className="stat-label" style={{ color: '#94a3b8' }}>{c.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          PANEL INFERIOR: CITAS RECIENTES E INVENTARIO CRÍTICO
          ========================================================================= */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '1.5rem' 
        }}
      >
        {/* Próximas Citas Médicas */}
        <div 
          className="card"
          style={{
            background: 'rgba(9, 21, 18, 0.75)',
            border: '1px solid rgba(0, 245, 160, 0.18)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="#00f5a0" />
              Próximas Citas Agendadas
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
              <Calendar size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4, color: '#00f5a0' }} />
              <p style={{ fontSize: '0.9rem' }}>No hay citas próximas registradas en la base de datos.</p>
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
                    borderRadius: '10px',
                    background: 'rgba(14, 30, 26, 0.6)',
                    border: '1px solid rgba(45, 212, 191, 0.12)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 245, 160, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00f5a0'
                    }}>
                      <Dog size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ffffff' }}>
                        Paciente #{cita.pacienteId || cita.id}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
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

        {/* Insumos con Stock Crítico */}
        <div 
          className="card"
          style={{
            background: 'rgba(9, 21, 18, 0.75)',
            border: '1px solid rgba(0, 245, 160, 0.18)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} color="#f59e0b" />
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
              <Package size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4, color: '#00f5a0' }} />
              <p style={{ fontSize: '0.9rem' }}>Todos los medicamentos e insumos cuentan con stock óptimo.</p>
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
                    borderRadius: '10px',
                    background: 'rgba(14, 30, 26, 0.6)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ffffff' }}>
                      {insumo.nombreProducto || `Insumo #${insumo.id}`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Tipo: {insumo.tipo || 'Clínico'}
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
