import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('vet_token'));
  const [loading, setLoading] = useState(true);

  // Decodificar payload JWT simple sin dependencias externas
  const parseJwt = (t) => {
    try {
      const base64Url = t.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('vet_token');
    if (savedToken) {
      const payload = parseJwt(savedToken);
      if (payload) {
        // Verificar expiración del token (exp en segundos)
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          logout();
          setLoading(false);
          return;
        }

        // En .NET ClaimTypes.Role suele mapear a URI de microsoft o 'role'
        const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role || 'Usuario';
        const name = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.name || payload.unique_name || 'Usuario';
        const email = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || payload.email || '';
        const id = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.sub || '';

        setUser({ id, name, email, role });
        setToken(savedToken);
      } else {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    const receivedToken = data.token;
    localStorage.setItem('vet_token', receivedToken);
    setToken(receivedToken);

    const payload = parseJwt(receivedToken);
    const role = payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload?.role || 'Usuario';
    const name = payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload?.name || payload?.unique_name || email;
    const userEmail = payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || payload?.email || email;
    const id = payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload?.sub || '';

    const userData = { id, name, email: userEmail, role };
    setUser(userData);
    localStorage.setItem('vet_user', JSON.stringify(userData));
    return userData;
  };

  const register = async (userData) => {
    return await authService.register(userData);
  };

  const logout = () => {
    localStorage.removeItem('vet_token');
    localStorage.removeItem('vet_user');
    setToken(null);
    setUser(null);
  };

  /**
   * Verifica si el usuario actual posee alguno de los roles requeridos.
   * @param {string|string[]} roles - Rol o array de roles (ej. 'Administrador' o ['Administrador', 'Veterinario'])
   * @returns {boolean}
   */
  const hasRole = (roles) => {
    if (!user || !user.role) return false;
    const userRole = user.role.trim().toLowerCase();
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.some(r => r.trim().toLowerCase() === userRole);
  };

  const isAdmin = hasRole('Administrador');
  const isVeterinario = hasRole('Veterinario');
  const isRecepcionista = hasRole('Recepcionista');

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      register, 
      logout,
      hasRole,
      isAdmin,
      isVeterinario,
      isRecepcionista
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
