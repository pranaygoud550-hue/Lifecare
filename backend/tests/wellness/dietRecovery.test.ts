import { buildNextMealBalances } from '../../src/lib/dietBalanceAdvisor.js';
import {
  buildPersonalizedDailyMeals,
  buildRecoveryMealsForUpcoming,
  computeVitalTrends,
  enrichVitalTipsWithTrends,
} from '../../src/lib/dietMealPlanner.js';
import { applyAdherenceToDiet, buildAdherenceSummary } from '../../src/services/dietLogService.js';

describe('diet personalization', () => {
  const flags = {
    diabetic: true,
    hypertensive: false,
    highBp: false,
    highSugar: true,
    overweight: false,
    underweight: false,
    kidney: false,
  };

  it('builds meals with doctor notes and vital tips', () => {
    const meals = buildPersonalizedDailyMeals(
      flags,
      { sugar: '180 mg/dL: avoid sweets' },
      ['Low rice, more vegetables']
    );
    expect(meals.lunch[0]).toMatch(/Doctor note/i);
    expect(meals.breakfast.some((l) => /sugar/i.test(l))).toBe(true);
  });

  it('detects rising sugar trend from last two readings', () => {
    const trends = computeVitalTrends([], [{ glucose: 200 }, { glucose: 160 }], []);
    expect(trends.sugarTrend).toBe('rising');
  });

  it('adds trend-based tips', () => {
    const tips = enrichVitalTipsWithTrends({}, { sugarTrend: 'rising' }, flags);
    expect(tips.sugar).toMatch(/trending up/i);
  });
});

describe('diet recovery after skip/off-plan', () => {
  const flags = {
    diabetic: true,
    hypertensive: true,
    highBp: true,
    highSugar: true,
    overweight: true,
    underweight: false,
    kidney: false,
  };

  it('replaces upcoming meals after skipped breakfast', () => {
    const recovery = buildRecoveryMealsForUpcoming('breakfast', 'missed', 'skipped_meal', flags);
    expect(recovery.lunch?.[0]).toMatch(/Adjusted/i);
    expect(recovery.snack?.[0]).toMatch(/Adjusted/i);
    expect(recovery.dinner?.[0]).toMatch(/Adjusted/i);
  });

  it('balances next meals based on most recent log (not slot order)', () => {
    const balances = buildNextMealBalances(
      [
        { mealSlot: 'breakfast', status: 'followed', loggedAt: '2026-06-16T07:00:00Z' },
        { mealSlot: 'lunch', status: 'off_plan', actualFood: 'biryani', loggedAt: '2026-06-16T13:30:00Z' },
        { mealSlot: 'snack', status: 'missed', loggedAt: '2026-06-16T16:00:00Z' },
      ],
      { highBp: true, highSugar: true, diabetic: true }
    );
    expect(balances[0]?.forMeal).toBe('dinner');
    expect(balances[0]?.becauseYouAte).toMatch(/Skipped snack/i);
  });

  it('applyAdherenceToDiet replaces upcoming meals and marks adjusted slots', () => {
    const base = buildPersonalizedDailyMeals(flags, {}, []);
    const todayLogs = [
      {
        mealSlot: 'lunch' as const,
        status: 'missed' as const,
        dayKey: '2026-06-16',
        loggedAt: new Date().toISOString(),
      },
    ];
    const summary = buildAdherenceSummary(todayLogs, {
      highBp: true,
      highSugar: true,
      diabetic: true,
    });
    const updated = applyAdherenceToDiet(base, summary, flags, todayLogs);

    expect(updated.snacks[0]).toMatch(/Adjusted/i);
    expect(updated.dinner[0]).toMatch(/Adjusted/i);
    expect(summary.adjustedMeals).toContain('snack');
    expect(summary.adjustedMeals).toContain('dinner');
  });
});
