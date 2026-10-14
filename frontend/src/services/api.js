import axios from 'axios';

// Instancia configurada para el API
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar token JWT automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vet_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para manejo global de respuestas (401 y 403)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Manejo de 401 Unauthorized (Sesión expirada o no autenticado)
    if (error.response && error.response.status === 401) {
      if (localStorage.getItem('vet_token')) {
        localStorage.removeItem('vet_token');
        localStorage.removeItem('vet_user');
        window.location.reload();
      }
    }

    // Manejo de 403 Forbidden (Acceso denegado por rol en el Backend)
    if (error.response && error.response.status === 403) {
      const endpoint = error.config?.url || 'recurso protegido';
      const metodo = error.config?.method?.toUpperCase() || 'GET';
      const mensaje = error.response?.data?.message || 
        `Acceso Denegado (403): Tu rol actual no tiene autorización para realizar la operación [${metodo} ${endpoint}] en el servidor.`;

      // Emitir evento global para que la interfaz pueda desplegar una alerta visual
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vet:forbidden', {
          detail: {
            endpoint,
            metodo,
            mensaje,
            status: 403
          }
        }));
      }
    }

    // Manejo de 429 Too Many Requests (Rate limit excedido temporalmente)
    if (error.response && error.response.status === 429) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vet:ratelimit', {
          detail: {
            mensaje: 'Has realizado demasiadas solicitudes en poco tiempo. Por favor espera unos segundos mientras el servidor procesa tus peticiones.',
            status: 429
          }
        }));
      }
    }

    return Promise.reject(error);
  }
);

export default api;
