import { useCallback, useEffect, useState } from 'react';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Polls backend /health until the API accepts connections. */
export function useApiReady() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      for (let i = 0; i < 45; i++) {
        try {
          const res = await fetch('/health', { credentials: 'omit' });
          if (res.ok) {
            if (!cancelled) {
              setReady(true);
              setChecking(false);
            }
            return;
          }
        } catch {
          /* server still booting */
        }
        await sleep(1000);
      }
      if (!cancelled) setChecking(false);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, checking };
}

export function useRetryOnFetchError() {
  return useCallback(async <T,>(fn: () => Promise<T>, attempts = 5, delayMs = 1500): Promise<T> => {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        const status = (err as { status?: string })?.status;
        if (status !== 'FETCH_ERROR' && i === 0) throw err;
        if (status !== 'FETCH_ERROR' || i >= attempts - 1) throw err;
        await sleep(delayMs);
      }
    }
    throw lastError;
  }, []);
}
