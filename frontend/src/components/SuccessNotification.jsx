import React, { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import './SuccessNotification.css';

export function SuccessNotification() {
  const [notice, setNotice] = useState(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const receive = event => {
      if (typeof event.detail?.message === 'string' && event.detail.message.trim()) {
        setNotice({ message: event.detail.message }); setPaused(false);
      }
    };
    window.addEventListener('vet:success', receive);
    return () => window.removeEventListener('vet:success', receive);
  }, []);
  useEffect(() => {
    if (!notice || paused) return;
    const timer = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [notice, paused]);
  return <div className="success-notification-region" aria-live="polite" aria-atomic="true">
    {notice && <div role="status" className="success-notification" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
      <CheckCircle2 size={22} aria-hidden="true" />
      <div><strong>Operación completada</strong><p>{notice.message}</p></div>
      <button type="button" aria-label="Cerrar confirmación" onClick={() => setNotice(null)}><X size={18} aria-hidden="true" /></button>
    </div>}
  </div>;
}
