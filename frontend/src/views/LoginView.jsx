import { AccessibleForm, RequiredIndicator, SubmitButton } from "../components/AccessibleForm";
import React, { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginSchema } from '../schemas/authSchema';
import { ThemeToggle } from '../components/ThemeToggle';
import { FacialLoginStep } from '../components/FacialLoginStep';
import { HeartPulse, Lock, Mail, ShieldAlert, ArrowRight } from 'lucide-react';

export const LoginView = () => {
  const { login, verifyFacial } = useAuth();
  const [facial, setFacial] = useState(null);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const formId = useId();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    setFieldErrors({});

    // 1. Validación en el cliente con Zod
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errs = {};
      const issues = result.error.issues || result.error.errors || [];
      issues.forEach(err => {
        const field = err.path[0];
        if (!errs[field]) {
          errs[field] = err.message;
        }
      });
      setFieldErrors(errs);
      setGlobalError('Por favor ingrese un correo y contraseña válidos.');
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);
      setPassword('');
      if (result?.requiresFacial) setFacial(result);
      else navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 401) {
        setGlobalError('Credenciales incorrectas. Verifique su correo y contraseña.');
      } else if (err.response?.status === 429) {
        setGlobalError('Ha realizado demasiados intentos. Espere un minuto antes de volver a intentarlo.');
      } else {
        setGlobalError(err.message || 'Error de conexión con el servidor veterinario.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      tabIndex={-1}
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <ThemeToggle className="theme-toggle-login" />
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--gray-200)',
          borderRadius: '24px',
          padding: '2.5rem 2.25rem',
          boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.04)',
        }}
      >
        {/* Brand Header VetClinic */}
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '58px',
              height: '58px',
              borderRadius: '16px',
              background: 'var(--primary-light)',
              border: '1px solid var(--primary-border)',
              color: 'var(--teal-text)',
              marginBottom: '1rem',
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.15)',
            }}
            aria-hidden="true"
          >
            <HeartPulse size={30} />
          </div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--gray-900)',
            }}
          >
            VetClinic Pro — Clínica Veterinaria
          </h1>
          <p style={{ color: 'var(--gray-600)', fontSize: '0.88rem', marginTop: '0.35rem', fontWeight: 500 }}>
            Sistema Integral de Cuidado y Gestión Veterinaria
          </p>
        </header>

        {globalError && (
          <div
            role="alert"
            aria-live="assertive"
            className="alert alert-danger"
            style={{
              marginBottom: '1.5rem',
              fontSize: '0.85rem',
              background: 'var(--danger-light)',
              border: '1px solid var(--danger-border)',
              borderRadius: '12px',
              color: 'var(--danger-text)',
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{globalError}</span>
          </div>
        )}

        {facial ? <FacialLoginStep challenge={facial.challenge} expiresIn={facial.expiresIn} onVerify={verifyFacial}
          onCancel={() => { setFacial(null); setPassword(''); setGlobalError(''); }} onSuccess={() => navigate('/dashboard')} /> : <AccessibleForm onSubmit={handleSubmit} noValidate>
          {/* Campo Email */}
          <div className="form-group">
            <label htmlFor={`${formId}-email`} className="form-label" style={{ color: 'var(--gray-700)' }}>
              Correo Electrónico <RequiredIndicator />
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--gray-400)' }} aria-hidden="true" />
              <input
                id={`${formId}-email`}
                type="email"
                className={`form-input ${fieldErrors.email ? 'border-danger' : ''}`}
                style={{ paddingLeft: '2.5rem', minHeight: '44px' }}
                placeholder="veterinaria@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? `${formId}-email-error` : undefined}
                required
              />
            </div>
            {fieldErrors.email && (
              <span id={`${formId}-email-error`} role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Campo Contraseña */}
          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label htmlFor={`${formId}-password`} className="form-label" style={{ color: 'var(--gray-700)' }}>
              Contraseña <RequiredIndicator />
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--gray-400)' }} aria-hidden="true" />
              <input
                id={`${formId}-password`}
                type="password"
                className={`form-input ${fieldErrors.password ? 'border-danger' : ''}`}
                style={{ paddingLeft: '2.5rem', minHeight: '44px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? `${formId}-password-error` : undefined}
                required
              />
            </div>
            {fieldErrors.password && (
              <span id={`${formId}-password-error`} role="alert" style={{ color: 'var(--danger-text)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                {fieldErrors.password}
              </span>
            )}
          </div>

          <SubmitButton
            type="submit"
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              minHeight: '44px', 
              fontSize: '0.95rem',
              borderRadius: '999px',
              background: '#0d9488',
              color: '#ffffff',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)',
            }}
            disabled={loading}
          >
            {loading ? 'Procesando...' : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </SubmitButton>
        </AccessibleForm>}


      </div>
    </main>
  );
};

export default LoginView;
