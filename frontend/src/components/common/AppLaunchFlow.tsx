import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '@/hooks/redux';
import { useGetProfileQuery } from '@/features/api/apiSlice';
import { SplashScreen } from './SplashScreen';
import { WelcomeAuthScreen, isWelcomeSkipped } from './WelcomeAuthScreen';

type Phase = 'splash' | 'welcome' | 'app';

const AUTH_ROUTES = ['/login', '/register', '/unlock-account'];

export function AppLaunchFlow({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const authStatus = useAppSelector((s) => s.auth.authStatus);
  const { isFetching, isLoading } = useGetProfileQuery();

  const [phase, setPhase] = useState<Phase>('splash');
  const [minDone, setMinDone] = useState(false);
  const [maxDone, setMaxDone] = useState(false);

  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  const ready = minDone && ((!isFetching && !isLoading) || maxDone);

  useEffect(() => {
    const t1 = setTimeout(() => setMinDone(true), 1200);
    const t2 = setTimeout(() => setMaxDone(true), 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'splash' || !ready) return;
    if (authStatus === 'authenticated' || isAuthRoute || isWelcomeSkipped()) {
      setPhase('app');
    } else if (authStatus !== 'loading') {
      setPhase('welcome');
    }
  }, [phase, ready, authStatus, isAuthRoute]);

  if (phase === 'splash') {
    return <SplashScreen />;
  }

  if (phase === 'welcome') {
    return <WelcomeAuthScreen onDone={() => setPhase('app')} />;
  }

  return <>{children}</>;
}
