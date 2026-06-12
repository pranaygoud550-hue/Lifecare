import { useTranslation } from 'react-i18next';
import { Activity, Ambulance, Calendar, LayoutGrid, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DashboardTab = 'overview' | 'vitals' | 'care' | 'emergency' | 'profile';

export function DashboardSectionNav({
  active,
  onChange,
  liveCount = 0,
}: {
  active: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  liveCount?: number;
}) {
  const { t } = useTranslation();

  const TABS: { id: DashboardTab; label: string; hint: string; icon: typeof LayoutGrid }[] = [
    { id: 'overview', label: t('dashboard.tabOverview'), hint: t('dashboard.tabOverviewHint'), icon: LayoutGrid },
    { id: 'vitals', label: t('dashboard.tabVitals'), hint: t('dashboard.tabVitalsHint'), icon: Activity },
    { id: 'care', label: t('dashboard.tabCare'), hint: t('dashboard.tabCareHint'), icon: Calendar },
    { id: 'emergency', label: t('dashboard.tabEmergency', '🚑 Emergency History'), hint: t('dashboard.tabEmergencyHint', 'RapidCare trips'), icon: Ambulance },
    { id: 'profile', label: t('dashboard.tabProfile'), hint: t('dashboard.tabProfileHint'), icon: User },
  ];

  return (
    <nav
      className="sticky top-16 z-30 -mx-4 px-4 sm:mx-0 sm:px-0 py-2 bg-background/95 backdrop-blur border-b border-border sm:border-0 sm:bg-transparent sm:static sm:backdrop-blur-none"
      aria-label="Dashboard sections"
    >
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          const showLiveBadge = tab.id === 'care' && liveCount > 0 && !isActive;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border text-left shrink-0 min-w-[130px] transition-all relative',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-card hover:border-primary/30',
                showLiveBadge && 'ring-1 ring-secondary/50'
              )}
            >
              <span className="flex items-center gap-2 font-semibold text-sm">
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
                {showLiveBadge && (
                  <span className="min-w-[1.1rem] h-4 px-1 rounded-full bg-secondary text-white text-[10px] flex items-center justify-center">
                    {liveCount}
                  </span>
                )}
              </span>
              <span className={cn('text-[11px] line-clamp-1', isActive ? 'text-primary-foreground/80' : 'text-muted')}>
                {tab.hint}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
