import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No hay datos disponibles',
  description = 'No se encontraron registros para mostrar con los filtros aplicados.',
  actionLabel,
  onAction
}) => {
  return (
    <div
      role="region"
      aria-label="Estado vacío"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3.5rem 1.5rem',
        textAlign: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px dashed #cbd5e1',
        margin: '1rem 0'
      }}
    >
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          backgroundColor: '#e2e8f0',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem'
        }}
        aria-hidden="true"
      >
        <Icon size={28} />
      </div>

      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
        {title}
      </h3>
      <p style={{ color: '#64748b', fontSize: '0.88rem', maxWidth: '380px', marginBottom: actionLabel ? '1.25rem' : '0', lineHeight: 1.5 }}>
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={onAction}
          style={{ minHeight: '44px', minWidth: '44px' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
