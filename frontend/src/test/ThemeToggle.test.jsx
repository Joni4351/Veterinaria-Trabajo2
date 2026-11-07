import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';

beforeEach(() => {
  localStorage.removeItem('vet_theme');
  window.matchMedia = vi.fn(() => ({ matches: false }));
  delete document.documentElement.dataset.theme;
});

it('alterna modo oscuro/claro y conserva la preferencia al volver a abrir', () => {
  const mounted = render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Activar modo oscuro' }));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(localStorage.getItem('vet_theme')).toBe('dark');
  expect(screen.getByRole('button', { name: 'Activar modo claro' })).toHaveAttribute('aria-pressed', 'true');
  mounted.unmount();
  render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
  expect(document.documentElement.dataset.theme).toBe('dark');
  fireEvent.click(screen.getByRole('button', { name: 'Activar modo claro' }));
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(localStorage.getItem('vet_theme')).toBe('light');
});

it('usa la preferencia del sistema si todavía no hay una selección guardada', () => {
  window.matchMedia = vi.fn(() => ({ matches: true }));
  render(<ThemeProvider><ThemeToggle /></ThemeProvider>);
  expect(document.documentElement.dataset.theme).toBe('dark');
});
