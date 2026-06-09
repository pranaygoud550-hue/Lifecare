import { Link } from 'react-router-dom';
import { Activity, Brain, ChevronRight, Stethoscope } from 'lucide-react';
import { useGetWellnessPlanQuery, useGetMyScanReportsQuery } from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import type { ScanReport } from '@/types/mediscan';

export function CombinedHealthInsights() {
  const { data: planData } = useGetWellnessPlanQuery();
  const { data: scansData } = useGetMyScanReportsQuery();

  const plan = planData?.data;
  const scans = ((scansData?.data || []) as ScanReport[]).filter((s) =>
    ['ai_analyzed', 'doctor_reviewed', 'final', 'ai_unavailable'].includes(s.status)
  );

  if (!plan && scans.length === 0) return null;

  return (
    <Card className="border-violet-200/50 bg-gradient-to-br from-violet-50/40 to-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          Combined health report — vitals + MediScan + diet
        </CardTitle>
        <p className="text-sm text-muted">
          Your doctor-style view merges BP, sugar, scan results, and today&apos;s diet plan.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {plan && plan.vitalInsights.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-sm font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-red-500" /> Latest vitals
              </p>
              {plan.vitalInsights.slice(0, 4).map((v) => (
                <div key={v.type} className="text-sm border-b border-border/60 pb-2 last:border-0">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{v.label}</span>
                    <span className="text-muted">{v.value}</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">{v.dietTip}</p>
                </div>
              ))}
            </div>
          )}

          {scans.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-sm font-bold flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-600" /> MediScan reports
              </p>
              {scans.slice(0, 3).map((scan) => (
                <div key={scan._id} className="text-sm border-b border-border/60 pb-2 last:border-0">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium capitalize">{scan.scanType.replace('_', ' ')}</span>
                    <span className="text-xs text-muted">{formatDate(scan.createdAt)}</span>
                  </div>
                  <p className="text-xs mt-0.5">{scan.prediction || 'Pending review'}</p>
                  {plan?.scanInsights.find((s) => s.scanType === scan.scanType)?.tip && (
                    <p className="text-xs text-muted mt-1">
                      {plan.scanInsights.find((s) => s.scanType === scan.scanType)?.tip}
                    </p>
                  )}
                </div>
              ))}
              <Link to="/dashboard/mediscan">
                <Button size="sm" variant="outline" className="gap-1 mt-2">
                  All scans <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {plan && (
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-sm font-semibold mb-2">Today&apos;s diet (adjusted for your data)</p>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                <div key={meal}>
                  <p className="font-bold capitalize text-primary mb-1">{meal}</p>
                  <ul className="space-y-0.5 text-muted">
                    {plan.dailyDiet[meal].slice(0, 2).map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {plan.adherence?.nextMealBalances && plan.adherence.nextMealBalances.length > 0 && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs">
                <p className="font-bold text-emerald-900 mb-1">Next meal balance</p>
                <p className="text-emerald-800">
                  For {plan.adherence.nextMealBalances[0].forMealLabel.toLowerCase()}: add{' '}
                  {plan.adherence.nextMealBalances[0].addThese.slice(0, 2).join(', ')}.
                </p>
              </div>
            )}
            {plan.adherence && !plan.adherence.onTrack && plan.adherence.mealsLoggedToday > 0 && (
              <Badge variant="warning" className="mt-3">
                Plan adjusted — follow the balance guide above
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
