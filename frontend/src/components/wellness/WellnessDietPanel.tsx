import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DietAdherenceTracker } from '@/components/health/DietAdherenceTracker';
import {
  Apple,
  Brain,
  Droplets,
  Heart,
  Salad,
  Sparkles,
  Stethoscope,
  UtensilsCrossed,
} from 'lucide-react';
import { useGetWellnessPlanQuery } from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WellnessStatus } from '@/types/wellness';

function statusBadge(status: WellnessStatus) {
  if (status === 'consult_doctor') return { variant: 'danger' as const, label: 'See doctor' };
  if (status === 'needs_attention') return { variant: 'warning' as const, label: 'Watch' };
  return { variant: 'success' as const, label: 'On track' };
}

function MealBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-sm font-bold text-primary mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm flex gap-2">
            <span className="text-secondary shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function currentMealSlot(): 'breakfast' | 'lunch' | 'snack' | 'dinner' {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}

export function WellnessDietPanel({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { data, isLoading, isFetching, refetch } = useGetWellnessPlanQuery();
  const plan = data?.data;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted">Building your wellness plan…</CardContent>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <p className="text-muted">Add your medical profile and vitals to get a personalized diet plan.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link to="/dashboard?tab=profile">
              <Button>Complete medical profile</Button>
            </Link>
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overall = statusBadge(plan.overallStatus);

  if (compact) {
    const slot = currentMealSlot();
    const mealLabel = slot.charAt(0).toUpperCase() + slot.slice(1);
    const mealKey = slot === 'snack' ? 'snacks' : slot;
    const todayMeal = plan.dailyDiet[mealKey]?.slice(0, 2) ?? [];
    const balance = plan.adherence?.nextMealBalances?.[0];

    return (
      <Card className="border-secondary/30 bg-gradient-to-br from-secondary/5 to-primary/5">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Salad className="h-5 w-5 text-secondary" />
              <p className="font-bold">{t('dashboard.dietAssistant')}</p>
            </div>
            <Badge variant={overall.variant}>{overall.label}</Badge>
          </div>

          {plan.vitalInsights.length > 0 && (
            <div className="rounded-lg border border-border bg-card/80 p-3 space-y-1.5">
              {plan.vitalInsights.slice(0, 2).map((v) => (
                <p key={v.type} className="text-xs text-muted">
                  <span className="font-semibold text-foreground">{v.label} {v.value}</span>
                  {' — '}
                  {v.dietTip}
                </p>
              ))}
            </div>
          )}

          {todayMeal.length > 0 && (
            <div className="text-sm">
              <p className="text-xs font-bold uppercase text-primary mb-1">
                {t('dashboard.suggestedNow', { meal: mealLabel })}
              </p>
              <ul className="text-muted space-y-0.5">
                {todayMeal.map((item) => (
                  <li key={item} className="line-clamp-2">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {balance && (
            <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
              {t('dashboard.balanceHint', {
                meal: balance.forMealLabel,
                food: balance.becauseYouAte,
              })}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard/wellness#log-meals">
              <Button size="sm" className="gap-1">
                <UtensilsCrossed className="h-4 w-4" />
                {t('dashboard.logMeal')}
              </Button>
            </Link>
            <Link to="/dashboard/wellness">
              <Button size="sm" variant="outline">
                {t('dashboard.fullDietPlan')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-primary/15">
            <Sparkles className="h-7 w-7 text-secondary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Your wellness & diet assistant</h2>
            <p className="text-sm text-muted max-w-xl">
              Personalized from your BP, sugar, weight, medical history, and MediScan results
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={overall.variant} className="text-sm px-3 py-1">
            {overall.label}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <p className="text-sm leading-relaxed">{plan.healthSummary}</p>
          {plan.bmi && (
            <p className="text-sm font-medium mt-2">
              BMI: {plan.bmi.value} — {plan.bmi.category}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            {plan.dataUsed.map((d) => (
              <span
                key={d}
                className="text-xs px-2.5 py-1 rounded-full bg-background border border-border"
              >
                {d}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {(plan.vitalInsights.length > 0 || plan.scanInsights.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {plan.vitalInsights.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  From your vitals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.vitalInsights.map((v) => {
                  const b = statusBadge(v.status);
                  return (
                    <div key={v.type} className="p-3 rounded-lg bg-background border border-border">
                      <div className="flex justify-between gap-2 mb-1">
                        <span className="font-medium text-sm">{v.label}</span>
                        <Badge variant={b.variant} className="text-[10px]">
                          {v.value}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted">{v.dietTip}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {plan.scanInsights.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-violet-600" />
                  From MediScan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.scanInsights.map((s) => (
                  <div key={s.scanType} className="p-3 rounded-lg bg-background border border-border">
                    <p className="font-medium text-sm">{s.label}</p>
                    {s.prediction && (
                      <p className="text-xs text-muted mt-0.5">AI: {s.prediction}</p>
                    )}
                    <p className="text-xs mt-2">{s.tip}</p>
                  </div>
                ))}
                <Link to="/dashboard/mediscan" className="text-xs text-primary font-medium hover:underline">
                  View scan reports →
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {plan.skinCareGuidance && (
        <Card className="border-violet-200/60 bg-violet-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" />
              Skin care from MediScan (separate from this meal plan)
            </CardTitle>
            <p className="text-sm text-muted font-normal mt-1">{plan.skinCareGuidance.summary}</p>
            <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
              {plan.skinCareGuidance.skinFoodDisclaimer ||
                'Face wash routine and skin food tips live on your MediScan report only — they are not added to this BP/sugar diet plan.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                Face wash & skin routine (summary)
              </p>
              <ul className="space-y-1.5">
                {plan.skinCareGuidance.whatYourSkinNeeds.slice(0, 4).map((n) => (
                  <li key={n} className="text-sm flex gap-2">
                    <span className="text-violet-600 shrink-0">•</span>
                    {n}
                  </li>
                ))}
              </ul>
            </div>
            {plan.skinCareGuidance.suggestedMedicines.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                  Prescribed products (face wash, serums — full steps on MediScan)
                </p>
                <ul className="space-y-2">
                  {plan.skinCareGuidance.suggestedMedicines.slice(0, 3).map((m) => (
                    <li key={m.name} className="text-sm p-2 rounded-lg bg-background border border-border">
                      <span className="font-medium">{m.name}</span>
                      <span className="text-muted"> ({m.form})</span> — {m.purpose}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link to="/dashboard/mediscan" className="text-xs text-primary font-medium hover:underline">
              Full skin report with minute details, face wash steps & self-care food guide →
            </Link>
          </CardContent>
        </Card>
      )}

      {(plan.prescriptionNotes?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              From your prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.prescriptionNotes!.map((n) => (
              <p key={n} className="text-sm text-muted">
                {n}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          Suggested meals for today
        </h3>
        <p className="text-sm text-muted mb-4">
          Built from your latest BP, blood sugar, weight, conditions, and prescriptions — not a fixed menu. Log meals
          below to rebalance the rest of your day.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MealBlock title="Breakfast" items={plan.dailyDiet.breakfast} />
          <MealBlock title="Lunch" items={plan.dailyDiet.lunch} />
          <MealBlock title="Dinner" items={plan.dailyDiet.dinner} />
          <MealBlock title="Snacks" items={plan.dailyDiet.snacks} />
        </div>
      </div>

      <DietAdherenceTracker id="log-meals" showStepLabel={false} />

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
              <Apple className="h-4 w-4" />
              Eat more of
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.foodsToFavor.map((f) => (
                <li key={f} className="text-sm flex gap-2">
                  <span className="text-emerald-600">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              Limit or avoid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.foodsToLimit.map((f) => (
                <li key={f} className="text-sm flex gap-2">
                  <span className="text-amber-600">−</span>
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5 flex gap-3">
          <Droplets className="h-8 w-8 text-cyan-500 shrink-0" />
          <div>
            <p className="font-semibold">Hydration</p>
            <p className="text-sm text-muted mt-1">{plan.hydration}</p>
          </div>
        </CardContent>
      </Card>

      {plan.conditionNotes.length > 0 && (
        <Card className="border-amber-200/60 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Based on your conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.conditionNotes.map((n) => (
              <p key={n} className="text-sm">
                {n}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {plan.medicationReminders.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Medicines & meals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {plan.medicationReminders.map((m) => (
              <p key={m} className="text-sm text-muted">
                {m}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">This week</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {plan.weeklyGoals.map((g) => (
              <li key={g} className="text-sm flex gap-2">
                <span className="text-primary font-bold">→</span>
                {g}
              </li>
            ))}
            {plan.lifestyleTips.map((t) => (
              <li key={t} className={cn('text-sm flex gap-2 text-muted')}>
                <span>•</span>
                {t}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link to="/dashboard?tab=profile">
          <Button variant="outline" className="gap-2">
            <Stethoscope className="h-4 w-4" />
            Update medical profile
          </Button>
        </Link>
        <Link to="/dashboard/mediscan">
          <Button variant="outline">Add MediScan</Button>
        </Link>
      </div>

      <p className="text-xs text-muted text-center max-w-2xl mx-auto">
        {plan.disclaimers.join(' ')}
      </p>
    </section>
  );
}
