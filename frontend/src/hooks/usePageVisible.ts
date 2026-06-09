import { useEffect, useState } from 'react';

/** True when the browser tab is in the foreground (reduces polling/API load when hidden). */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden
  );

  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return visible;
}

/** RTK Query polling interval — 0 when tab is hidden. */
export function useVisiblePollingInterval(intervalMs: number): number {
  const visible = usePageVisible();
  return visible ? intervalMs : 0;
}
