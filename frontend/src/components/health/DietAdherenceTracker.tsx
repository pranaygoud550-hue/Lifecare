import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  Check,
  AlertTriangle,
  Utensils,
  Plus,
  Minus,
  ArrowRight,
  Sun,
  Salad,
  Cookie,
  Moon,
} from 'lucide-react';
import { useGetWellnessPlanQuery, useLogDietEntryMutation } from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MealSlot, DietAdherenceStatus, OffPlanCategory } from '@/types/wellness';
import type { LucideIcon } from 'lucide-react';

const MEALS: { slot: MealSlot; label: string; time: string; icon: LucideIcon; accent: string }[] = [
  { slot: 'breakfast', label: 'Breakfast', time: '7–9 am', icon: Sun, accent: 'from-orange-50 to-amber-50 border-orange-200/60' },
  { slot: 'lunch', label: 'Lunch', time: '12–2 pm', icon: Salad, accent: 'from-emerald-50 to-teal-50 border-emerald-200/60' },
  { slot: 'snack', label: 'Snack', time: '4–5 pm', icon: Cookie, accent: 'from-pink-50 to-rose-50 border-pink-200/60' },
  { slot: 'dinner', label: 'Dinner', time: '7–9 pm', icon: Moon, accent: 'from-indigo-50 to-violet-50 border-indigo-200/60' },
];

const OFF_PLAN_CATEGORIES: { id: OffPlanCategory; label: string }[] = [
  { id: 'fried', label: 'Fried / oily' },
  { id: 'sweets', label: 'Sweets / sugar' },
  { id: 'salty', label: 'Salty / snacks' },
  { id: 'fast_food', label: 'Fast food' },
  { id: 'large_portion', label: 'Large portion' },
  { id: 'other', label: 'Other' },
];

type LogMode = 'choose' | 'followed' | 'off_plan' | 'missed';

