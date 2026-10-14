import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import * as AuthContext from '../context/AuthContext';

describe('ProtectedRoute Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe mostrar mensaje de carga cuando loading es true', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      loading: true,
      hasRole: () => false,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={['Administrador']}>
          <div>Contenido Protegido</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText(/verificando sesión y permisos/i)).toBeInTheDocument();
    expect(screen.queryByText('Contenido Protegido')).not.toBeInTheDocument();
  });

  it('debe redirigir a /login cuando el usuario no está autenticado (401)', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      loading: false,
      hasRole: () => false,
    });

    render(
      <MemoryRouter initialEntries={['/privado']}>
        <Routes>
          <Route path="/login" element={<div>Página de Login</div>} />
          <Route
            path="/privado"
            element={
              <ProtectedRoute allowedRoles={['Administrador']}>
                <div>Contenido Protegido</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Página de Login')).toBeInTheDocument();
    expect(screen.queryByText('Contenido Protegido')).not.toBeInTheDocument();
  });

  it('debe renderizar la vista de Acceso Denegado (403) si el rol no tiene permisos', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { name: 'Juan Recepcionista', role: 'Recepcionista' },
      loading: false,
      hasRole: (roles) => roles.includes('Recepcionista'),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={['Administrador']}>
          <div>Panel Administrativo Super Secreto</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    // Debe mostrar la vista de error 403
    expect(screen.getByText(/error 403 - forbidden/i)).toBeInTheDocument();
    expect(screen.getByText(/acceso denegado/i)).toBeInTheDocument();
    expect(screen.getByText('Recepcionista')).toBeInTheDocument();
    expect(screen.queryByText('Panel Administrativo Super Secreto')).not.toBeInTheDocument();
  });

  it('debe permitir renderizar el contenido cuando el usuario cuenta con el rol requerido', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { name: 'Dra. María Veterinario', role: 'Veterinario' },
      loading: false,
      hasRole: (roles) => roles.includes('Veterinario'),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={['Administrador', 'Veterinario']}>
          <div>Ficha Clínica del Paciente</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Ficha Clínica del Paciente')).toBeInTheDocument();
    expect(screen.queryByText(/acceso denegado/i)).not.toBeInTheDocument();
  });
});
