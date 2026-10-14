import api from './api';

export const pacientesService = {
  /**
   * Obtiene la lista de pacientes con filtros opcionales
   * @param {Object} filters - { nombre, especie, raza, dueno, clienteId }
   */
  async getAll(filters = {}) {
    const params = {};
    if (filters.nombre) params.nombre = filters.nombre;
    if (filters.especie) params.especie = filters.especie;
    if (filters.raza) params.raza = filters.raza;
    if (filters.dueno) params.dueno = filters.dueno;
    if (filters.clienteId) params.clienteId = filters.clienteId;

    const res = await api.get('/api/v1/pacientes', { params });
    return res.data;
  },

  /**
   * Obtiene un paciente por su ID
   * @param {number|string} id 
   */
  async getById(id) {
    const res = await api.get(`/api/v1/pacientes/${id}`);
    return res.data;
  },

  /**
   * Registra un nuevo paciente
   * @param {Object} data 
   */
  async create(data) {
    const res = await api.post('/api/v1/pacientes', data);
    return res.data;
  },

  /**
   * Actualiza los datos de un paciente existente
   * @param {number|string} id 
   * @param {Object} data 
   */
  async update(id, data) {
    const res = await api.put(`/api/v1/pacientes/${id}`, data);
    return res.data;
  },

  /**
   * Elimina un paciente
   * @param {number|string} id 
   */
  async delete(id) {
    const res = await api.delete(`/api/v1/pacientes/${id}`);
    return res.data;
  }
};

export default pacientesService;
