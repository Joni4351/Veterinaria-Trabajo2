import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AccessDeniedView = ({ requiredRoles = [], onGoBack }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleReturn = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      padding: '1rem',
      width: '100%'
    }}>
      <div className="card" style={{
        maxWidth: '520px',
        width: '100%',
        textAlign: 'center',
        padding: '2.5rem 1.5rem',
        border: '1px solid #fecaca',
        boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.15)',
        backgroundColor: '#ffffff'
      }}>
        {/* Icono de Seguridad 403 */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          color: '#ef4444',
          marginBottom: '1.25rem',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
        }}>
          <ShieldAlert size={42} />
        </div>

        <div style={{
          display: 'inline-block',
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          fontWeight: 700,
          fontSize: '0.82rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          marginBottom: '0.75rem',
          letterSpacing: '0.05em'
        }}>
          ERROR 403 - FORBIDDEN
        </div>

        <h2 style={{
          fontSize: '1.45rem',
          fontWeight: 800,
          color: '#0f172a',
          marginBottom: '0.5rem',
          lineHeight: 1.2
        }}>
          Acceso Denegado
        </h2>

        <p style={{
          color: '#64748b',
          fontSize: '0.95rem',
          marginBottom: '1.5rem',
          lineHeight: 1.5
        }}>
          No tienes los permisos requeridos para acceder a esta sección o ejecutar esta acción.
        </p>

        {/* Detalle de Roles */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1rem',
          textAlign: 'left',
          marginBottom: '1.75rem',
          fontSize: '0.88rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#334155' }}>
            <UserCheck size={16} color="#0284c7" />
            <span>Tu Rol Actual:</span>
            <strong style={{ color: '#0284c7' }}>{user?.role || 'Sin Rol'}</strong>
          </div>

          {requiredRoles.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
              <Lock size={16} color="#ef4444" />
              <span>Roles Autorizados:</span>
              <strong style={{ color: '#0f172a' }}>{requiredRoles.join(', ')}</strong>
            </div>
          )}

          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.78rem', color: '#94a3b8' }}>
            ℹ️ Por seguridad, la API backend valida estrictamente los claims del token JWT en cada solicitud.
          </div>
        </div>

        {/* Botón de Retorno Táctil (>= 44x44px) */}
        <button
          className="btn btn-primary"
          style={{ width: '100%', minHeight: '44px' }}
          onClick={handleReturn}
        >
          <ArrowLeft size={18} />
          Volver al Panel Principal
        </button>
      </div>
    </div>
  );
};
