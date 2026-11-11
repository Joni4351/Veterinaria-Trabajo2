import React, { createContext, useContext, useRef } from 'react';
import { useAsyncActionLock } from '../hooks/useAsyncActionLock';

const SubmissionContext = createContext(false);

export function SubmitButton({ children, disabled, pendingLabel = 'Procesando…', ...props }) {
  const pending = useContext(SubmissionContext);
  return <button {...props} type="submit" disabled={disabled || pending} aria-busy={pending}>
    {pending ? pendingLabel : children}
  </button>;
}

export function RequiredIndicator() { return <span className="required-indicator" aria-hidden="true"> *</span>; }

export function AccessibleForm({ children, onSubmit, ...props }) {
  const ref = useRef(null);
  const { pending, run } = useAsyncActionLock();
  const submit = async event => {
    event.preventDefault();
    await run(async () => {
      await onSubmit?.(event);
      requestAnimationFrame(() => {
        const form = ref.current;
        if (!form) return;
        const invalid = form.querySelector('[aria-invalid="true"]');
        if (invalid) invalid.focus();
        else {
          const alert = form.querySelector('[role="alert"]');
          if (alert) { alert.tabIndex = -1; alert.focus(); }
        }
      });
    });
  };
  return <SubmissionContext.Provider value={pending}><form {...props} ref={ref} onSubmit={submit} aria-busy={pending}>
    {children}
  </form></SubmissionContext.Provider>;
}