export function DietAdherenceTracker({
  id,
  showStepLabel = true,
}: {
  id?: string;
  showStepLabel?: boolean;
}) {
  const { data: planData } = useGetWellnessPlanQuery();
  const [logDiet, { isLoading }] = useLogDietEntryMutation();
  const [activeSlot, setActiveSlot] = useState<MealSlot | null>(null);
  const [logMode, setLogMode] = useState<LogMode>('choose');
  const [actualFood, setActualFood] = useState('');
  const [offPlanCategory, setOffPlanCategory] = useState<OffPlanCategory | undefined>();
  const [celebrateSlot, setCelebrateSlot] = useState<MealSlot | null>(null);

  const plan = planData?.data;
  const todayMeals = plan?.todayMeals ?? [];
  const adherence = plan?.adherence;

  const getMealLog = (slot: MealSlot) => todayMeals.find((m) => m.mealSlot === slot);

  const resetForm = () => {
    setActiveSlot(null);
    setLogMode('choose');
    setActualFood('');
    setOffPlanCategory(undefined);
  };

  const handleLog = async (slot: MealSlot, status: DietAdherenceStatus) => {
    const food = actualFood.trim();

    if (status === 'off_plan' && !food) {
      toast.error('Please tell us what you ate so we can balance your next meal');
      return;
    }

    try {
      await logDiet({
        mealSlot: slot,
        status,
        actualFood: food || undefined,
        offPlanDescription: food || undefined,
        offPlanCategory: status === 'off_plan' ? offPlanCategory : undefined,
      }).unwrap();

      if (status === 'followed') {
        toast.success('Wonderful — you stayed on plan! 🌟');
      } else if (status === 'missed') {
        toast.info('Logged — we\'ll help you balance your next meal');
      } else {
        toast.success('Got it — check your personalized balance tips below');
      }
      setCelebrateSlot(slot);
      setTimeout(() => setCelebrateSlot(null), 700);
      resetForm();
    } catch {
      toast.error('Could not save meal log');
    }
  };

  return (
    <Card
      id={id}
      className="border-emerald-200/60 scroll-mt-24 overflow-hidden bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 shadow-lg"
    >
      <CardHeader className="pb-3 bg-gradient-to-r from-emerald-600/5 to-teal-600/5 border-b border-emerald-100/80">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100">
                <Utensils className="h-5 w-5 text-emerald-600" />
              </div>
              {showStepLabel ? 'Step 3 — Did you follow your diet?' : 'Log what you ate today'}
            </CardTitle>
            <CardDescription className="mt-1.5">
              {showStepLabel
                ? 'Tell us if you followed the plan, skipped a meal, or ate something else — we will adjust your next meals from your BP and sugar plan.'
                : 'Missed a meal or ate something else? Log it here — your next meal plan updates automatically to rebalance.'}
            </CardDescription>
          </div>
          {adherence && (
            <div className="shrink-0 text-center">
              <div
                className={cn(
                  'inline-flex items-center justify-center w-14 h-14 rounded-full text-lg font-bold border-4 transition-all',
                  adherence.onTrack
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300 lc-positive-glow'
                    : 'bg-sky-100 text-sky-700 border-sky-300'
                )}
              >
                {adherence.todayScore}%
              </div>
              <p className="text-[10px] text-muted mt-1 font-medium">today&apos;s progress</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {adherence?.doctorNote && (
          <div className="rounded-xl bg-gradient-to-r from-primary/5 to-emerald-50 border border-primary/15 p-4 text-sm">
            <p className="font-semibold text-primary mb-1">Your care coach says</p>
            <p className="text-muted leading-relaxed">{adherence.doctorNote}</p>
          </div>
        )}

        {adherence?.nextMealBalances && adherence.nextMealBalances.length > 0 && (
          <div className="space-y-3">
            {adherence.nextMealBalances.map((balance) => (
              <div
                key={`${balance.forMeal}-${balance.becauseYouAte}`}
                className="rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50/80 p-4 space-y-3 shadow-sm lc-card-pop"
              >
                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-200/60">
                    <ArrowRight className="h-4 w-4 text-teal-700 shrink-0" />
                  </div>
                  <div>
                    <p className="font-bold text-teal-900">
                      Balance your {balance.forMealLabel.toLowerCase()}
                    </p>
                    <p className="text-sm text-teal-800 mt-0.5">
                      You had: <span className="font-medium">&ldquo;{balance.becauseYouAte}&rdquo;</span> — here&apos;s how to stay on track
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-white/80 border border-emerald-100 p-3 shadow-sm">
                    <p className="font-semibold text-emerald-700 flex items-center gap-1 mb-2">
                      <Plus className="h-4 w-4" /> Add to next meal
                    </p>
                    <ul className="space-y-1 text-emerald-900">
                      {balance.addThese.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl bg-white/80 border border-sky-100 p-3 shadow-sm">
                    <p className="font-semibold text-sky-700 flex items-center gap-1 mb-2">
                      <Minus className="h-4 w-4" /> Go lighter on
                    </p>
                    <ul className="space-y-1 text-sky-900">
                      {balance.avoidThese.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="text-xs text-teal-700 italic">{balance.portionTip}</p>
              </div>
            ))}
          </div>
        )}

        {adherence?.recentAlerts.map((alert) => (
          <div
            key={alert}
            className="flex gap-2 text-sm text-sky-800 bg-sky-50 border border-sky-200 rounded-xl p-3 lc-card-pop"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-sky-600" />
            <span>{alert}</span>
          </div>
        ))}

        {todayMeals.length > 0 && (
          <div className="rounded-xl border border-emerald-100 bg-white/70 p-3.5">
            <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Logged today</p>
            <div className="flex flex-wrap gap-2">
              {todayMeals.map((m) => {
                const label = MEALS.find((x) => x.slot === m.mealSlot)?.label ?? m.mealSlot;
                const ate = m.actualFood || m.offPlanDescription;
                return (
                  <Badge
                    key={m.mealSlot}
                    variant={
                      m.status === 'followed' ? 'success' : m.status === 'missed' ? 'secondary' : 'warning'
                    }
                  >
                    {label}:{' '}
                    {m.status === 'followed' ? 'On plan ✓' : m.status === 'missed' ? 'Rest meal' : ate || 'Logged'}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          {MEALS.map((meal) => {
            const log = getMealLog(meal.slot);
            const planned = plan?.dailyDiet[meal.slot === 'snack' ? 'snacks' : meal.slot]?.[0];
            const isActive = activeSlot === meal.slot;
            const Icon = meal.icon;

            return (
              <div
                key={meal.slot}
                className={cn(
                  'rounded-2xl border-2 p-4 space-y-3 transition-all bg-gradient-to-br lc-hover-lift lc-card-pop',
                  meal.accent,
                  isActive && 'ring-2 ring-emerald-300 ring-offset-2 shadow-md',
                  celebrateSlot === meal.slot && 'lc-celebrate'
                )}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white/80 shadow-sm">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{meal.label}</p>
                      <p className="text-xs text-muted">{meal.time}</p>
                    </div>
                  </div>
                  {log?.status === 'followed' && <Badge variant="success">On plan ✓</Badge>}
                  {log?.status === 'missed' && <Badge variant="secondary">Rest meal</Badge>}
                  {log?.status === 'off_plan' && <Badge variant="warning">Logged</Badge>}
                </div>

                {planned && <p className="text-xs text-muted line-clamp-2 bg-white/50 rounded-lg p-2">Your plan: {planned}</p>}
                {log?.actualFood && log.status !== 'missed' && (
                  <p className="text-xs text-muted">You ate: {log.actualFood}</p>
                )}

                {isActive ? (
                  <div className="space-y-3">
                    {logMode === 'choose' && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">How did this meal go?</p>
                        <Button
                          size="sm"
                          className="w-full gap-1 justify-start bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setLogMode('followed')}
                        >
                          <Check className="h-3.5 w-3.5" /> I followed my diet plan
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full justify-start bg-white/80"
                          onClick={() => setLogMode('off_plan')}
                        >
                          I ate something else
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => setLogMode('missed')}
                        >
                          I took a rest from this meal
                        </Button>
                        <Button size="sm" variant="ghost" onClick={resetForm}>
                          Cancel
                        </Button>
                      </div>
                    )}

                    {logMode === 'followed' && (
                      <div className="space-y-2">
                        <Input
                          placeholder="What did you have? (optional)"
                          value={actualFood}
                          onChange={(e) => setActualFood(e.target.value)}
                          className="bg-white/90"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                            disabled={isLoading}
                            onClick={() => handleLog(meal.slot, 'followed')}
                          >
                            <Check className="h-3.5 w-3.5" /> Save — on plan
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setLogMode('choose')}>
                            Back
                          </Button>
                        </div>
                      </div>
                    )}

                    {logMode === 'off_plan' && (
                      <div className="space-y-2">
                        <Input
                          placeholder="What did you eat? (required)"
                          value={actualFood}
                          onChange={(e) => setActualFood(e.target.value)}
                          required
                          className="bg-white/90"
                        />
                        <p className="text-xs text-muted">Pick a type (helps us balance your next meal)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {OFF_PLAN_CATEGORIES.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setOffPlanCategory(cat.id)}
                              className={cn(
                                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                                offPlanCategory === cat.id
                                  ? 'bg-amber-100 border-amber-400 text-amber-900 font-medium'
                                  : 'border-border bg-white/80 hover:bg-muted/50'
                              )}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            disabled={isLoading || !actualFood.trim()}
                            onClick={() => handleLog(meal.slot, 'off_plan')}
                          >
                            Save & get balance tips
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setLogMode('choose')}>
                            Back
                          </Button>
                        </div>
                      </div>
                    )}

                    {logMode === 'missed' && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted">
                          No worries — we&apos;ll suggest a lighter, balanced next meal for you.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isLoading}
                            onClick={() => handleLog(meal.slot, 'missed')}
                            className="bg-white/80"
                          >
                            Confirm rest meal
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setLogMode('choose')}>
                            Back
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant={log ? 'outline' : 'default'}
                    className={cn('w-full', !log && 'bg-emerald-600 hover:bg-emerald-700')}
                    onClick={() => {
                      setActiveSlot(meal.slot);
                      setLogMode('choose');
                      setActualFood(log?.actualFood || log?.offPlanDescription || '');
                      setOffPlanCategory(log?.offPlanCategory);
                    }}
                  >
                    {log ? 'Update this meal' : 'Log this meal'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
