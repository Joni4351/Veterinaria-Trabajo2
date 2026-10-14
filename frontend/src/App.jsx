import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { PacientesView } from './views/PacientesView';
import { ClientesView } from './views/ClientesView';
import { CitasView } from './views/CitasView';
import { ConsultasView } from './views/ConsultasView';
import { InsumosView } from './views/InsumosView';
import { FacturasView } from './views/FacturasView';
import { AdminConfigView } from './views/AdminConfigView';
import { AccessDeniedView } from './views/AccessDeniedView';
import { ProtectedRoute } from './components/ProtectedRoute';
import AuraParticleBackground from './components/AuraParticleBackground';

import { 
  Dog, Users, Calendar, Stethoscope, Package, DollarSign, 
  Settings, LogOut, LayoutDashboard, HeartPulse, Menu, X, ShieldAlert, Lock,
  PlusCircle, Sparkles, Activity
} from 'lucide-react';

function MainLayout() {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [forbiddenToast, setForbiddenToast] = useState(null);
  const [rateLimitToast, setRateLimitToast] = useState(null);

  // Escuchar respuestas HTTP 403 Forbidden y 429 Too Many Requests emitidas por el interceptor de Axios
  useEffect(() => {
    const handleForbidden = (e) => {
      setForbiddenToast(e.detail || { mensaje: 'Operación denegada por permisos de rol (HTTP 403 Forbidden)' });
    };

    const handleRateLimit = (e) => {
      setRateLimitToast(e.detail || { mensaje: 'Límite de solicitudes alcanzado. Por favor, espera 60 segundos.' });
    };

    window.addEventListener('vet:forbidden', handleForbidden);
    window.addEventListener('vet:ratelimit', handleRateLimit);
    return () => {
      window.removeEventListener('vet:forbidden', handleForbidden);
      window.removeEventListener('vet:ratelimit', handleRateLimit);
    };
  }, []);

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Santuario / Dashboard', 
      icon: LayoutDashboard,
      roles: ['Administrador', 'Veterinario', 'Recepcionista'] 
    },
    { 
      path: '/pacientes', 
      label: 'Pacientes (Mascotas)', 
      icon: Dog,
      roles: ['Administrador', 'Veterinario', 'Recepcionista'] 
    },
    { 
      path: '/clientes', 
      label: 'Clientes (Dueños)', 
      icon: Users,
      roles: ['Administrador', 'Veterinario', 'Recepcionista'] 
    },
    { 
      path: '/citas', 
      label: 'Agenda de Citas', 
      icon: Calendar,
      roles: ['Administrador', 'Veterinario', 'Recepcionista'] 
    },
    { 
      path: '/consultas', 
      label: 'Consultas y Recetas', 
      icon: Stethoscope,
      roles: ['Administrador', 'Veterinario', 'Recepcionista'] 
    },
    { 
      path: '/insumos', 
      label: 'Inventario / Insumos', 
      icon: Package,
      roles: ['Administrador', 'Veterinario', 'Recepcionista'] 
    },
    { 
      path: '/facturas', 
      label: 'Facturación', 
      icon: DollarSign,
      roles: ['Administrador', 'Veterinario', 'Recepcionista'] 
    },
    { 
      path: '/admin', 
      label: 'Administración', 
      icon: Settings,
      roles: ['Administrador'] // Exclusivo para Administrador
    },
  ];

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const currentNavItem = navItems.find(i => location.pathname.startsWith(i.path));
  const currentTitle = currentNavItem ? currentNavItem.label : (location.pathname === '/403' ? 'Acceso Denegado' : 'AURA VET');

  return (
    <div className="app-container" style={{ position: 'relative', zIndex: 1, minHeight: '100vh', background: 'transparent' }}>
      
      {/* Toast flotante de error 403 Forbidden interceptado desde la API */}
      {forbiddenToast && (
        <div 
          role="alert"
          aria-live="assertive"
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 9999,
            maxWidth: '420px',
            width: 'calc(100% - 2rem)',
            backgroundColor: 'rgba(153, 27, 27, 0.95)',
            border: '1px solid #ef4444',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem',
            backdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          <ShieldAlert size={24} style={{ flexShrink: 0, marginTop: '2px', color: '#fca5a5' }} />
          <div style={{ flex: 1, fontSize: '0.88rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem', color: '#fecaca' }}>
              403 Prohibido - Servidor API
            </div>
            <div>{forbiddenToast.mensaje}</div>
          </div>
          <button
            onClick={() => setForbiddenToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px',
              minWidth: '32px',
              minHeight: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Cerrar notificación de error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Toast flotante de 429 Too Many Requests */}
      {rateLimitToast && (
        <div 
          role="alert"
          aria-live="assertive"
          style={{
            position: 'fixed',
            top: forbiddenToast ? '6rem' : '1rem',
            right: '1rem',
            zIndex: 9999,
            maxWidth: '420px',
            width: 'calc(100% - 2rem)',
            backgroundColor: 'rgba(180, 83, 9, 0.95)',
            border: '1px solid #f59e0b',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(245, 158, 11, 0.4)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem',
            backdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          <ShieldAlert size={24} style={{ flexShrink: 0, marginTop: '2px', color: '#fde68a' }} />
          <div style={{ flex: 1, fontSize: '0.88rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem', color: '#fef3c7' }}>
              429 Solicitudes Excedidas - Rate Limiter
            </div>
            <div>{rateLimitToast.mensaje}</div>
          </div>
          <button
            onClick={() => setRateLimitToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px',
              minWidth: '32px',
              minHeight: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Cerrar notificación de límite de solicitudes"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Backdrop para cerrar el menú en móvil */}
      <div 
        className={`sidebar-overlay ${isMobileMenuOpen ? 'visible' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar de Navegación AURA VET (Off-canvas en Móvil / Sticky en Desktop) */}
      <aside 
        className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}
        style={{
          background: 'rgba(5, 12, 10, 0.95)',
          borderRight: '1px solid rgba(0, 245, 160, 0.15)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="sidebar-header" style={{ borderBottom: '1px solid rgba(0, 245, 160, 0.15)', padding: '1.5rem 1.25rem' }}>
          <div className="sidebar-brand">
            <div 
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(0, 245, 160, 0.2), rgba(5, 242, 175, 0.05))',
                border: '1px solid rgba(0, 245, 160, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00f5a0',
                boxShadow: '0 0 15px rgba(0, 245, 160, 0.3)',
              }}
            >
              <HeartPulse size={22} />
            </div>
            <div>
              <div 
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  background: 'linear-gradient(135deg, #ffffff 40%, #00f5a0 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                AURA VET
              </div>
              <div style={{ fontSize: '0.7rem', color: '#5eead4', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                Bio-Resonancia Clínica
              </div>
            </div>
          </div>
          {/* Botón para cerrar drawer en móvil */}
          <button 
            className="btn-icon mobile-menu-btn" 
            style={{ color: '#cbd5e1', border: 'none' }}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Cerrar menú lateral"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const tienePermiso = hasRole(item.roles);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: tienePermiso ? 1 : 0.55,
                  textDecoration: 'none',
                }}
                title={!tienePermiso ? `Requiere rol: ${item.roles.join(', ')}` : ''}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <Icon size={19} />
                  <span>{item.label}</span>
                </div>
                {!tienePermiso && (
                  <Lock size={14} color="#94a3b8" title="Módulo restringido por rol" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div 
          className="sidebar-footer"
          style={{
            background: 'rgba(3, 8, 7, 0.95)',
            borderTop: '1px solid rgba(0, 245, 160, 0.15)',
          }}
        >
          <div className="user-profile">
            <div 
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(0, 245, 160, 0.15)',
                border: '1px solid #00f5a0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00f5a0',
                fontWeight: 700,
                fontSize: '0.9rem',
                boxShadow: '0 0 10px rgba(0, 245, 160, 0.25)',
              }}
              aria-hidden="true"
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-info">
              <span className="user-name" title={user?.name} style={{ color: '#ffffff', fontWeight: 600 }}>
                {user?.name}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#00f5a0', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
                {user?.role}
              </span>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ 
              width: '100%', 
              marginTop: '0.4rem', 
              justifyContent: 'center',
              borderRadius: '999px',
              border: '1px solid rgba(0, 245, 160, 0.25)',
              background: 'rgba(10, 25, 22, 0.7)',
              color: '#e2e8f0',
            }}
            onClick={handleLogout}
            aria-label="Cerrar sesión actual"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Área Principal de Contenido */}
      <div className="main-wrapper">
        <header 
          className="topbar"
          style={{
            background: 'rgba(5, 13, 11, 0.85)',
            borderBottom: '1px solid rgba(0, 245, 160, 0.15)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="topbar-left">
            <button 
              className="mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Abrir menú de navegación"
              style={{ color: '#ffffff' }}
            >
              <Menu size={22} />
            </button>
            
            {/* Banner de Estado Operativo AURA VET */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.75rem',
                color: '#94a3b8',
                fontWeight: 600,
                letterSpacing: '0.06em',
                background: 'rgba(0, 245, 160, 0.08)',
                border: '1px solid rgba(0, 245, 160, 0.2)',
                padding: '4px 12px',
                borderRadius: '999px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#00f5a0',
                  boxShadow: '0 0 8px #00f5a0',
                }}
              />
              <span style={{ color: '#00f5a0' }}>SISTEMAS CLÍNICOS 100% OPERATIVOS</span>
              <span style={{ color: '#64748b' }}>•</span>
              <span>URGENCIAS 24/7</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Botón rápido "Agendar Cita" estilo Aura Pill */}
            <button
              onClick={() => navigate('/citas')}
              style={{
                background: 'linear-gradient(135deg, #00f5a0, #05f2af)',
                color: '#04100c',
                fontWeight: 700,
                fontSize: '0.85rem',
                padding: '8px 18px',
                borderRadius: '999px',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 0 15px rgba(0, 245, 160, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              <Calendar size={15} />
              <span>Agendar Cita</span>
            </button>

            <span 
              style={{ 
                fontSize: '0.76rem', 
                padding: '0.3rem 0.75rem', 
                borderRadius: '9999px',
                backgroundColor: 'rgba(0, 245, 160, 0.1)',
                border: '1px solid rgba(0, 245, 160, 0.3)',
                color: '#00f5a0',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              Rol: {user?.role}
            </span>
          </div>
        </header>

        <main className="content-body" id="main-content" tabIndex="-1" style={{ position: 'relative', zIndex: 1 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['Administrador', 'Veterinario', 'Recepcionista']}>
                  <DashboardView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pacientes" 
              element={
                <ProtectedRoute allowedRoles={['Administrador', 'Veterinario', 'Recepcionista']}>
                  <PacientesView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clientes" 
              element={
                <ProtectedRoute allowedRoles={['Administrador', 'Veterinario', 'Recepcionista']}>
                  <ClientesView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/citas" 
              element={
                <ProtectedRoute allowedRoles={['Administrador', 'Veterinario', 'Recepcionista']}>
                  <CitasView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/consultas" 
              element={
                <ProtectedRoute allowedRoles={['Administrador', 'Veterinario', 'Recepcionista']}>
                  <ConsultasView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/insumos" 
              element={
                <ProtectedRoute allowedRoles={['Administrador', 'Veterinario', 'Recepcionista']}>
                  <InsumosView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/facturas" 
              element={
                <ProtectedRoute allowedRoles={['Administrador', 'Veterinario', 'Recepcionista']}>
                  <FacturasView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['Administrador']}>
                  <AdminConfigView />
                </ProtectedRoute>
              } 
            />
            <Route path="/403" element={<AccessDeniedView />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div 
        role="status"
        aria-live="polite"
        style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#050c0a',
          gap: '1rem',
        }}
      >
        <AuraParticleBackground />
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
          <div 
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: '3px solid rgba(0, 245, 160, 0.2)',
              borderTopColor: '#00f5a0',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ color: '#00f5a0', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.95rem' }}>
            SINCRONIZANDO AURA VET...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: '#050c0a' }}>
      {/* Fondo de Partículas Bioluminiscentes Interactivas */}
      <AuraParticleBackground />

      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" replace /> : <LoginView />} 
        />
        <Route 
          path="/*" 
          element={user ? <MainLayout /> : <Navigate to="/login" replace />} 
        />
      </Routes>
    </div>
  );
}

export default App;
