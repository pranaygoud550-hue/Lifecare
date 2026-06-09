import { useEffect, useState, type ReactNode } from 'react';
import { useGetProfileQuery } from '@/features/api/apiSlice';
import { isIntroSeen } from '@/hooks/useIntroSeen';
import { SplashScreen } from './SplashScreen';

export function AppLaunchFlow({ children }: { children: ReactNode }) {
  const { isFetching, isLoading } = useGetProfileQuery();
  const [minDone, setMinDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), 900);
    return () => clearTimeout(t);
  }, []);

  const booting = (isFetching || isLoading) && !minDone;

  // Returning users: brief splash while auth hydrates. First-time users go straight to intro.
  if (booting && isIntroSeen()) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
