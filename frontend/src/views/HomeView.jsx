import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, PawPrint, Settings2, ArrowUpRight, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import VeterinaryPet3D from '../components/VeterinaryPet3D';
import './HomeView.css';

export const HomeView = () => {
  const { user } = useAuth();
  const shortcuts = [
    { to: '/citas', label: 'Ver agenda', note: 'Organiza las próximas atenciones.', icon: CalendarDays, tone: 'teal' },
    { to: '/pacientes', label: 'Ver pacientes', note: 'Encuentra sus datos y antecedentes.', icon: PawPrint, tone: 'blue' },
    ...(user?.role === 'Administrador' ? [{ to: '/admin', label: 'Ir a Administración', note: 'Consulta indicadores y gestiona el sistema.', icon: Settings2, tone: 'violet' }] : [])
  ];
  return <section className="sanctuary" aria-label="Santuario">
    <div className="sanctuary-welcome">
      <span className="sanctuary-eyebrow"><Heart size={14} aria-hidden="true" /> UN ESPACIO PARA CUIDAR</span>
      <h1>Bienvenido a VetClinic</h1>
      <p className="sanctuary-greeting">Hola, <strong>{user?.name || 'bienvenido'}</strong>.</p>
      <p className="sanctuary-intro">Todo listo para acompañarte en el cuidado de tus pacientes.</p>
      <div className="sanctuary-shortcut-heading"><h2>¿Por dónde comenzamos?</h2><span>Accesos rápidos</span></div>
      <nav className="sanctuary-shortcuts" aria-label="Accesos rápidos del santuario">
        {shortcuts.map(({ to, label, note, icon: Icon, tone }) => <Link key={to} to={to} className={`sanctuary-shortcut sanctuary-${tone}`}>
          <span className="sanctuary-shortcut-icon"><Icon size={21} aria-hidden="true" /></span>
          <span className="sanctuary-shortcut-copy"><strong>{label}</strong><small>{note}</small></span>
          <ArrowUpRight size={18} className="sanctuary-shortcut-arrow" aria-hidden="true" />
        </Link>)}
      </nav>
    </div>
    <div className="sanctuary-companion"><VeterinaryPet3D /></div>
  </section>;
};
