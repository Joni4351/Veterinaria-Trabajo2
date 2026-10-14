import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Modal accesible de confirmación para acciones destructivas (WCAG 2.2 AA).
 */
export const ConfirmModal = ({
  isOpen,
  title = '¿Confirmar acción?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  loading = false,
  danger = true
}) => {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Poner foco en el botón de cancelar por seguridad
      cancelButtonRef.current?.focus();

      // Cerrar al presionar la tecla Escape
      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && !loading) {
          onCancel();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        style={{ maxWidth: '420px', padding: '1.5rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: danger ? '#fee2e2' : '#e0f2fe',
              color: danger ? '#ef4444' : '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
            aria-hidden="true"
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3
              id="confirm-modal-title"
              style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}
            >
              {title}
            </h3>
          </div>
        </div>

        <p id="confirm-modal-desc" style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            ref={cancelButtonRef}
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={danger ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={onConfirm}
            disabled={loading}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

