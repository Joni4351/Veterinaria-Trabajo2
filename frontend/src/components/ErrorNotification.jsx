import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

export function ErrorNotification() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const receive = event => setMessage(event.detail?.message || '');
    window.addEventListener('vet:apierror', receive);
    return () => window.removeEventListener('vet:apierror', receive);
  }, []);
  return <div className="error-notification-region" aria-live="assertive" aria-atomic="true">{message &&
    <div className="error-notification" role="alert"><AlertCircle size={22} aria-hidden="true" /><p>{message}</p><button type="button" aria-label="Cerrar mensaje de error" onClick={() => setMessage('')}><X size={18} aria-hidden="true" /></button></div>
  }</div>;
}
