import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DietAdherenceTracker } from '@/components/health/DietAdherenceTracker';
import {
  Apple,
  Brain,
  Coffee,
  Droplets,
  Heart,
  Moon,
  Salad,
  Sparkles,
  Stethoscope,
  Sun,
  UtensilsCrossed,
  Cookie,
} from 'lucide-react';
import { useGetWellnessPlanQuery } from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { WellnessStatus, MealSlot } from '@/types/wellness';
import type { LucideIcon } from 'lucide-react';

function statusBadge(status: WellnessStatus) {
  if (status === 'consult_doctor') return { variant: 'warning' as const, label: 'Care check-in' };
  if (status === 'needs_attention') return { variant: 'warning' as const, label: 'Keep going' };
  return { variant: 'success' as const, label: 'Doing great!' };
}

const MEAL_CONFIG: Record<
  string,
  { icon: LucideIcon; iconColor: string; className: string; emoji: string }
> = {
  Breakfast: {
    icon: Sun,
    iconColor: 'text-orange-500',
    className: 'wellness-meal-breakfast',
    emoji: '🌅',
  },
  Lunch: {
    icon: Salad,
    iconColor: 'text-emerald-600',
    className: 'wellness-meal-lunch',
    emoji: '🥗',
  },
  Dinner: {
    icon: Moon,
    iconColor: 'text-indigo-500',
    className: 'wellness-meal-dinner',
    emoji: '🌙',
  },
  Snacks: {
    icon: Cookie,
    iconColor: 'text-pink-500',
    className: 'wellness-meal-snack',
    emoji: '🍎',
  },
};

