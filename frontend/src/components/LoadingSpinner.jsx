import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ message = 'Cargando datos...', size = 28 }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        gap: '0.75rem',
        color: '#0284c7'
      }}
    >
      <Loader2
        size={size}
        style={{
          animation: 'spin 1s linear infinite'
        }}
        aria-hidden="true"
      />
      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>
        {message}
      </span>
      <span className="sr-only">Cargando contenido</span>
    </div>
  );
};

export default LoadingSpinner;

