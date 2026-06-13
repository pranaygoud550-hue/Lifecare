import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LifeBuoy, ScanLine, Activity, Salad, User, Camera, Calendar, Pill } from 'lucide-react';
import { useAppDispatch } from '@/hooks/redux';
import { openHospitalRideFlow } from '@/features/emergency/emergencySlice';
import { cn } from '@/lib/utils';
import type { DashboardTab } from '@/components/dashboard/DashboardSectionNav';

export function DashboardActionHub({ onTabChange }: { onTabChange?: (tab: DashboardTab) => void }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const ACTIONS = [
    { id: 'vitals', label: t('dashboard.actionLogVitals'), description: t('dashboard.actionLogVitalsDesc'), icon: Activity, tab: 'vitals' as DashboardTab },
    { id: 'appointments', label: t('dashboard.actionAppointments'), description: t('dashboard.actionAppointmentsDesc'), icon: Calendar, tab: 'care' as DashboardTab },
    { id: 'mediscan', label: t('dashboard.actionMediscan'), description: t('dashboard.actionMediscanDesc'), icon: ScanLine, to: '/dashboard/mediscan', accent: 'violet' as const },
    { id: 'pharmacy', label: t('dashboard.actionPharmacy'), description: t('dashboard.actionPharmacyDesc'), icon: Pill, to: '/pharmacy', accent: 'emerald' as const },
    { id: 'skin', label: t('dashboard.actionSkin'), description: t('dashboard.actionSkinDesc'), icon: Camera, to: '/dashboard/mediscan?mode=skin', accent: 'violet' as const },
    { id: 'diet', label: t('dashboard.actionDiet'), description: t('dashboard.actionDietDesc'), icon: Salad, to: '/dashboard/wellness' },
    { id: 'profile', label: t('dashboard.actionMyProfile'), description: t('dashboard.actionMyProfileDesc'), icon: User, tab: 'profile' as DashboardTab },
    { id: 'sos', label: t('dashboard.actionSos'), description: t('dashboard.actionSosDesc'), icon: LifeBuoy, needHelp: true, accent: 'danger' as const },
  ];

  return (
    <section aria-labelledby="health-actions-title">
      <h2 id="health-actions-title" className="text-sm font-bold text-muted uppercase tracking-wide mb-3">
        {t('dashboard.quickActions')}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const className = cn(
            'flex flex-col gap-2 p-3 rounded-xl border border-border bg-card text-left transition-all min-h-[96px]',
            action.accent === 'danger' && 'border-red-200 bg-red-50 hover:border-red-400',
            action.accent === 'violet' && 'border-violet-200/60 bg-violet-50/50 hover:border-violet-400',
            action.accent === 'emerald' && 'border-emerald-200/60 bg-emerald-50/50 hover:border-emerald-400',
            !action.accent && 'hover:border-primary/40'
          );
          const inner = (
            <>
              <Icon
                className={cn(
                  'h-5 w-5',
                  action.accent === 'danger' && 'text-red-600',
                  action.accent === 'violet' && 'text-violet-600',
                  action.accent === 'emerald' && 'text-emerald-600',
                  !action.accent && 'text-primary'
                )}
              />
              <div>
                <p className="font-semibold text-sm">{action.label}</p>
                <p className="text-[10px] text-muted line-clamp-2">{action.description}</p>
              </div>
            </>
          );

          if ('needHelp' in action && action.needHelp) {
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => dispatch(openHospitalRideFlow())}
                className={className}
              >
                {inner}
              </button>
            );
          }

          if ('tab' in action && action.tab && onTabChange) {
            return (
              <button key={action.id} type="button" onClick={() => onTabChange(action.tab!)} className={className}>
                {inner}
              </button>
            );
          }

          if ('to' in action && action.to) {
            return (
              <Link key={action.id} to={action.to} className={className}>
                {inner}
              </Link>
            );
          }

          return null;
        })}
      </div>
    </section>
  );
}
