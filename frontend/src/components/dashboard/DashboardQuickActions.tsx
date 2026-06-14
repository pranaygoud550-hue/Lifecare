import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, LifeBuoy, Stethoscope, ScanLine } from 'lucide-react';
import { useAppDispatch } from '@/hooks/redux';
import { dispatchNeedHelp } from '@/lib/needHelp';
import { cn } from '@/lib/utils';
import type { DashboardTab } from '@/components/dashboard/DashboardSectionNav';

export function DashboardQuickActions({ onTabChange }: { onTabChange: (tab: DashboardTab) => void }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const actions = [
    {
      id: 'vitals',
      label: t('dashboard.actionLogVitals'),
      icon: Activity,
      onClick: () => onTabChange('vitals'),
      className: 'hover:border-primary/40',
      iconClass: 'text-primary',
    },
    {
      id: 'need-help',
      label: t('dashboard.needHelp', 'Need Help'),
      icon: LifeBuoy,
      onClick: () => dispatchNeedHelp(dispatch),
      className: 'hover:border-sky-400/50 bg-sky-50/40',
      iconClass: 'text-sky-700',
    },
    {
      id: 'doctor',
      label: t('dashboard.bookDoctor'),
      icon: Stethoscope,
      to: '/doctors',
      className: 'hover:border-primary/40',
      iconClass: 'text-primary',
    },
    {
      id: 'chest-scan',
      label: 'Chest X-Ray AI',
      icon: ScanLine,
      to: '/patient/scan-analysis',
      className: 'hover:border-emerald-400/50 bg-emerald-50/30',
      iconClass: 'text-emerald-600',
    },
    {
      id: 'mediscan',
      label: t('dashboard.actionMediscan'),
      icon: ScanLine,
      to: '/dashboard/mediscan',
      className: 'hover:border-emerald-400/50 bg-emerald-50/30',
      iconClass: 'text-emerald-600',
    },
  ];

  return (
    <section aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title" className="text-xs font-bold uppercase tracking-wide text-muted mb-3">
        {t('dashboard.quickActions')}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const inner = (
            <>
              <Icon className={cn('h-6 w-6', action.iconClass)} />
              <span className="font-semibold text-sm leading-tight">{action.label}</span>
            </>
          );
          const base = cn(
            'flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 min-h-[5.5rem] transition-all text-center',
            action.className
          );

          if ('to' in action && action.to) {
            return (
              <Link key={action.id} to={action.to} className={base}>
                {inner}
              </Link>
            );
          }

          return (
            <button key={action.id} type="button" onClick={action.onClick} className={base}>
              {inner}
            </button>
          );
        })}
      </div>
    </section>
  );
}
