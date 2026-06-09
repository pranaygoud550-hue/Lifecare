import { useState } from 'react';
import { toast } from 'react-toastify';
import { Check, AlertTriangle, Utensils, Plus, Minus, ArrowRight } from 'lucide-react';
import { useGetWellnessPlanQuery, useLogDietEntryMutation } from '@/features/api/apiSlice';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { MealSlot, DietAdherenceStatus, OffPlanCategory } from '@/types/wellness';

const MEALS: { slot: MealSlot; label: string; time: string }[] = [
  { slot: 'breakfast', label: 'Breakfast', time: '7–9 am' },
  { slot: 'lunch', label: 'Lunch', time: '12–2 pm' },
  { slot: 'snack', label: 'Snack', time: '4–5 pm' },
  { slot: 'dinner', label: 'Dinner', time: '7–9 pm' },
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
        toast.success('Great — you followed your diet plan');
      } else if (status === 'missed') {
        toast.info('Skipped meal logged — see how to balance your next meal below');
      } else {
        toast.success('Logged — check “Balance your next meal” for what to add');
      }
      resetForm();
    } catch {
      toast.error('Could not save meal log');
    }
  };

  return (
    <Card id={id} className="border-emerald-200/60 scroll-mt-24">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Utensils className="h-5 w-5 text-emerald-600" />
              {showStepLabel ? 'Step 3 — Did you follow your diet?' : 'Log what you ate today'}
            </CardTitle>
            <CardDescription>
              {showStepLabel
                ? 'Tell us if you followed the plan, skipped a meal, or ate something else — we will adjust your next meals from your BP and sugar plan.'
                : 'Missed a meal or ate something else? Log it here — your next meal plan updates automatically to rebalance.'}
            </CardDescription>
          </div>
          {adherence && (
            <Badge variant={adherence.onTrack ? 'success' : 'warning'}>
              {adherence.todayScore}% on plan
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {adherence?.doctorNote && (
          <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 text-sm">
            <p className="font-semibold text-primary mb-1">Your care coach says</p>
            <p className="text-muted">{adherence.doctorNote}</p>
          </div>
        )}

        {adherence?.nextMealBalances && adherence.nextMealBalances.length > 0 && (
          <div className="space-y-3">
            {adherence.nextMealBalances.map((balance) => (
              <div
                key={`${balance.forMeal}-${balance.becauseYouAte}`}
                className="rounded-xl border-2 border-emerald-200 bg-emerald-50/80 p-4 space-y-3"
              >
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-900">
                      Balance your {balance.forMealLabel.toLowerCase()}
                    </p>
                    <p className="text-sm text-emerald-800 mt-0.5">
                      Because you had: <span className="font-medium">&ldquo;{balance.becauseYouAte}&rdquo;</span>
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-white/70 border border-emerald-100 p-3">
                    <p className="font-semibold text-emerald-800 flex items-center gap-1 mb-2">
                      <Plus className="h-4 w-4" /> Add to next meal
                    </p>
                    <ul className="space-y-1 text-emerald-900">
                      {balance.addThese.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg bg-white/70 border border-amber-100 p-3">
                    <p className="font-semibold text-amber-800 flex items-center gap-1 mb-2">
                      <Minus className="h-4 w-4" /> Avoid
                    </p>
                    <ul className="space-y-1 text-amber-900">
                      {balance.avoidThese.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="text-xs text-emerald-700 italic">{balance.portionTip}</p>
              </div>
            ))}
          </div>
        )}

        {adherence?.recentAlerts.map((alert) => (
          <div
            key={alert}
            className="flex gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{alert}</span>
          </div>
        ))}

        {todayMeals.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold text-muted mb-2">What you logged today</p>
            <div className="flex flex-wrap gap-2">
              {todayMeals.map((m) => {
                const label = MEALS.find((x) => x.slot === m.mealSlot)?.label ?? m.mealSlot;
                const ate = m.actualFood || m.offPlanDescription;
                return (
                  <Badge
                    key={m.mealSlot}
                    variant={
                      m.status === 'followed' ? 'success' : m.status === 'missed' ? 'warning' : 'danger'
                    }
                  >
                    {label}: {m.status === 'followed' ? 'On plan' : m.status === 'missed' ? 'Skipped' : ate || 'Off-plan'}
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

            return (
              <div key={meal.slot} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-semibold">{meal.label}</p>
                    <p className="text-xs text-muted">{meal.time}</p>
                  </div>
                  {log?.status === 'followed' && <Badge variant="success">On plan</Badge>}
                  {log?.status === 'missed' && <Badge variant="warning">Skipped</Badge>}
                  {log?.status === 'off_plan' && <Badge variant="danger">Off-plan</Badge>}
                </div>

                {planned && <p className="text-xs text-muted line-clamp-2">Your plan: {planned}</p>}
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
                          className="w-full gap-1 justify-start"
                          onClick={() => setLogMode('followed')}
                        >
                          <Check className="h-3.5 w-3.5" /> I followed my diet plan
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full justify-start"
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
                          I skipped this meal
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
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="gap-1"
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
                        />
                        <p className="text-xs text-muted">Pick a type (helps us balance your next meal)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {OFF_PLAN_CATEGORIES.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setOffPlanCategory(cat.id)}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                offPlanCategory === cat.id
                                  ? 'bg-amber-100 border-amber-400 text-amber-900 font-medium'
                                  : 'border-border hover:bg-muted/50'
                              }`}
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
                          Skipping meals can affect BP and sugar. We&apos;ll suggest a lighter balanced next meal.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isLoading}
                            onClick={() => handleLog(meal.slot, 'missed')}
                          >
                            Confirm skipped
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
                    className="w-full"
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
