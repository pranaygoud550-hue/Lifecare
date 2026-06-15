import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import { DashboardProfileSection } from '@/components/dashboard/DashboardProfileSection';
import { SectionHero } from '@/components/common/SectionHero';
import { PositivePageShell } from '@/components/common/PositivePageShell';
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

  const displayName = user.profile?.firstName
    ? `${user.profile.firstName}${user.profile.lastName ? ` ${user.profile.lastName}` : ''}`
    : 'Your profile';

  return (
    <div
      className="section-page-bg min-h-screen pb-6"
      style={{ '--section-tint': '#f5f3ff' } as CSSProperties}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4">
        <PositivePageShell className="space-y-6">
        <SectionHero
          icon={User}
          theme="profile"
          title={displayName}
          subtitle="You're doing great — keep your health profile up to date."
        />
        <DashboardProfileSection />
        <p className="sr-only">{t('dashboard.tabProfile')}</p>
        </PositivePageShell>
      </div>
    </div>
  );
}
