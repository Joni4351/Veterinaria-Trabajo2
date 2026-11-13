import React, { useEffect, useRef } from 'react';

export function AccessibleDialog({ children, onClose, initialFocus, ...props }) {
  const ref = useRef(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const root = ref.current;
    const previous = document.activeElement;
    // Isolate the modal from keyboard navigation and the accessibility tree.
    const siblings = [];
    for (let node = root; node?.parentElement && node !== document.body; node = node.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling !== node && !['SCRIPT', 'STYLE'].includes(sibling.tagName)) {
          siblings.push([sibling, sibling.inert]); sibling.inert = true;
        }
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const elements = () => [...root.querySelectorAll('button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')]
      .filter(el => !el.closest('[hidden], [inert]') && (el.checkVisibility ? el.checkVisibility({ visibilityProperty: true }) : getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden'));
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
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      siblings.forEach(([node, wasInert]) => { node.inert = wasInert; });
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected && previous !== document.body && !previous.matches(':disabled') && !previous.closest('[inert]')) previous.focus();
      else {
        const underlying = [...document.querySelectorAll('[role="dialog"][aria-modal="true"], dialog[open]')].filter(dialog => dialog !== root && !dialog.closest('[inert]')).at(-1);
        (underlying?.querySelector('button:not(:disabled), input:not(:disabled), [tabindex="0"]') || document.getElementById('main-content'))?.focus();
      }
    };
  }, []);
  return <div {...props} ref={ref} role="dialog" aria-modal="true" tabIndex={-1}>{children}</div>;
}
