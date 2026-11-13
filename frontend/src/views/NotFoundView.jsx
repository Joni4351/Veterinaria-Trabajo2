import React from 'react';
import { Link } from 'react-router-dom';
export function NotFoundView() {
  return <section className="card" style={{ padding: 28 }}><h1>Página no encontrada</h1><p>La dirección solicitada no corresponde a un módulo de VetClinic.</p><Link className="btn btn-primary" to="/dashboard">Volver al Santuario</Link></section>;
}
