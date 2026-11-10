import React, { useRef } from 'react';

export function RequiredIndicator() { return <span className="required-indicator" aria-hidden="true"> *</span>; }

export function AccessibleForm({ children, onSubmit, ...props }) {
  const ref = useRef(null);
  const submit = async event => {
    event.preventDefault();
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
  };
  return <form {...props} ref={ref} onSubmit={submit}>
    {children}
  </form>;
}
