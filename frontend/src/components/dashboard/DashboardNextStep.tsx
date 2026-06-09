import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, Camera, Salad, UserCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { VitalReading } from '@/types';
import { evaluateVitalStatus, STATUS_STYLES } from '@/lib/vitalRanges';
import type { DashboardTab } from '@/components/dashboard/DashboardSectionNav';

export interface DashboardNextStepProps {
  latestVitals: VitalReading[];
  hasSkinScan: boolean;
  profileComplete: boolean;
  wellnessReady: boolean;
  onTabChange?: (tab: DashboardTab) => void;
}

export function DashboardNextStep({
  latestVitals,
  hasSkinScan,
  profileComplete,
  wellnessReady,
  onTabChange,
}: DashboardNextStepProps) {
  const { t } = useTranslation();
  const concerning = latestVitals.filter((r) => evaluateVitalStatus(r) !== 'normal');

  if (concerning.length > 0) {
    const r = concerning[0];
    const style = STATUS_STYLES[evaluateVitalStatus(r)];
    const typeLabel = r.type.replace('_', ' ');
    return (
      <Card className="border-amber-200/70 bg-amber-50/60">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex gap-3 flex-1">
            <Activity className="h-6 w-6 text-amber-700 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{t('dashboard.healthAlert')}</p>
              <p className="font-bold text-lg mt-0.5">
                {t('dashboard.vitalNeedsAttention', { type: typeLabel, status: style.label })}
              </p>
              <p className="text-sm text-muted mt-1">{t('dashboard.checkVitalsDiet')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {onTabChange && (
              <Button variant="outline" onClick={() => onTabChange('vitals')}>
                {t('dashboard.viewGraphs')}
              </Button>
            )}
            <Link to="/dashboard/wellness">
              <Button variant="outline">{t('dashboard.dietPlan')}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profileComplete) {
    return (
      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <UserCircle className="h-6 w-6 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t('dashboard.getStarted')}</p>
            <p className="font-bold text-lg mt-0.5">{t('dashboard.completeMedicalProfile')}</p>
            <p className="text-sm text-muted mt-1">{t('dashboard.completeProfileHint')}</p>
          </div>
          {onTabChange ? (
            <Button onClick={() => onTabChange('profile')}>{t('dashboard.completeProfile')}</Button>
          ) : (
            <Link to="/dashboard?tab=profile">
              <Button>{t('dashboard.completeProfile')}</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  if (latestVitals.length === 0) {
    return (
      <Card className="border-secondary/30 bg-secondary/5">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <Activity className="h-6 w-6 text-secondary shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{t('dashboard.startTracking')}</p>
            <p className="font-bold text-lg mt-0.5">{t('dashboard.logFirstVital')}</p>
            <p className="text-sm text-muted mt-1">{t('dashboard.logFirstVitalHint')}</p>
          </div>
          {onTabChange ? (
            <Button onClick={() => onTabChange('vitals')}>{t('dashboard.actionLogVitals')}</Button>
          ) : (
            <Link to="/dashboard?tab=vitals">
              <Button>{t('dashboard.actionLogVitals')}</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!hasSkinScan) {
    return (
      <Card className="border-violet-200/50 bg-violet-50/40">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <Camera className="h-6 w-6 text-violet-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">{t('dashboard.skinHealth')}</p>
            <p className="font-bold text-lg mt-0.5">{t('dashboard.runSkinCheck')}</p>
            <p className="text-sm text-muted mt-1">{t('dashboard.runSkinCheckHint')}</p>
          </div>
          <Link to="/dashboard/mediscan?mode=skin">
            <Button className="bg-violet-600 hover:bg-violet-700">{t('dashboard.skinScan')}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (wellnessReady) {
    return (
      <Card className="border-emerald-200/50 bg-emerald-50/40">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <Salad className="h-6 w-6 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{t('dashboard.allSet')}</p>
            <p className="font-bold text-lg mt-0.5">{t('dashboard.dashboardUpToDate')}</p>
            <p className="text-sm text-muted mt-1">{t('dashboard.dashboardUpToDateHint')}</p>
          </div>
          <Link to="/dashboard/wellness">
            <Button variant="outline" className="gap-1">
              <Salad className="h-4 w-4" /> {t('dashboard.dietPlan')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-border">
      <CardContent className="p-4 sm:p-5 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-muted shrink-0" />
        <p className="text-sm text-muted">{t('dashboard.logVitalsReminder')}</p>
      </CardContent>
    </Card>
  );
}
