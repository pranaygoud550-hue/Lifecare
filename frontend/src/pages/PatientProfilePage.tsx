import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DashboardProfileSection } from '@/components/dashboard/DashboardProfileSection';
import { useAppSelector } from '@/hooks/redux';

/** Dedicated profile screen for patient bottom nav (avoids dashboard ?tab= routing issues). */
export function PatientProfilePage() {
  const { t } = useTranslation();
  const { user, authStatus } = useAppSelector((s) => s.auth);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (authStatus === 'loading') {
    return <div className="mx-auto max-w-7xl px-4 py-8 h-48 animate-pulse bg-border rounded-lg" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.userType !== 'patient') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 pb-6">
      <DashboardProfileSection />
      <p className="sr-only">{t('dashboard.tabProfile')}</p>
    </div>
  );
}