function MealBlock({
  title,
  items,
  adjusted,
}: {
  title: string;
  items: string[];
  adjusted?: boolean;
}) {
  const config = MEAL_CONFIG[title] ?? MEAL_CONFIG.Lunch;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'rounded-2xl border-2 p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 wellness-card-shine lc-hover-lift lc-card-pop',
        config.className,
        adjusted && 'ring-2 ring-amber-400/80 ring-offset-2'
      )}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="p-2 rounded-xl bg-white/70 shadow-sm">
          <Icon className={cn('h-5 w-5', config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground">{title}</p>
            {adjusted && (
              <Badge variant="warning" className="text-[10px]">
                Updated for you
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted uppercase tracking-wider">{config.emoji}</p>
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm flex gap-2 leading-snug">
            <span className="text-secondary shrink-0 font-bold">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative wellness-score-ring rounded-full">
        <svg width="88" height="88" className="-rotate-90">
          <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="6" />
          <circle
            cx="44"
            cy="44"
            r="36"
            fill="none"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">
          {score}%
        </span>
      </div>
      <span className="text-xs text-white/80 font-medium">{label}</span>
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
      <div className="space-y-4">
        <div className="h-40 rounded-2xl bg-emerald-100 animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <Card className="wellness-glass border-emerald-200/50 overflow-hidden">
        <CardContent className="py-14 text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <Salad className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-lg mb-1">Your personalized plan awaits</p>
            <p className="text-muted text-sm max-w-md mx-auto">
              Add your medical profile and vitals to unlock a diet plan tailored to your health.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link to="/dashboard?tab=profile">
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">Complete medical profile</Button>
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
  const todayScore = plan.adherence?.todayScore ?? 0;
  const adjustedMeals = plan.adherence?.adjustedMeals ?? [];
  const isAdjusted = (slot: MealSlot) => adjustedMeals.includes(slot);

  if (compact) {
    const slot = currentMealSlot();
    const mealLabel = slot.charAt(0).toUpperCase() + slot.slice(1);
    const mealKey = slot === 'snack' ? 'snacks' : slot;
    const todayMeal = plan.dailyDiet[mealKey]?.slice(0, 2) ?? [];
    const balance = plan.adherence?.nextMealBalances?.[0];

    return (
      <Card className="border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-teal-50 overflow-hidden wellness-card-shine">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-100">
                <Salad className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="font-bold">{t('dashboard.dietAssistant')}</p>
            </div>
            <Badge variant={overall.variant}>{overall.label}</Badge>
          </div>

          {plan.vitalInsights.length > 0 && (
            <div className="rounded-xl border border-emerald-100 bg-white/80 p-3 space-y-1.5">
              {plan.vitalInsights.slice(0, 2).map((v) => (
                <p key={v.type} className="text-xs text-muted">
                  <span className="font-semibold text-foreground">
                    {v.label} {v.value}
                  </span>
                  {' — '}
                  {v.dietTip}
                </p>
              ))}
            </div>
          )}

          {todayMeal.length > 0 && (
            <div className="text-sm">
              <p className="text-xs font-bold uppercase text-emerald-700 mb-1">
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
            <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
              {t('dashboard.balanceHint', {
                meal: balance.forMealLabel,
                food: balance.becauseYouAte,
              })}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard/wellness#log-meals">
              <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700">
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
      {/* Status hero strip */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-emerald-300/20 blur-2xl pointer-events-none" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="p-3.5 rounded-2xl bg-white/20 backdrop-blur-sm wellness-float shrink-0 lc-wiggle">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl sm:text-2xl font-bold">Your wellness assistant</h2>
                <Badge variant={overall.variant} className="text-xs">
                  {overall.label}
                </Badge>
              </div>
              <p className="text-sm text-white/85 max-w-lg leading-relaxed">{plan.healthSummary}</p>
              {plan.bmi && (
                <p className="text-sm font-medium mt-2 text-white/90">
                  BMI {plan.bmi.value} · {plan.bmi.category}
                </p>
              )}
            </div>
          </div>
          {plan.adherence && (
            <ScoreRing score={todayScore} label="Today's plan" />
          )}
        </div>
        <div className="relative flex flex-wrap gap-2 mt-5">
          {plan.dataUsed.map((d) => (
            <span
              key={d}
              className="text-xs px-3 py-1 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm"
            >
              {d}
            </span>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="ml-auto bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
          >
            Refresh plan
          </Button>
        </div>
      </div>

      {(plan.vitalInsights.length > 0 || plan.scanInsights.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {plan.vitalInsights.length > 0 && (
            <Card className="wellness-glass border-emerald-100/80 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-100">
                    <Heart className="h-4 w-4 text-red-500" />
                  </div>
                  From your vitals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.vitalInsights.map((v) => {
                  const b = statusBadge(v.status);
                  return (
                    <div
                      key={v.type}
                      className="p-3.5 rounded-xl bg-white/80 border border-emerald-50 hover:border-emerald-200 transition-colors"
                    >
                      <div className="flex justify-between gap-2 mb-1">
                        <span className="font-medium text-sm">{v.label}</span>
                        <Badge variant={b.variant} className="text-[10px]">
                          {v.value}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">{v.dietTip}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {plan.scanInsights.length > 0 && (
            <Card className="wellness-glass border-violet-100/80 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-violet-100">
                    <Brain className="h-4 w-4 text-violet-600" />
                  </div>
                  From MediScan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.scanInsights.map((s) => (
                  <div
                    key={s.scanType}
                    className="p-3.5 rounded-xl bg-white/80 border border-violet-50 hover:border-violet-200 transition-colors"
                  >
                    <p className="font-medium text-sm">{s.label}</p>
                    {s.prediction && <p className="text-xs text-muted mt-0.5">AI: {s.prediction}</p>}
                    <p className="text-xs mt-2 leading-relaxed">{s.tip}</p>
                  </div>
                ))}
                <Link
                  to="/dashboard/mediscan"
                  className="inline-flex text-xs text-emerald-700 font-semibold hover:underline"
                >
                  View scan reports →
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {plan.skinCareGuidance && (
        <Card className="border-violet-200/60 bg-gradient-to-br from-violet-50/80 to-purple-50/50 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" />
              Skin care from MediScan
            </CardTitle>
            <p className="text-sm text-muted font-normal mt-1">{plan.skinCareGuidance.summary}</p>
            <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-xl p-2.5 mt-2">
              {plan.skinCareGuidance.skinFoodDisclaimer ||
                'Face wash routine and skin food tips live on your MediScan report only — they are not added to this BP/sugar diet plan.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                Face wash & skin routine
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
                  Prescribed products
                </p>
                <ul className="space-y-2">
                  {plan.skinCareGuidance.suggestedMedicines.slice(0, 3).map((m) => (
                    <li key={m.name} className="text-sm p-2.5 rounded-xl bg-white/80 border border-violet-100">
                      <span className="font-medium">{m.name}</span>
                      <span className="text-muted"> ({m.form})</span> — {m.purpose}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link to="/dashboard/mediscan" className="text-xs text-primary font-medium hover:underline">
              Full skin report with minute details →
            </Link>
          </CardContent>
        </Card>
      )}

      {(plan.prescriptionNotes?.length ?? 0) > 0 && (
        <Card className="wellness-glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              From your prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.prescriptionNotes!.map((n) => (
              <p key={n} className="text-sm text-muted leading-relaxed">
                {n}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-emerald-100">
            <UtensilsCrossed className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Suggested meals for today</h3>
            <p className="text-sm text-muted">
              Built from your vitals, conditions & prescriptions — log meals below to rebalance your day.
            </p>
          </div>
        </div>

        {plan.adherence?.lastTrigger && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
            <p className="font-semibold mb-1">Plan updated after your last meal log</p>
            <p className="text-amber-900/90">
              {plan.adherence.lastTrigger.status === 'missed'
                ? `You skipped ${plan.adherence.lastTrigger.mealSlot}. Remaining meals are lighter and balanced.`
                : `After “${plan.adherence.lastTrigger.food || 'off-plan food'}”, upcoming meals were adjusted.`}
            </p>
            {plan.adherence.recentAlerts.map((a) => (
              <p key={a} className="text-xs mt-2 text-amber-800">
                {a}
              </p>
            ))}
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <MealBlock title="Breakfast" items={plan.dailyDiet.breakfast} adjusted={isAdjusted('breakfast')} />
          <MealBlock title="Lunch" items={plan.dailyDiet.lunch} adjusted={isAdjusted('lunch')} />
          <MealBlock title="Dinner" items={plan.dailyDiet.dinner} adjusted={isAdjusted('dinner')} />
          <MealBlock title="Snacks" items={plan.dailyDiet.snacks} adjusted={isAdjusted('snack')} />
        </div>
      </div>

      <DietAdherenceTracker id="log-meals" showStepLabel={false} />

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-white overflow-hidden wellness-card-shine">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-800">
              <div className="p-1.5 rounded-lg bg-emerald-100">
                <Apple className="h-4 w-4 text-emerald-600" />
              </div>
              Eat more of
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {plan.foodsToFavor.map((f) => (
                <li key={f} className="text-sm flex gap-2.5 items-start">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50 to-white overflow-hidden wellness-card-shine">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-900">
              <div className="p-1.5 rounded-lg bg-amber-100">
                <Coffee className="h-4 w-4 text-amber-700" />
              </div>
              Limit or avoid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {plan.foodsToLimit.map((f) => (
                <li key={f} className="text-sm flex gap-2.5 items-start">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                    −
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="wellness-glass overflow-hidden">
        <CardContent className="p-5 flex gap-4">
          <div className="p-3 rounded-2xl bg-cyan-100 shrink-0">
            <Droplets className="h-7 w-7 text-cyan-600" />
          </div>
          <div>
            <p className="font-semibold text-lg">Hydration</p>
            <p className="text-sm text-muted mt-1 leading-relaxed">{plan.hydration}</p>
          </div>
        </CardContent>
      </Card>

      {plan.conditionNotes.length > 0 && (
        <Card className="border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-orange-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Based on your conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.conditionNotes.map((n) => (
              <p key={n} className="text-sm leading-relaxed">
                {n}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {plan.medicationReminders.length > 0 && (
        <Card className="wellness-glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Medicines & meals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {plan.medicationReminders.map((m) => (
              <p key={m} className="text-sm text-muted leading-relaxed">
                {m}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            This week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            {plan.weeklyGoals.map((g) => (
              <li key={g} className="text-sm flex gap-2.5">
                <span className="text-emerald-600 font-bold shrink-0">→</span>
                {g}
              </li>
            ))}
            {plan.lifestyleTips.map((tip) => (
              <li key={tip} className="text-sm flex gap-2.5 text-muted">
                <span className="shrink-0">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link to="/dashboard?tab=profile">
          <Button variant="outline" className="gap-2 border-emerald-200 hover:bg-emerald-50">
            <Stethoscope className="h-4 w-4" />
            Update medical profile
          </Button>
        </Link>
        <Link to="/dashboard/mediscan">
          <Button variant="outline" className="border-emerald-200 hover:bg-emerald-50">
            Add MediScan
          </Button>
        </Link>
      </div>

      <p className="text-xs text-muted text-center max-w-2xl mx-auto leading-relaxed">
        {plan.disclaimers.join(' ')}
      </p>
    </section>
  );
}
