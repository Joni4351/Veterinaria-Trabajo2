import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const titles = { login: 'Iniciar sesión', dashboard: 'Santuario', pacientes: 'Pacientes', clientes: 'Clientes', citas: 'Agenda de citas', consultas: 'Consultas y recetas', insumos: 'Inventario e insumos', facturas: 'Facturación', admin: 'Administración' };
export function PageAccessibility() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);
  useEffect(() => {
    document.title = `${titles[pathname.split('/')[1]] || (pathname === '/' ? 'Inicio' : 'Página no encontrada')} | VetClinic Pro`;
    let frame;
    if (previous.current !== pathname) frame = requestAnimationFrame(() => document.querySelector('main')?.focus());
    previous.current = pathname;
    return () => { if (frame) cancelAnimationFrame(frame); };
  }, [pathname]);
  return null;
}
