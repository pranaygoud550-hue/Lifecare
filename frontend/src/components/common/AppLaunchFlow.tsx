import { useState, type ReactNode } from 'react';
import { useAppSelector } from '@/hooks/redux';
import { SplashScreen } from './SplashScreen';
import { WelcomeAuthScreen, isOnboardingComplete } from './WelcomeAuthScreen';

export function AppLaunchFlow({ children }: { children: ReactNode }) {
  const authStatus = useAppSelector((s) => s.auth.authStatus);
  const [splashDone, setSplashDone] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(false);

  if (!splashDone) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  const skipWelcome =
    welcomeDone || authStatus === 'authenticated' || isOnboardingComplete();

  if (!skipWelcome && authStatus !== 'loading') {
    return <WelcomeAuthScreen onDone={() => setWelcomeDone(true)} />;
  }

  return <>{children}</>;
}
