import { useCallback, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useGetVitalsQuery,
  useGetMyScanReportsQuery,
  useGetAppointmentsQuery,
  useGetPrescriptionsQuery,
} from '@/features/api/apiSlice';
import { useAppSelector } from '@/hooks/redux';
import { usePatientAppShell } from '@/hooks/usePatientAppShell';
import { DashboardOverviewSection } from '@/components/dashboard/DashboardOverviewSection';
import { HealthVitalsDashboard } from '@/components/dashboard/HealthVitalsDashboard';
import { DashboardCareSection } from '@/components/dashboard/DashboardCareSection';
import { DashboardProfileSection } from '@/components/dashboard/DashboardProfileSection';
import { EmergencyHistorySection } from '@/components/dashboard/EmergencyHistorySection';
import { RapidCareWidget } from '@/components/dashboard/RapidCareWidget';
import type { ScanReport } from '@/types/mediscan';
import type { Appointment, Prescription, VitalReading } from '@/types';
import type { DashboardTab } from '@/components/dashboard/DashboardSectionNav';

const VALID_TABS: DashboardTab[] = ['overview', 'vitals', 'care', 'emergency', 'profile'];

export function PatientDashboard() {
  const { t } = useTranslation();
  const patientShell = usePatientAppShell();
  const { user } = useAppSelector((s) => s.auth);
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as DashboardTab | null;
  const activeTab: DashboardTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'overview';

  const setTab = useCallback(
    (tab: DashboardTab) => {
      const next = new URLSearchParams(searchParams);
      if (tab === 'overview') {
        next.delete('tab');
      } else {
        next.set('tab', tab);
      }
      if (tab !== 'care') next.delete('care');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const needOverview = activeTab === 'overview';
  const needCare = activeTab === 'care';

  const { data: vitalsData } = useGetVitalsQuery({ days: '30' }, { skip: !needOverview });
  const { data: scansData } = useGetMyScanReportsQuery(undefined, { skip: !needOverview });
  const { data: appointmentsData, isLoading: loadingAppts } = useGetAppointmentsQuery(
    {},
    { skip: !needOverview && !needCare }
  );
  const { data: prescriptionsData, isLoading: loadingRx } = useGetPrescriptionsQuery(undefined, {
    skip: !needCare,
  });

  const latestVitals = (vitalsData?.data?.latest || []) as VitalReading[];
  const scans = (scansData?.data || []) as ScanReport[];
  const appointments = (appointmentsData?.data?.appointments || []) as Appointment[];
  const prescriptions = (prescriptionsData?.data || []) as Prescription[];

  const upcomingAppointments = appointments.filter((a) =>
    ['pending', 'confirmed', 'in-progress'].includes(a.status)
  );

  const liveCount = appointments.filter(
    (a) => ['confirmed', 'in-progress'].includes(a.status) && ['video', 'audio'].includes(a.consultationType)
  ).length;

  const latestSkin =
    scans.find((s) => s.scanType === 'skin_lesion' && ['ai_analyzed', 'doctor_reviewed', 'final'].includes(s.status)) ||
    scans.find((s) => s.scanType === 'skin_lesion') ||
    null;

  useEffect(() => {
    if (activeTab === 'vitals') {
      document.getElementById('vitals')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (activeTab === 'profile') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  if (!user) return null;

  if (activeTab === 'profile' && patientShell) {
    return <Navigate to="/dashboard/profile" replace />;
  }

  const greetingName = user.profile?.firstName ?? t('dashboard.healthHub');

  return (
    <div className={patientShell ? 'bg-background' : 'min-h-screen bg-gradient-to-b from-primary/[0.04] via-background to-background'}>
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 ${patientShell ? 'py-4' : 'container-custom py-6 sm:py-8'} space-y-6`}>
        {!patientShell && (
          <header>
            <h1 className="text-2xl font-bold">{t('dashboard.healthHub')}</h1>
            <p className="text-sm text-muted">{t('dashboard.healthHubDesc')}</p>
          </header>
        )}

        {patientShell && activeTab === 'overview' && (
          <p className="text-sm text-muted">
            {t('dashboard.greetingShort', { name: greetingName })}
          </p>
        )}

        {activeTab === 'overview' && (
          <>
            <RapidCareWidget />
            <DashboardOverviewSection
              latestVitals={latestVitals}
              scans={scans}
              latestSkin={latestSkin}
              upcomingCount={upcomingAppointments.length}
              liveCount={liveCount}
              onTabChange={setTab}
            />
          </>
        )}

        {activeTab === 'emergency' && <EmergencyHistorySection />}

        {activeTab === 'vitals' && (
          <div id="vitals" className="space-y-6">
            <HealthVitalsDashboard />
          </div>
        )}

        {activeTab === 'care' && (
          <DashboardCareSection
            appointments={appointments}
            prescriptions={prescriptions}
            loadingAppts={loadingAppts}
            loadingRx={loadingRx}
            liveCount={liveCount}
          />
        )}

        {activeTab === 'profile' && <DashboardProfileSection />}
      </div>
    </div>
  );
}
