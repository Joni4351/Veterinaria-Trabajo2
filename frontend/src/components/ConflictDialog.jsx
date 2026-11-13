import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { AccessibleDialog } from './AccessibleDialog';
import './ConflictDialog.css';

export function ConflictDialog() {
  const [queue, setQueue] = useState([]);
  const id = useId();
  const accept = useRef(null);
  useEffect(() => {
    const receive = ({ detail }) => {
      if (detail?.message) setQueue(current => [...current, detail]);
    };
    window.addEventListener('vet:conflict', receive);
    return () => window.removeEventListener('vet:conflict', receive);
  }, []);
  const current = queue[0];
  if (!current) return null;
  const close = () => setQueue(items => items.slice(1));
  return <AccessibleDialog className="modal-overlay conflict-overlay" aria-labelledby={`${id}-title`} aria-describedby={`${id}-message`} initialFocus={accept} onClose={close}>
    <div className="conflict-dialog">
      <header><span className="conflict-symbol"><AlertTriangle size={24} aria-hidden="true" /></span><button type="button" className="btn-icon" aria-label="Cerrar aviso" onClick={close}><X size={19} aria-hidden="true" /></button></header>
      <h2 id={`${id}-title`}>{current.title}</h2>
      <p id={`${id}-message`}>{current.message}</p>
      <footer><button ref={accept} type="button" className="btn btn-primary" onClick={close}>Entendido</button></footer>
    </div>
  </AccessibleDialog>;
}
