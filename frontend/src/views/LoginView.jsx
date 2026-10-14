import React, { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginSchema, registerSchema } from '../schemas/authSchema';
import { HeartPulse, Lock, Mail, User, ShieldAlert, ArrowRight, Sparkles } from 'lucide-react';

export const LoginView = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [rolId, setRolId] = useState(1); // 1 = Administrador, 2 = Veterinario, 3 = Recepcionista
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const formId = useId();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    setFieldErrors({});

    // 1. Validación en el cliente con Zod
    if (isRegister) {
      const result = registerSchema.safeParse({ nombreCompleto, email, password, rolId: Number(rolId) });
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
        setGlobalError('Por favor complete los campos requeridos correctamente.');
        return;
      }
    } else {
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
    }

    setLoading(true);

    try {
      if (isRegister) {
        await register({
          rolId: Number(rolId),
          nombreCompleto,
          email,
          password
        });
        // Auto-login tras registrarse
        await login(email, password);
        navigate('/dashboard');
      } else {
        await login(email, password);
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setGlobalError('Credenciales incorrectas. Verifique su correo y contraseña.');
      } else if (err.response?.status === 429) {
        setGlobalError('Límite de solicitudes alcanzado (Rate Limiting). Espere 1 minuto antes de reintentar.');
      } else {
        setGlobalError(err.message || 'Error de conexión con el servidor veterinario.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
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
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(9, 21, 18, 0.85)',
          border: '1px solid rgba(0, 245, 160, 0.25)',
          borderRadius: '24px',
          padding: '2.5rem 2.25rem',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 245, 160, 0.12)',
        }}
      >
        {/* Brand Header AURA VET */}
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(0, 245, 160, 0.25), rgba(5, 242, 175, 0.05))',
              border: '1px solid rgba(0, 245, 160, 0.45)',
              color: '#00f5a0',
              marginBottom: '1rem',
              boxShadow: '0 0 20px rgba(0, 245, 160, 0.35)',
            }}
            aria-hidden="true"
          >
            <HeartPulse size={32} />
          </div>
          <h1
            style={{
              fontSize: '1.8rem',
              fontWeight: 900,
              letterSpacing: '0.02em',
              background: 'linear-gradient(135deg, #ffffff 40%, #00f5a0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {isRegister ? 'Crear Cuenta Cuántica' : 'AURA VET — Clínica Veterinaria'}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.35rem' }}>
            {isRegister
              ? 'Regístrese para gestionar pacientes y telemetría clínica'
              : 'Bio-Resonancia e Inteligencia Clínica Veterinaria'}
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
              background: 'rgba(153, 27, 27, 0.85)',
              border: '1px solid #ef4444',
              borderRadius: '12px',
              color: '#ffffff',
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{globalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <>
              {/* Campo Nombre Completo */}
              <div className="form-group">
                <label htmlFor={`${formId}-nombreCompleto`} className="form-label" style={{ color: '#e2e8f0' }}>
                  Nombre Completo <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} aria-hidden="true" />
                  <input
                    id={`${formId}-nombreCompleto`}
                    type="text"
                    className={`form-input ${fieldErrors.nombreCompleto ? 'border-danger' : ''}`}
                    style={{ paddingLeft: '2.5rem', minHeight: '44px' }}
                    placeholder="Ej. Dr. Carlos Mendoza"
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    aria-invalid={!!fieldErrors.nombreCompleto}
                    aria-describedby={fieldErrors.nombreCompleto ? `${formId}-nombreCompleto-error` : undefined}
                    required
                  />
                </div>
                {fieldErrors.nombreCompleto && (
                  <span id={`${formId}-nombreCompleto-error`} role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                    {fieldErrors.nombreCompleto}
                  </span>
                )}
              </div>

              {/* Campo Rol */}
              <div className="form-group">
                <label htmlFor={`${formId}-rolId`} className="form-label" style={{ color: '#e2e8f0' }}>
                  Rol del Usuario <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  id={`${formId}-rolId`}
                  className="form-select"
                  style={{ minHeight: '44px' }}
                  value={rolId}
                  onChange={(e) => setRolId(e.target.value)}
                >
                  <option value={1}>1 - Administrador (Acceso total y configuración)</option>
                  <option value={2}>2 - Veterinario (Consultas y recetas)</option>
                  <option value={3}>3 - Recepcionista (Citas y clientes)</option>
                </select>
              </div>
            </>
          )}

          {/* Campo Email */}
          <div className="form-group">
            <label htmlFor={`${formId}-email`} className="form-label" style={{ color: '#e2e8f0' }}>
              Correo Electrónico <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} aria-hidden="true" />
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
              <span id={`${formId}-email-error`} role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Campo Contraseña */}
          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label htmlFor={`${formId}-password`} className="form-label" style={{ color: '#e2e8f0' }}>
              Contraseña <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} aria-hidden="true" />
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
              <span id={`${formId}-password-error`} role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                {fieldErrors.password}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              minHeight: '44px', 
              fontSize: '0.95rem',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #00f5a0, #05f2af)',
              color: '#04100c',
              fontWeight: 700,
              boxShadow: '0 0 25px rgba(0, 245, 160, 0.4)',
            }}
            disabled={loading}
          >
            {loading ? 'Procesando...' : (
              <>
                <span>{isRegister ? 'Completar Registro' : 'Iniciar Sesión'}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <footer style={{ marginTop: '1.75rem', textAlign: 'center', borderTop: '1px solid rgba(45, 212, 191, 0.15)', paddingTop: '1.25rem' }}>
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setGlobalError('');
              setFieldErrors({});
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#00f5a0',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '44px',
              minWidth: '44px',
              padding: '0.5rem',
              transition: 'color 0.2s ease',
            }}
          >
            {isRegister ? '¿Ya tienes una cuenta? Inicia sesión aquí' : '¿No tienes cuenta? Regístrate aquí'}
          </button>
        </footer>
      </div>
    </main>
  );
};

export default LoginView;
