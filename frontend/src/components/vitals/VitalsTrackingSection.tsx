import { useState } from 'react';
import { Activity, ChevronDown } from 'lucide-react';
import { useGetVitalsQuery } from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VitalSummaryCards } from './VitalSummaryCards';
import { VitalChart } from './VitalChart';
import { VitalLogForm } from './VitalLogForm';
import { cn } from '@/lib/utils';
import { VITAL_META } from '@/lib/vitalRanges';
import type { VitalReading, VitalType } from '@/types';

const CHART_TYPES: { type: VitalType; hasGlucoseToggle?: boolean }[] = [
  { type: 'blood_pressure' },
  { type: 'blood_sugar', hasGlucoseToggle: true },
  { type: 'heart_rate' },
  { type: 'oxygen' },
  { type: 'weight' },
];

export function VitalsTrackingSection({ compact }: { compact?: boolean }) {
  const [glucoseMeal, setGlucoseMeal] = useState<'fasting' | 'post_meal'>('fasting');
  const [chartsOpen, setChartsOpen] = useState(!compact);
  const { data, isLoading } = useGetVitalsQuery({ days: '30' });

  const readings = (data?.data?.readings || []) as VitalReading[];
  const latest = (data?.data?.latest || []) as VitalReading[];

  return (
    <section id="vitals" className="space-y-6 scroll-mt-24">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Health vitals</h2>
          <p className="text-sm text-muted">
            {compact
              ? 'See your latest readings below — open charts for 30-day trends.'
              : 'Track trends over the last 30 days'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-24 bg-border rounded-xl animate-pulse" />
      ) : (
        <VitalSummaryCards latest={latest} />
      )}

      {compact && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VitalLogForm />
          <Card>
            <CardContent className="p-4">
              <button
                type="button"
                onClick={() => setChartsOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-primary hover:underline"
              >
                {chartsOpen ? 'Hide trend charts' : 'Show 30-day trend charts'}
                <ChevronDown className={cn('h-4 w-4 transition-transform', chartsOpen && 'rotate-180')} />
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {(!compact || chartsOpen) && (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          {CHART_TYPES.map(({ type, hasGlucoseToggle }) => (
            <Card key={type}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{VITAL_META[type].label}</CardTitle>
                  {hasGlucoseToggle && (
                    <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => setGlucoseMeal('fasting')}
                        className={`px-3 py-1.5 ${glucoseMeal === 'fasting' ? 'bg-primary text-white' : 'bg-card'}`}
                      >
                        Fasting
                      </button>
                      <button
                        type="button"
                        onClick={() => setGlucoseMeal('post_meal')}
                        className={`px-3 py-1.5 ${glucoseMeal === 'post_meal' ? 'bg-primary text-white' : 'bg-card'}`}
                      >
                        Post-meal
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted font-normal">{VITAL_META[type].normalHint}</p>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[220px] bg-border rounded-lg animate-pulse" />
                ) : (
                  <VitalChart
                    type={type}
                    readings={readings}
                    glucoseMeal={hasGlucoseToggle ? glucoseMeal : undefined}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {!compact && (
          <div className="xl:sticky xl:top-20 xl:self-start">
            <VitalLogForm />
          </div>
        )}
      </div>
      )}
    </section>
  );
}
