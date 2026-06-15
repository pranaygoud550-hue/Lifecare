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
      className: 'hover:border-sky-200 bg-gradient-to-br from-sky-50/80 to-white',
      iconClass: 'text-sky-600',
    },
    {
      id: 'need-help',
      label: t('dashboard.needHelp', 'Need Help'),
      icon: LifeBuoy,
      onClick: () => dispatchNeedHelp(dispatch),
      className: 'hover:border-cyan-200 bg-gradient-to-br from-cyan-50/80 to-white',
      iconClass: 'text-cyan-600',
    },
    {
      id: 'doctor',
      label: t('dashboard.bookDoctor'),
      icon: Stethoscope,
      to: '/doctors',
      className: 'hover:border-violet-200 bg-gradient-to-br from-violet-50/80 to-white',
      iconClass: 'text-violet-600',
    },
    {
      id: 'chest-scan',
      label: 'Chest X-Ray AI',
      icon: ScanLine,
      to: '/patient/scan-analysis',
      className: 'hover:border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white',
      iconClass: 'text-emerald-600',
    },
    {
      id: 'mediscan',
      label: t('dashboard.actionMediscan'),
      icon: ScanLine,
      to: '/dashboard/mediscan',
      className: 'hover:border-teal-200 bg-gradient-to-br from-teal-50/80 to-white',
      iconClass: 'text-teal-600',
    },
  ];

  return (
    <section aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title" className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-3">
        {t('dashboard.quickActions')}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, i) => {
          const Icon = action.icon;
          const inner = (
            <>
              <Icon className={cn('h-6 w-6 lc-wiggle', action.iconClass)} style={{ animationDelay: `${i * 0.3}s` }} />
              <span className="font-semibold text-sm leading-tight">{action.label}</span>
            </>
          );
          const base = cn(
            'lc-card-pop lc-hover-lift flex flex-col items-center justify-center gap-2 rounded-2xl border border-border p-4 min-h-[5.5rem] text-center',
            action.className
          );

          if ('to' in action && action.to) {
            return (
              <Link key={action.id} to={action.to} className={base} style={{ animationDelay: `${0.1 + i * 0.06}s` }}>
                {inner}
              </Link>
            );
          }

          return (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              className={base}
              style={{ animationDelay: `${0.1 + i * 0.06}s` }}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </section>
  );
}
