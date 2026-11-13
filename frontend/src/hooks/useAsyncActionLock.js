import { useCallback, useEffect, useRef, useState } from 'react';

export function useAsyncActionLock() {
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const run = useCallback(async (action, ...args) => {
    // The ref closes the interval before React renders the disabled button.
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try { return await action?.(...args); }
    finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  }, []);
  return { pending, run };
}
