import api from './api';

export const clientesService = {
  async getAll(filters = {}) {
    const params = {};
    if (filters.nombre) params.nombre = filters.nombre;
    if (filters.documento) params.documento = filters.documento;
    if (filters.email) params.email = filters.email;
    if (filters.telefono) params.telefono = filters.telefono;

    const res = await api.get('/api/v1/clientes', { params });
    return res.data;
  },

  async getById(id) {
    const res = await api.get(`/api/v1/clientes/${id}`);
    return res.data;
  },

  async create(data) {
    const res = await api.post('/api/v1/clientes', data);
    return res.data;
  },

  async update(id, data) {
    const res = await api.put(`/api/v1/clientes/${id}`, data);
    return res.data;
  },

  async delete(id) {
    const res = await api.delete(`/api/v1/clientes/${id}`);
    return res.data;
  }
};

export default clientesService;
