import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProfileAppointmentsPanel, ProfilePrescriptionsPanel } from '@/components/profile/ProfileCarePanels';
import type { Appointment, Prescription } from '@/types';

type CareSubTab = 'appointments' | 'prescriptions';

export function DashboardCareSection({
  appointments,
  prescriptions,
  loadingAppts,
  loadingRx,
  liveCount,
}: {
  appointments: Appointment[];
  prescriptions: Prescription[];
  loadingAppts: boolean;
  loadingRx: boolean;
  liveCount: number;
}) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const careParam = searchParams.get('care');
  const careTab: CareSubTab =
    careParam === 'prescriptions' ? 'prescriptions' : 'appointments';

  const CARE_TABS: { id: CareSubTab; label: string; icon: typeof Calendar }[] = [
    { id: 'appointments', label: t('dashboard.appointments'), icon: Calendar },
    { id: 'prescriptions', label: t('dashboard.prescriptions'), icon: FileText },
  ];

  const setCareTab = (tab: CareSubTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'care');
    next.set('care', tab);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">{t('dashboard.myCareTitle')}</h2>
        <p className="text-sm text-muted mt-1">{t('dashboard.myCareDesc')}</p>
      </div>

      <div className="flex gap-1 overflow-x-auto scrollbar-hide p-1 bg-muted/40 rounded-xl">
        {CARE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = careTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCareTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                isActive ? 'bg-card shadow-sm text-foreground' : 'text-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.id === 'appointments' && liveCount > 0 && (
                <span className="min-w-[1.1rem] h-4 px-1 rounded-full bg-secondary text-white text-[10px] flex items-center justify-center">
                  {liveCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {careTab === 'appointments' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.appointments')}</CardTitle>
            <CardDescription>{t('dashboard.careAppointmentsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileAppointmentsPanel appointments={appointments} loading={loadingAppts} liveCount={liveCount} />
          </CardContent>
        </Card>
      )}

      {careTab === 'prescriptions' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.prescriptions')}</CardTitle>
            <CardDescription>{t('dashboard.carePrescriptionsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfilePrescriptionsPanel prescriptions={prescriptions} loading={loadingRx} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
