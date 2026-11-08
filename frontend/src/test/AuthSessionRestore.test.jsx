import React from 'react';
import { beforeEach, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';

const cachedUser = { id: '1', name: 'Administrador', email: 'admin@example.com', role: 'Administrador' };
const tokenFor = payload => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify(payload))}.test-signature`;
function Session() {
  const { user, token, loading } = useAuth();
  return <div><span data-testid="session">{loading ? 'Cargando' : user ? user.name : 'Sin sesión'}</span><span data-testid="token">{token || 'Sin token'}</span></div>;
}
const mount = () => render(<AuthProvider><Session /></AuthProvider>);
beforeEach(() => localStorage.clear());

it('rechaza un token vencido aunque exista un usuario guardado', () => {
  localStorage.setItem('vet_token', tokenFor({ exp: Math.floor(Date.now() / 1000) - 60 }));
  localStorage.setItem('vet_user', JSON.stringify(cachedUser));
  mount();
  expect(screen.getByTestId('session')).toHaveTextContent('Sin sesión');
  expect(screen.getByTestId('token')).toHaveTextContent('Sin token');
  expect(localStorage.getItem('vet_token')).toBeNull();
  expect(localStorage.getItem('vet_user')).toBeNull();
});

it('restaura un usuario guardado únicamente con un token vigente', () => {
  const token = tokenFor({ exp: Math.floor(Date.now() / 1000) + 3600 });
  localStorage.setItem('vet_token', token);
  localStorage.setItem('vet_user', JSON.stringify(cachedUser));
  mount();
  expect(screen.getByTestId('session')).toHaveTextContent('Administrador');
  expect(screen.getByTestId('token')).toHaveTextContent(token);
});

it.each([
  'token-invalido', 'header.payload', 'header..signature', tokenFor(null),
  tokenFor({}), tokenFor({ exp: '9999999999' }), tokenFor({ exp: 0 }),
])('descarta tokens malformados o sin expiración numérica válida (%s)', token => {
  localStorage.setItem('vet_token', token);
  localStorage.setItem('vet_user', JSON.stringify(cachedUser));
  mount();
  expect(screen.getByTestId('session')).toHaveTextContent('Sin sesión');
  expect(localStorage.getItem('vet_user')).toBeNull();
  expect(localStorage.getItem('vet_token')).toBeNull();
});

it('recupera los claims si la caché de usuario contiene JSON inválido', () => {
  localStorage.setItem('vet_token', tokenFor({ exp: Math.floor(Date.now() / 1000) + 3600, name: 'Veterinario', role: 'Veterinario', sub: '2' }));
  localStorage.setItem('vet_user', '{json inválido');
  mount();
  expect(screen.getByTestId('session')).toHaveTextContent('Veterinario');
});

it('elimina una caché de usuario huérfana cuando no hay token', () => {
  localStorage.setItem('vet_user', JSON.stringify(cachedUser));
  mount();
  expect(screen.getByTestId('session')).toHaveTextContent('Sin sesión');
  expect(localStorage.getItem('vet_user')).toBeNull();
});
