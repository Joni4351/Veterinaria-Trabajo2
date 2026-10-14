import api from './api';

export const authService = {
  async login(email, password) {
    const res = await api.post('/api/v1/usuarios/login', { email, password });
    return res.data;
  },

  async register(userData) {
    const res = await api.post('/api/v1/usuarios/register', userData);
    return res.data;
  },

  async getUsuarios(params = {}) {
    const res = await api.get('/api/v1/usuarios', { params });
    return res.data;
  }
};

export default authService;

