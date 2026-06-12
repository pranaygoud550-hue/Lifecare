import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Droplets, Heart, Wind, LineChart, Scale } from 'lucide-react';
import { useGetVitalsQuery } from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VitalSummaryCards } from '@/components/vitals/VitalSummaryCards';
import { VitalChart } from '@/components/vitals/VitalChart';
import { VitalLogForm } from '@/components/vitals/VitalLogForm';
import { VITAL_META } from '@/lib/vitalRanges';
import { cn } from '@/lib/utils';
import type { VitalReading } from '@/types';

export function HealthVitalsDashboard() {
  const { t } = useTranslation();
  const [glucoseMeal, setGlucoseMeal] = useState<'fasting' | 'post_meal'>('fasting');
  const [days, setDays] = useState<'7' | '30' | '90'>('30');
  const { data, isLoading } = useGetVitalsQuery({ days });

  const CHART_PANELS = useMemo(
    () => [
      { type: 'blood_sugar' as const, icon: Droplets, title: t('dashboard.bloodSugar'), subtitle: t('dashboard.bloodSugarDesc'), color: 'border-amber-200/60', hasGlucoseToggle: true },
      { type: 'blood_pressure' as const, icon: Activity, title: t('dashboard.bloodPressure'), subtitle: t('dashboard.bloodPressureDesc'), color: 'border-red-200/50' },
      { type: 'heart_rate' as const, icon: Heart, title: t('dashboard.heartHealth'), subtitle: t('dashboard.heartHealthDesc'), color: 'border-rose-200/50' },
      { type: 'oxygen' as const, icon: Wind, title: t('dashboard.oxygen'), subtitle: t('dashboard.oxygenDesc'), color: 'border-sky-200/50' },
      { type: 'weight' as const, icon: Scale, title: 'Weight', subtitle: 'Track body weight trends over time', color: 'border-violet-200/50' },
    ],
    [t]
  );

  const DAY_OPTIONS = useMemo(
    () => [
      { value: '7' as const, label: t('dashboard.days7') },
      { value: '30' as const, label: t('dashboard.days30') },
      { value: '90' as const, label: t('dashboard.days90') },
    ],
    [t]
  );

  const readings = (data?.data?.readings || []) as VitalReading[];
  const latest = (data?.data?.latest || []) as VitalReading[];

  return (
    <div className="space-y-8">
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('dashboard.actionLogVitals')}</CardTitle>
          <p className="text-sm text-muted font-normal">{t('dashboard.actionLogVitalsDesc')}</p>
        </CardHeader>
        <CardContent>
          <VitalLogForm prominent />
        </CardContent>
      </Card>

      <section id="vitals-charts" className="space-y-6 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" />
              {t('dashboard.vitalsGraphsTitle')}
            </h2>
            <p className="text-sm text-muted mt-1">{t('dashboard.vitalsGraphsDesc')}</p>
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden text-xs shrink-0">
            {DAY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDays(opt.value)}
                className={cn(
                  'px-3 py-2 font-medium transition-colors',
                  days === opt.value ? 'bg-primary text-white' : 'bg-card text-muted hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="h-24 bg-border rounded-xl animate-pulse" />
        ) : (
          <VitalSummaryCards latest={latest} />
        )}

        <div className="space-y-5">
          {CHART_PANELS.map((panel) => {
            const Icon = panel.icon;
            const meta = VITAL_META[panel.type];
            const count = readings.filter((r) => {
              if (r.type !== panel.type) return false;
              if (panel.type === 'blood_sugar') return r.glucoseMeal === glucoseMeal;
              return true;
            }).length;

            return (
              <Card key={panel.type} className={panel.color}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 h-fit">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{panel.title}</CardTitle>
                        <p className="text-xs text-muted font-normal mt-0.5">{panel.subtitle}</p>
                        <p className="text-[11px] text-muted mt-1">{t('dashboard.normalHint', { hint: meta.normalHint })}</p>
                      </div>
                    </div>
                    {panel.hasGlucoseToggle && (
                      <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                        <button
                          type="button"
                          onClick={() => setGlucoseMeal('fasting')}
                          className={`px-3 py-1.5 ${glucoseMeal === 'fasting' ? 'bg-primary text-white' : 'bg-card'}`}
                        >
                          {t('dashboard.fasting')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setGlucoseMeal('post_meal')}
                          className={`px-3 py-1.5 ${glucoseMeal === 'post_meal' ? 'bg-primary text-white' : 'bg-card'}`}
                        >
                          {t('dashboard.afterMeal')}
                        </button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-[240px] bg-border rounded-lg animate-pulse" />
                  ) : count === 0 ? (
                    <div className="h-[200px] flex flex-col items-center justify-center text-center rounded-lg border border-dashed border-border bg-background/50 px-4">
                      <Icon className="h-8 w-8 text-muted mb-2" />
                      <p className="text-sm font-medium">{t('dashboard.noReadingsDays', { days })}</p>
                      <p className="text-xs text-muted mt-1">
                        {t('dashboard.logToSeeGraph', { label: meta.label.toLowerCase() })}
                      </p>
                    </div>
                  ) : (
                    <VitalChart
                      type={panel.type}
                      readings={readings}
                      glucoseMeal={panel.hasGlucoseToggle ? glucoseMeal : undefined}
                      height={260}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
