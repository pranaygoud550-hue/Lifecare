import { useEffect, useState } from 'react';

interface EtaCountdownProps {
  etaMinutes: number;
  children: (etaSeconds: number) => React.ReactNode;
}

/** ETA countdown — remount with `key={etaMinutes}` when ETA changes. */
export function EtaCountdown({ etaMinutes, children }: EtaCountdownProps) {
  const [etaSeconds, setEtaSeconds] = useState(() => etaMinutes * 60);

  useEffect(() => {
    const t = setInterval(() => setEtaSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  return <>{children(etaSeconds)}</>;
}
