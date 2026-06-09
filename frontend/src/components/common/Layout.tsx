import { Outlet } from 'react-router-dom';
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

export function Layout() {
  const patientShell = usePatientAppShell();

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
      <NeedHelpProvider patientShell={patientShell} />
      <OneTapEmergencyProvider />
      <InstallPrompt />
    </div>
  );
}
