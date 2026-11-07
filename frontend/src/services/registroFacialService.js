import api from './api';

const base = '/api/v1/registro-facial';
export const registroFacialService = {
  async usuarios(buscar, pagina, signal) {
    return (await api.get(`${base}/usuarios`, { params: { buscar, pagina }, signal })).data;
  },
  async consultar(id, signal) { return (await api.get(`${base}/${id}`, { signal })).data.registroFacial; },
  async guardar(id, descriptor, existente) {
    const payload = {
      descriptor, consentimiento: true, consentimientoVersion: 'registro-facial-v1',
      fechaActualizacion: existente?.fechaActualizacion ?? null,
    };
    return (await api[existente ? 'put' : 'post'](`${base}/${id}`, payload)).data.registroFacial;
  },
  async eliminar(id) { await api.delete(`${base}/${id}`); },
};
