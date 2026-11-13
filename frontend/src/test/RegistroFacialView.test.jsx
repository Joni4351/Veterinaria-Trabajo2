import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegistroFacialView } from '../views/RegistroFacialView';
import { registroFacialService as service } from '../services/registroFacialService';
import { analyzePhoto } from '../services/faceDetectionService';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../services/registroFacialService', () => ({ registroFacialService: {
  usuarios: vi.fn(), consultar: vi.fn(), guardar: vi.fn(), eliminar: vi.fn(),
} }));
vi.mock('../services/faceDetectionService', async importOriginal => ({
  ...await importOriginal(), analyzePhoto: vi.fn(),
}));

const account = { id: 2, nombreCompleto: 'Ana Pérez', email: 'ana@example.com', rol: 'Veterinario', registroFacial: null };
const record = { id: 5, activo: true, fechaRegistro: '2026-11-05T10:00:00Z', fechaActualizacion: null };
const mount = () => render(<MemoryRouter><RegistroFacialView /></MemoryRouter>);
async function choose() { fireEvent.click(await screen.findByRole('button', { name: /Ana Pérez/ })); await screen.findByText('Sin registro facial', { selector: 'dd' }); }
async function photoAndConsent() {
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.change(screen.getByLabelText('Fotografía del usuario'), { target: { files: [new File(['photo'], 'face.jpg', { type: 'image/jpeg' })] } });
  fireEvent.click(screen.getByRole('button', { name: 'Analizar fotografía' }));
  await screen.findByText(/Rostro detectado correctamente/);
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: { role: 'Administrador' }, loading: false });
  service.usuarios.mockResolvedValue({ usuarios: [account], total: 1 });
  service.consultar.mockResolvedValue(null);
  service.guardar.mockResolvedValue(record);
  service.eliminar.mockResolvedValue();
  analyzePhoto.mockResolvedValue(Array(128).fill(0.1));
  URL.createObjectURL = vi.fn(() => 'blob:photo');
  URL.revokeObjectURL = vi.fn();
});

describe('Registro Facial', () => {
  it('no consulta información biométrica para roles distintos de Administrador', () => {
    useAuth.mockReturnValue({ user: { role: 'Veterinario' }, loading: false });
    mount(); expect(service.usuarios).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Buscar usuario')).not.toBeInTheDocument();
  });

  it('exige consentimiento, analiza y guarda solo el descriptor tras confirmación', async () => {
    mount(); await choose();
    expect(screen.getByLabelText('Fotografía del usuario')).toBeDisabled();
    await photoAndConsent();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar registro facial' }));
    expect(service.guardar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar', exact: true }));
    await screen.findByText('Registro facial guardado correctamente.');
    expect(service.guardar).toHaveBeenCalledWith(2, Array(128).fill(0.1), null);
    expect(screen.queryByAltText('Vista previa de la fotografía seleccionada')).not.toBeInTheDocument();
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo'));
  });

  it('rechaza formatos incorrectos y fotografías mayores a 5 MB', async () => {
    mount(); await choose(); fireEvent.click(screen.getByRole('checkbox'));
    const input = screen.getByLabelText('Fotografía del usuario');
    fireEvent.change(input, { target: { files: [new File(['gif'], 'face.gif', { type: 'image/gif' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('JPG');
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('5 MB');
    expect(analyzePhoto).not.toHaveBeenCalled();
  });

  it('bloquea el guardado si la detección falla', async () => {
    analyzePhoto.mockRejectedValue(new Error('La fotografía debe contener exactamente un rostro.'));
    mount(); await choose(); fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('Fotografía del usuario'), { target: { files: [new File(['photo'], 'face.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Analizar fotografía' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('exactamente un rostro');
    expect(screen.getByRole('button', { name: 'Confirmar registro facial' })).toBeDisabled();
  });

  it('solicita confirmación al reemplazar y al eliminar, conserva la cuenta', async () => {
    service.consultar.mockResolvedValue(record);
    mount(); fireEvent.click(await screen.findByRole('button', { name: /Ana Pérez/ }));
    await screen.findByText('Registrado · Activo');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('Nueva fotografía para reemplazar el rostro'), { target: { files: [new File(['photo'], 'face.jpg', { type: 'image/jpeg' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Analizar fotografía' }));
    await screen.findByText(/Rostro detectado correctamente/);
    fireEvent.click(screen.getByRole('button', { name: 'Reemplazar registro facial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(service.guardar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reemplazar registro facial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar', exact: true }));
    await screen.findByText('Registro facial actualizado correctamente.');
    expect(service.guardar).toHaveBeenCalledWith(2, Array(128).fill(0.1), record);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar registro facial' }));
    expect(service.eliminar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar datos faciales' }));
    await screen.findByText('Registro facial eliminado. La cuenta del usuario se conserva.');
    expect(service.eliminar).toHaveBeenCalledWith(2);
  });

  it('envía la búsqueda al servidor por nombre o correo', async () => {
    mount(); await screen.findByRole('button', { name: /Ana Pérez/ });
    fireEvent.change(screen.getByLabelText('Buscar usuario'), { target: { value: 'ana@example.com' } });
    await waitFor(() => expect(service.usuarios).toHaveBeenLastCalledWith('ana@example.com', 1, expect.any(AbortSignal)));
  });
});
