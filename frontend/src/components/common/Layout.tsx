import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { PatientCareNav } from './PatientCareNav';
import { Footer } from './Footer';
import { OfflineBanner } from './OfflineBanner';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { NeedHelpProvider } from '@/components/emergency/NeedHelpProvider';
import { OneTapEmergencyProvider } from '@/components/emergency/OneTapEmergencyProvider';
import { PatientTopBar } from '@/components/patient/PatientTopBar';
import { PatientBottomNav } from '@/components/patient/PatientBottomNav';
import { usePatientAppShell } from '@/hooks/usePatientAppShell';

const AUTH_ROUTES = ['/login', '/register', '/unlock-account'];

export function Layout() {
  const patientShell = usePatientAppShell();
  const { pathname } = useLocation();
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  const isPatientDashboardHome = pathname === '/dashboard';

  return (
    <div className="min-h-screen flex flex-col">
      {patientShell ? <PatientTopBar /> : <Header />}
      {!patientShell && <PatientCareNav />}
      <OfflineBanner />
      <main className={patientShell ? 'flex-1 pb-28' : 'flex-1'}>
        <Outlet />
      </main>
      {!patientShell && <Footer />}
      {patientShell && <PatientBottomNav />}
      {!isAuthRoute && !isPatientDashboardHome && <NeedHelpProvider patientShell={patientShell} />}
      {!isAuthRoute && !isPatientDashboardHome && <OneTapEmergencyProvider />}
      <InstallPrompt />
    </div>
  );
}
