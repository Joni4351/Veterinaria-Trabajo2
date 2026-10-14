import api from './api';

export const citasService = {
  async getAll(filters = {}) {
    const res = await api.get('/api/v1/citas', { params: filters });
    return res.data;
  },

  async getById(id) {
    const res = await api.get(`/api/v1/citas/${id}`);
    return res.data;
  },

  async create(data) {
    const res = await api.post('/api/v1/citas', data);
    return res.data;
  },

  async update(id, data) {
    const res = await api.put(`/api/v1/citas/${id}`, data);
    return res.data;
  },

  async delete(id) {
    const res = await api.delete(`/api/v1/citas/${id}`);
    return res.data;
  }
};

export default citasService;
