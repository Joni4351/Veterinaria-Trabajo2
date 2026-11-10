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
        border: '1px solid var(--danger-border)',
        boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.15)',
        backgroundColor: 'var(--bg-surface)'
      }}>
        {/* Icono de Seguridad 403 */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          backgroundColor: 'var(--danger-light)',
          color: 'var(--danger-text)',
          marginBottom: '1.25rem',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
        }}>
          <ShieldAlert size={42} />
        </div>

        <div style={{
          display: 'inline-block',
          backgroundColor: 'var(--danger-light)',
          color: 'var(--danger-text)',
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
          color: 'var(--gray-900)',
          marginBottom: '0.5rem',
          lineHeight: 1.2
        }}>
          Acceso Denegado
        </h2>

        <p style={{
          color: 'var(--gray-500)',
          fontSize: '0.95rem',
          marginBottom: '1.5rem',
          lineHeight: 1.5
        }}>
          No tienes los permisos requeridos para acceder a esta sección o ejecutar esta acción.
        </p>

        {/* Detalle de Roles */}
        <div style={{
          background: 'var(--gray-50)',
          border: '1px solid var(--gray-200)',
          borderRadius: '12px',
          padding: '1rem',
          textAlign: 'left',
          marginBottom: '1.75rem',
          fontSize: '0.88rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--gray-700)' }}>
            <UserCheck size={16} color="var(--blue-text)" />
            <span>Tu Rol Actual:</span>
            <strong style={{ color: 'var(--blue-text)' }}>{user?.role || 'Sin Rol'}</strong>
          </div>

          {requiredRoles.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gray-500)' }}>
              <Lock size={16} color="var(--danger-text)" />
              <span>Roles Autorizados:</span>
              <strong style={{ color: 'var(--gray-900)' }}>{requiredRoles.join(', ')}</strong>
            </div>
          )}

          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--gray-300)', fontSize: '0.78rem', color: 'var(--gray-400)' }}>
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
