import { useEffect, useState } from 'react';
import { formatCountdown } from '@/lib/formatCountdown';

interface ArrivalCountdownProps {
  estimatedArrival: string;
}

/** Live arrival countdown — remount with `key={estimatedArrival}` when ETA changes. */
export function ArrivalCountdown({ estimatedArrival }: ArrivalCountdownProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(estimatedArrival).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsRemaining((prev) => {
        const next = Math.max(
          0,
          Math.floor((new Date(estimatedArrival).getTime() - Date.now()) / 1000)
        );
        return next === prev ? prev : next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [estimatedArrival]);

  return <>{formatCountdown(secondsRemaining)}</>;
}
