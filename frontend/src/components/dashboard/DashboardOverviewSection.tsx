import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ScanLine } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { DashboardStatsRow } from '@/components/dashboard/DashboardStatsRow';
import { DashboardLivePill } from '@/components/dashboard/DashboardLivePill';
import { DashboardQuickActions } from '@/components/dashboard/DashboardQuickActions';
import { SkinHealthCard } from '@/components/dashboard/SkinHealthCard';
import { ScanHealthStrip } from '@/components/dashboard/ScanHealthStrip';
import { VitalSummaryCards } from '@/components/vitals/VitalSummaryCards';
import type { DashboardTab } from '@/components/dashboard/DashboardSectionNav';
import type { ScanReport } from '@/types/mediscan';
import type { VitalReading } from '@/types';

export function DashboardOverviewSection({
  latestVitals,
  scans,
  latestSkin,
  upcomingCount,
  liveCount,
  onTabChange,
}: {
  latestVitals: VitalReading[];
  scans: ScanReport[];
  latestSkin: ScanReport | null;
  upcomingCount: number;
  liveCount: number;
  onTabChange: (tab: DashboardTab) => void;
}) {
  const { t } = useTranslation();
  const analyzedScans = scans.filter((s) =>
    ['ai_analyzed', 'doctor_reviewed', 'final'].includes(s.status)
  ).length;

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t('dashboard.healthOverview')}</h1>
        <p className="text-sm text-muted mt-0.5">{t('dashboard.healthOverviewDesc')}</p>
      </div>

      <DashboardStatsRow
        upcomingCount={upcomingCount}
        vitalsLogged={latestVitals.length}
        scansCount={analyzedScans || scans.length}
      />

      <DashboardLivePill liveCount={liveCount} />

      <button
        type="button"
        onClick={() => onTabChange('emergency')}
        className="text-xs font-semibold text-red-600 hover:underline"
      >
        {t('dashboard.viewEmergencyHistory', 'View emergency history →')}
      </button>

      <DashboardQuickActions onTabChange={onTabChange} />

      {latestVitals.length > 0 && (
        <section className="space-y-3">
          <button
            type="button"
            onClick={() => onTabChange('vitals')}
            className="text-sm font-bold text-foreground flex items-center gap-0.5 hover:text-primary"
          >
            {t('dashboard.latestVitals')} <ChevronRight className="h-4 w-4" />
          </button>
          <VitalSummaryCards latest={latestVitals} />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">{t('dashboard.aiHealthScans')}</h2>
          <Link to="/dashboard/mediscan" className="text-xs font-semibold text-emerald-600">
            {t('nav.mediscan')}
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SkinHealthCard scan={latestSkin} />
          <Card className="border-0 overflow-hidden p-0">
            <Link to="/dashboard/mediscan" className="block h-full min-h-[140px]">
              <div className="h-full p-4 flex flex-col justify-center bg-gradient-to-br from-slate-900 to-emerald-900 text-white rounded-2xl">
                <ScanLine className="h-7 w-7 text-emerald-400 mb-2" />
                <p className="font-bold">{t('dashboard.openMediscanStudio')}</p>
                <p className="text-xs text-white/70 mt-1">{t('dashboard.mediscanStudioDesc')}</p>
              </div>
            </Link>
          </Card>
        </div>
        {scans.length > 0 && <ScanHealthStrip scans={scans} />}
      </section>
    </div>
  );
}
