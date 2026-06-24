import { useEffect, useState } from 'react';

interface SosCountdownProps {
  seconds: number;
  onComplete: () => void;
  children: (secondsLeft: number) => React.ReactNode;
}

/** Countdown timer — remount with `key` when restarting. Interval uses functional updates only. */
export function SosCountdown({ seconds, onComplete, children }: SosCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(seconds);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onComplete]);

  return <>{children(secondsLeft)}</>;
}
