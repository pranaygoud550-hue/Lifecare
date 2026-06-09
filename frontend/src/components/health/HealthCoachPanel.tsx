import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ChevronRight, Salad, Sparkles } from 'lucide-react';
import { useGetWellnessPlanQuery, useGetVitalsQuery } from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VitalLogForm } from '@/components/vitals/VitalLogForm';
import { DietAdherenceTracker } from '@/components/health/DietAdherenceTracker';
import { CombinedHealthInsights } from '@/components/health/CombinedHealthInsights';
import type { WellnessStatus } from '@/types/wellness';

function statusVariant(status: WellnessStatus) {
  if (status === 'consult_doctor') return 'danger' as const;
  if (status === 'needs_attention') return 'warning' as const;
  return 'success' as const;
}

export function HealthCoachPanel() {
  const [justLogged, setJustLogged] = useState(false);
  const { data: vitalsData } = useGetVitalsQuery({ days: '30' });
  const { data: planData, isFetching, refetch } = useGetWellnessPlanQuery();

  const hasVitals = (vitalsData?.data?.latest?.length ?? 0) > 0;
  const plan = planData?.data;
  const showDiet = hasVitals || justLogged;

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Step 1 — Log your health numbers
          </CardTitle>
          <CardDescription>
            Upload blood pressure, blood sugar, heart rate, and oxygen. This is your main input — graphs update instantly below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VitalLogForm
            prominent
            onLogged={() => {
              setJustLogged(true);
              refetch();
            }}
          />
        </CardContent>
      </Card>

      {showDiet && (
        <Card className="border-secondary/40 bg-gradient-to-br from-emerald-50/50 to-background">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Salad className="h-6 w-6 text-emerald-600" />
                  Step 2 — Your personalized diet instructions
                </CardTitle>
                <CardDescription>
                  Based on your BP, sugar, medical profile, and MediScan — like guidance from your care team.
                </CardDescription>
              </div>
              {plan && (
                <Badge variant={statusVariant(plan.overallStatus)}>
                  {plan.overallStatus === 'good' ? 'On track' : plan.overallStatus === 'needs_attention' ? 'Adjust diet' : 'See doctor'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isFetching && !plan ? (
              <p className="text-sm text-muted animate-pulse">Building your diet plan from latest vitals…</p>
            ) : plan ? (
              <>
                <div className="rounded-xl bg-card border border-border p-4">
                  <p className="text-sm leading-relaxed">{plan.healthSummary}</p>
                </div>

                {plan.vitalInsights.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {plan.vitalInsights.map((v) => (
                      <div key={v.type} className="rounded-lg border border-border bg-card p-3">
                        <p className="font-semibold text-sm">{v.label}: {v.value}</p>
                        <p className="text-xs text-muted mt-1 flex items-start gap-1">
                          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          {v.dietTip}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(['breakfast', 'lunch', 'dinner', 'snacks'] as const).map((meal) => (
                    <div key={meal} className="rounded-xl border border-border bg-card p-3">
                      <p className="text-xs font-bold uppercase text-primary mb-2">{meal}</p>
                      <ul className="text-xs space-y-1 text-muted">
                        {plan.dailyDiet[meal].slice(0, 3).map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <Link to="/dashboard/wellness">
                  <Button variant="outline" size="sm" className="gap-1">
                    Full wellness plan <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted">Complete your medical profile to unlock diet instructions.</p>
            )}
          </CardContent>
        </Card>
      )}

      {showDiet && <DietAdherenceTracker />}

      {(hasVitals || (plan?.scanInsights.length ?? 0) > 0) && <CombinedHealthInsights />}
    </div>
  );
}
