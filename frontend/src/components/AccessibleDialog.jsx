import React, { useEffect, useRef } from 'react';

export function AccessibleDialog({ children, onClose, initialFocus, ...props }) {
  const ref = useRef(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const root = ref.current;
    const previous = document.activeElement;
    const elements = () => [...root.querySelectorAll('button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')]
      .filter(el => !el.closest('[hidden], [inert]') && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden');
    (initialFocus?.current || elements().find(el => /INPUT|SELECT|TEXTAREA/.test(el.tagName)) || elements()[0] || root).focus();
    const keydown = event => {
      const dialogs = [...document.querySelectorAll('[role="dialog"][aria-modal="true"], dialog[open]')];
      if (dialogs.at(-1) !== root) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current?.(); }
      if (event.key !== 'Tab') return;
      const list = elements();
      if (!list.length) { event.preventDefault(); root.focus(); return; }
      const first = list[0], last = list.at(-1);
      if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown, true);
    return () => { document.removeEventListener('keydown', keydown, true); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div {...props} ref={ref} role="dialog" aria-modal="true" tabIndex={-1}>{children}</div>;
}
