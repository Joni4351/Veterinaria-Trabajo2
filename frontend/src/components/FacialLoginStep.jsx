import React, { useEffect, useRef, useState } from 'react';
import { Camera, ScanFace } from 'lucide-react';
import { analyzeVideo } from '../services/faceDetectionService';

export function FacialLoginStep({ challenge, expiresIn = 120, onVerify, onCancel, onSuccess }) {
  const video = useRef(null);
  const stream = useRef(null);
  const alive = useRef(true);
  const deadline = useRef(Date.now() + expiresIn * 1000);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [consumed, setConsumed] = useState(false);
  const stop = () => { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; };
  useEffect(() => {
    alive.current = true;
    deadline.current = Date.now() + expiresIn * 1000;
    const timer = setTimeout(() => { setExpired(true); stop(); setReady(false); }, expiresIn * 1000);
    return () => { alive.current = false; clearTimeout(timer); stop(); };
  }, [challenge, expiresIn]);
  const start = async () => {
    setBusy(true); setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('La cámara requiere HTTPS o localhost y un navegador compatible.');
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (!alive.current || Date.now() >= deadline.current) { media.getTracks().forEach(track => track.stop()); return; }
      stop(); stream.current = media; video.current.srcObject = media; await video.current.play();
      if (alive.current) setReady(true);
    } catch (err) {
      stop();
      if (alive.current) setError(err.name === 'NotAllowedError' ? 'Permita el acceso a la cámara para verificar su rostro.' : err.message || 'No se pudo abrir la cámara.');
    } finally { if (alive.current) setBusy(false); }
  };
  const verify = async () => {
    setBusy(true); setError('');
    let submitted = false;
    try {
      const descriptor = await analyzeVideo(video.current);
      if (!alive.current || Date.now() >= deadline.current) return;
      submitted = true;
      await onVerify(challenge, descriptor);
      stop();
      if (alive.current) onSuccess();
    } catch (err) {
      if (!alive.current) return;
      if (submitted) { setConsumed(true); stop(); setReady(false); }
      setError(submitted ? (err.response?.status === 401 ? 'El rostro no coincide o la verificación venció. Vuelva a iniciar sesión.' : 'No se pudo completar la verificación. Vuelva a iniciar sesión.') : err.message);
    } finally { if (alive.current) setBusy(false); }
  };
  return <section aria-labelledby="facial-login-title">
    <h2 id="facial-login-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20 }}><ScanFace size={24} />Verificación facial</h2>
    <p style={{ color: 'var(--gray-600)', fontSize: 14, margin: '16px 0' }}>Su cuenta tiene un rostro registrado. Mire de frente a la cámara para completar el acceso. La imagen se procesa en este dispositivo y no se guarda.</p>
    <video ref={video} autoPlay muted playsInline aria-label="Vista previa de la cámara" style={{ width: '100%', borderRadius: 12, background: 'var(--gray-100)', aspectRatio: '4 / 3', objectFit: 'cover', transform: 'scaleX(-1)' }} />
    {error && <p role="alert" className="alert alert-danger">{error}</p>}
    {expired && <p role="alert">El paso facial venció. Vuelva a iniciar sesión.</p>}
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
      {!ready ? <button className="btn btn-primary" disabled={busy || expired || consumed} onClick={start}><Camera size={18} />Activar cámara</button> : <button className="btn btn-primary" disabled={busy || expired || consumed} onClick={verify}>{busy ? 'Verificando…' : 'Verificar rostro'}</button>}
      <button className="btn btn-secondary" disabled={busy} onClick={() => { stop(); onCancel(); }}>Volver al inicio de sesión</button>
    </div>
  </section>;
}
