import { useTranslation } from 'react-i18next';
import { Calendar, Activity, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardStatsRow({
  upcomingCount,
  vitalsLogged,
  scansCount,
}: {
  upcomingCount: number;
  vitalsLogged: number;
  scansCount: number;
}) {
  const { t } = useTranslation();

  const stats = [
    {
      label: t('dashboard.statUpcoming'),
      value: upcomingCount,
      icon: Calendar,
      accent: 'text-sky-600 bg-sky-100',
      bg: 'from-sky-50 to-white border-sky-100',
    },
    {
      label: t('dashboard.statVitals'),
      value: vitalsLogged,
      icon: Activity,
      accent: 'text-emerald-600 bg-emerald-100',
      bg: 'from-emerald-50 to-white border-emerald-100',
    },
    {
      label: t('dashboard.statScans'),
      value: scansCount,
      icon: ScanLine,
      accent: 'text-violet-600 bg-violet-100',
      bg: 'from-violet-50 to-white border-violet-100',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              'lc-stat-bounce lc-hover-lift rounded-2xl border bg-gradient-to-br p-3 sm:p-4 text-center shadow-sm',
              stat.bg
            )}
          >
            <div
              className={cn(
                'mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl',
                stat.accent
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold tabular-nums leading-none text-foreground">{stat.value}</p>
            <p className="text-[10px] sm:text-xs text-muted mt-1.5 leading-tight">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
