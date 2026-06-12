import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '@/hooks/redux';
import { SplashScreen } from './SplashScreen';
import { WelcomeAuthScreen, isWelcomeSkipped } from './WelcomeAuthScreen';

const AUTH_ROUTES = ['/login', '/register', '/unlock-account'];

export function AppLaunchFlow({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const authStatus = useAppSelector((s) => s.auth.authStatus);
  const [splashDone, setSplashDone] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(false);

  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  if (!splashDone) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  const skipWelcome =
    welcomeDone || authStatus === 'authenticated' || isAuthRoute || isWelcomeSkipped();

  if (!skipWelcome && authStatus !== 'loading') {
    return <WelcomeAuthScreen onDone={() => setWelcomeDone(true)} />;
  }

  return <>{children}</>;
}
