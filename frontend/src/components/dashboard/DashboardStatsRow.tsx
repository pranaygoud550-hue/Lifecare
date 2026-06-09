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
      accent: 'text-primary bg-primary/10',
    },
    {
      label: t('dashboard.statVitals'),
      value: vitalsLogged,
      icon: Activity,
      accent: 'text-secondary bg-secondary/10',
    },
    {
      label: t('dashboard.statScans'),
      value: scansCount,
      icon: ScanLine,
      accent: 'text-violet-600 bg-violet-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-3 sm:p-4 text-center shadow-sm"
          >
            <div
              className={cn(
                'mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl',
                stat.accent
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold tabular-nums leading-none">{stat.value}</p>
            <p className="text-[10px] sm:text-xs text-muted mt-1.5 leading-tight">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
