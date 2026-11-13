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
        backgroundColor: 'var(--gray-50)',
        borderRadius: '12px',
        border: '1px dashed var(--gray-300)',
        margin: '1rem 0'
      }}
    >
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          backgroundColor: 'var(--gray-200)',
          color: 'var(--gray-500)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem'
        }}
        aria-hidden="true"
      >
        <Icon size={28} />
      </div>

      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '0.4rem' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--gray-500)', fontSize: '0.88rem', maxWidth: '380px', marginBottom: actionLabel ? '1.25rem' : '0', lineHeight: 1.5 }}>
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

