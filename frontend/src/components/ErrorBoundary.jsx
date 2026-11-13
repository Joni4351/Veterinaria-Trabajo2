import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó una excepción:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div 
          role="alert" 
          aria-live="assertive"
          style={{ 
            padding: '2.5rem', 
            maxWidth: '620px', 
            margin: '2rem auto', 
            background: 'var(--topbar-bg)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid var(--danger-border)',
            boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.15)',
            textAlign: 'center'
          }}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--danger-light)',
            color: 'var(--danger-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <AlertCircle size={32} />
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger-text)', marginBottom: '0.5rem' }}>
            Ocurrió un error al cargar la vista
          </h3>

          <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            No te preocupes, tus datos están a salvo. Puedes intentar recargar el módulo o volver al panel principal.
          </p>

          {this.state.error?.message && (
            <div style={{
              background: 'var(--gray-50)',
              border: '1px solid var(--gray-200)',
              borderRadius: '8px',
              padding: '0.75rem',
              fontSize: '0.8rem',
              color: 'var(--gray-600)',
              fontFamily: 'monospace',
              marginBottom: '1.5rem',
              textAlign: 'left',
              wordBreak: 'break-word'
            }}>
              {this.state.error.message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary" 
              onClick={this.handleReset}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RotateCcw size={16} /> Reintentar
            </button>
            <a 
              href="/dashboard"
              className="btn btn-secondary" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <Home size={16} /> Ir al Inicio
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
