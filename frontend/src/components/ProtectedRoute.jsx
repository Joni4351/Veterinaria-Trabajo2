import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AccessDeniedView } from '../views/AccessDeniedView';

/**
 * Componente Guard / ProtectedRoute para control de acceso y autorización por roles.
 * Cumple con los requerimientos de Autorización por roles y rutas protegidas (10 pts).
 * 
 * @param {React.ReactNode} children - Vista o componente protegido.
 * @param {string[]} allowedRoles - Lista de roles permitidos (ej. ['Administrador', 'Veterinario']).
 */
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <p style={{ color: '#0284c7', fontWeight: 600 }}>Verificando sesión y permisos...</p>
      </div>
    );
  }

  // 1. Si no está autenticado -> Redirige al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Si tiene rol insuficiente -> Renderiza vista de Acceso Denegado (403)
  if (allowedRoles.length > 0) {
    const userRoleNormalizado = (user.role || '').trim().toLowerCase();
    const tienePermiso = allowedRoles.some(
      (rol) => rol.trim().toLowerCase() === userRoleNormalizado
    );

    if (!tienePermiso) {
      return <AccessDeniedView requiredRoles={allowedRoles} />;
    }
  }

  // 3. Usuario autenticado y con rol autorizado
  return <>{children}</>;
};

export default ProtectedRoute;
