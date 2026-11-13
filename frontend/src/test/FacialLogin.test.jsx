import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import { FacialLoginStep } from '../components/FacialLoginStep';
import { analyzeVideo } from '../services/faceDetectionService';

vi.mock('../services/authService', () => ({ default: { login: vi.fn(), verifyFacial: vi.fn() } }));
vi.mock('../services/faceDetectionService', () => ({ analyzeVideo: vi.fn() }));
const descriptor = Array(128).fill(.01);
function Probe() {
  const auth = useAuth();
  return <><span>{auth.user ? 'Sesión iniciada' : 'Sin sesión'}</span><button onClick={() => auth.login('test@example.com', 'password')}>Credenciales</button><button onClick={() => auth.verifyFacial('challenge', descriptor)}>Rostro</button></>;
}
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });
afterEach(() => vi.restoreAllMocks());

it('no guarda un token ni usuario mientras el rostro está pendiente', async () => {
  authService.login.mockResolvedValue({ requiresFacial: true, challenge: 'challenge', expiresIn: 120 });
  authService.verifyFacial.mockResolvedValue({ token: 'header.' + btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600, sub: '1', name: 'Prueba', role: 'Administrador' })) + '.signature' });
  render(<AuthProvider><Probe /></AuthProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Credenciales' }));
  await waitFor(() => expect(authService.login).toHaveBeenCalled());
  expect(localStorage.getItem('vet_token')).toBeNull();
  expect(localStorage.getItem('vet_user')).toBeNull();
  expect(screen.getByText('Sin sesión')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Rostro' }));
  await screen.findByText('Sesión iniciada');
  expect(localStorage.getItem('vet_token')).toBeTruthy();
});

it('verifica desde cámara y detiene sus pistas al completar el acceso', async () => {
  const stop = vi.fn(), verify = vi.fn().mockResolvedValue({}), success = vi.fn();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  analyzeVideo.mockResolvedValue(descriptor);
  render(<FacialLoginStep challenge="challenge" onVerify={verify} onCancel={vi.fn()} onSuccess={success} />);
  fireEvent.click(screen.getByRole('button', { name: 'Activar cámara' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Verificar rostro' }));
  await waitFor(() => expect(success).toHaveBeenCalled());
  expect(verify).toHaveBeenCalledWith('challenge', descriptor);
  expect(stop).toHaveBeenCalled();
});

it('denegar la cámara no verifica ni permite omitir el paso', async () => {
  const verify = vi.fn();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockRejectedValue({ name: 'NotAllowedError' }) } });
  render(<FacialLoginStep challenge="challenge" onVerify={verify} onCancel={vi.fn()} onSuccess={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Activar cámara' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Permita el acceso');
  expect(verify).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Verificar rostro' })).not.toBeInTheDocument();
});
