import type { MealSlot } from '../models/DietLog.js';

export const MEAL_ORDER: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export type PatientDietFlags = {
  diabetic: boolean;
  hypertensive: boolean;
  highBp: boolean;
  highSugar: boolean;
  overweight: boolean;
  underweight: boolean;
  kidney: boolean;
  vegetarian?: boolean;
};

export type VitalTrends = {
  bpTrend?: 'rising' | 'stable' | 'improving';
  sugarTrend?: 'rising' | 'stable' | 'improving';
  weightTrend?: 'rising' | 'stable' | 'falling';
};

export type DailyDietSlots = {
  breakfast: string[];
  lunch: string[];
  dinner: string[];
  snacks: string[];
};

export function mealsAfter(slot: MealSlot): MealSlot[] {
  const idx = MEAL_ORDER.indexOf(slot);
  return idx < 0 ? [] : MEAL_ORDER.slice(idx + 1);
}

export function mealSlotKey(slot: MealSlot): keyof DailyDietSlots {
  return slot === 'snack' ? 'snacks' : slot;
}

export function inferCurrentMealSlot(date = new Date()): MealSlot {
  const hour = date.getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}

function lowSalt(flags: PatientDietFlags): boolean {
  return flags.hypertensive || flags.highBp;
}

function lowGi(flags: PatientDietFlags): boolean {
  return flags.diabetic || flags.highSugar;
}

function mergeTip(existing: string | undefined, extra: string): string {
  return existing ? `${existing} ${extra}` : extra;
}

/** Compare last two readings to nudge meal strictness. */
export function computeVitalTrends(
  bpReadings: Array<{ systolic?: number; diastolic?: number }>,
  sugarReadings: Array<{ glucose?: number }>,
  weightReadings: Array<{ value?: number }>
): VitalTrends {
  const trends: VitalTrends = {};

  if (bpReadings.length >= 2) {
    const [latest, prev] = bpReadings;
    const lSys = latest?.systolic ?? 0;
    const pSys = prev?.systolic ?? 0;
    if (lSys > pSys + 5) trends.bpTrend = 'rising';
    else if (lSys < pSys - 5) trends.bpTrend = 'improving';
    else trends.bpTrend = 'stable';
  }

  if (sugarReadings.length >= 2) {
    const [latest, prev] = sugarReadings;
    const l = latest?.glucose ?? 0;
    const p = prev?.glucose ?? 0;
    if (l > p + 15) trends.sugarTrend = 'rising';
    else if (l < p - 15) trends.sugarTrend = 'improving';
    else trends.sugarTrend = 'stable';
  }

  if (weightReadings.length >= 2) {
    const [latest, prev] = weightReadings;
    const l = latest?.value ?? 0;
    const p = prev?.value ?? 0;
    if (l > p + 0.5) trends.weightTrend = 'rising';
    else if (l < p - 0.5) trends.weightTrend = 'falling';
    else trends.weightTrend = 'stable';
  }

  return trends;
}

export function enrichVitalTipsWithTrends(
  vitalTips: { bp?: string; sugar?: string; hr?: string },
  trends: VitalTrends,
  flags: PatientDietFlags
): { bp?: string; sugar?: string; hr?: string } {
  const tips = { ...vitalTips };

  if (trends.bpTrend === 'rising') {
    tips.bp = mergeTip(tips.bp, 'BP trending up — skip salt, pickles, and fried food today.');
  } else if (trends.bpTrend === 'improving') {
    tips.bp = mergeTip(tips.bp, 'BP improving — keep the same low-salt meals.');
  }

  if (trends.sugarTrend === 'rising') {
    tips.sugar = mergeTip(tips.sugar, 'Sugar trending up — smaller carb portions and walk after meals.');
  } else if (trends.sugarTrend === 'improving') {
    tips.sugar = mergeTip(tips.sugar, 'Sugar improving — stay on low-GI meals, no sweets.');
  }

  if (trends.weightTrend === 'rising' && flags.overweight) {
    tips.bp = mergeTip(tips.bp, 'Weight rising — reduce rice/roti portions at lunch and dinner.');
  } else if (trends.weightTrend === 'falling' && flags.underweight) {
    tips.sugar = mergeTip(tips.sugar, 'Weight falling — add protein snack (nuts, curd, egg).');
  }

  return tips;
}

/** Base meals tuned to profile — used before adherence adjustments. */
export function buildPersonalizedDailyMeals(
  flags: PatientDietFlags,
  vitalTips: { bp?: string; sugar?: string; hr?: string },
  doctorDietNotes?: string[]
): DailyDietSlots {
  const ls = lowSalt(flags);
  const gi = lowGi(flags);

  const breakfast: string[] = gi
    ? [
        'Vegetable oats or millet upma (no sugar)',
        'Boiled egg or paneer + cucumber',
        'Tea/coffee with little or no sugar',
      ]
    : [
        'Idli/dosa with sambar (less salt) or vegetable poha',
        'Apple or papaya (1 serving)',
        'Curd or sprouts for protein',
      ];

  if (flags.underweight) {
    breakfast.push('Extra: banana + handful peanuts or dates');
  }
  if (flags.overweight) {
    breakfast.push('Portion: 1 plate only — avoid second helping');
  }
  if (vitalTips.bp) breakfast.unshift(`BP focus: ${vitalTips.bp}`);
  if (vitalTips.sugar) breakfast.push(`Sugar focus: ${vitalTips.sugar}`);

  const lunch: string[] = [
    ls ? 'Large salad first (cucumber, carrot, tomato) — no salt on top' : 'Fresh salad before mains',
    gi ? '2 small phulka or ½ cup brown rice + dal + sabzi' : '2 roti + dal + seasonal vegetable',
    ls ? 'Buttermilk (no added salt)' : 'Curd or buttermilk',
  ];
  if (flags.highBp) lunch.push('Skip pickle, papad, and restaurant gravy today.');
  if (flags.highSugar) lunch.push('Walk 10 minutes after lunch; no white rice seconds.');
  if (flags.kidney) lunch.push('Moderate protein — follow your nephrologist portion rules.');

  const dinner: string[] = [
    gi ? 'Light dinner before 8:30 pm: vegetable soup + dal' : 'Khichdi or roti with vegetables',
    'Avoid fried food at night',
    flags.overweight ? 'Dinner portion: smaller than lunch' : 'Moderate portion',
  ];
  if (gi && flags.highSugar) {
    dinner.unshift('No sweets, fruit juice, or late snacks after dinner.');
  }

  const snacks: string[] = [
    gi ? 'Roasted chana or 10 almonds (if no allergy)' : 'Fruit or roasted makhana',
    'Green tea or buttermilk',
    'Avoid biscuits, soda, and sweets between meals',
  ];

  if (doctorDietNotes?.length) {
    const note = doctorDietNotes[0]!.slice(0, 120);
    lunch.unshift(`Doctor note: ${note}`);
  }

  return {
    breakfast: breakfast.slice(0, 7),
    lunch: lunch.slice(0, 7),
    dinner: dinner.slice(0, 7),
    snacks: snacks.slice(0, 6),
  };
}

/** Recovery menus for meals still ahead today after skip/off-plan. */
export function buildRecoveryMealsForUpcoming(
  triggerSlot: MealSlot,
  triggerStatus: 'missed' | 'off_plan',
  category: string | undefined,
  flags: PatientDietFlags,
  triggerFood?: string
): Partial<Record<MealSlot, string[]>> {
  const upcoming = mealsAfter(triggerSlot);
  const result: Partial<Record<MealSlot, string[]>> = {};
  const gi = lowGi(flags);
  const ls = lowSalt(flags);

  const reason =
    triggerStatus === 'missed'
      ? `You skipped ${triggerSlot} — eat on time at your next meal (smaller balanced plate).`
      : `Rebalance after “${triggerFood || 'off-plan food'}”.`;

  for (const slot of upcoming) {
    if (triggerStatus === 'missed') {
      if (slot === 'lunch') {
        result.lunch = [
          `⚡ Adjusted — ${reason}`,
          'Do not overeat to compensate',
          gi ? 'Dal + vegetables + 1 roti (no extra rice)' : 'Dal + sabzi + 2 roti',
          'Salad or curd first',
          ls ? 'No pickle or papad' : 'Home-cooked only',
        ];
      } else if (slot === 'snack') {
        result.snack = [
          `⚡ Adjusted — ${reason}`,
          gi ? 'Roasted chana or cucumber — no sweets' : 'Fruit or buttermilk',
          'Hydrate with water',
        ];
      } else if (slot === 'dinner') {
        result.dinner = [
          `⚡ Adjusted — ${reason}`,
          'Light dinner: vegetable soup or khichdi',
          gi ? 'No rice at dinner — dal + vegetables' : 'Half usual carb portion',
          'Finish before 8:30 pm',
        ];
      }
    } else {
      const cat = category ?? 'other';
      if (slot === 'snack' || slot === 'dinner') {
        const light =
          cat === 'sweets' || cat === 'fried' || cat === 'fast_food'
            ? ['Steamed vegetables', 'Plain dal', 'Water or unsweetened tea']
            : ['Salad first', 'Dal + vegetables', 'Skip fried items'];
        result[slot] = [
          `⚡ Adjusted — ${reason}`,
          ...light,
          gi ? 'Check sugar 1–2 hours after your last off-plan meal' : ls ? 'Extra water — less salt today' : 'Smaller portion than usual',
        ];
      }
      if (slot === 'lunch' && triggerSlot === 'breakfast') {
        result.lunch = [
          `⚡ Adjusted — ${reason}`,
          'Salad + dal + 1–2 roti',
          'Avoid repeating the same off-plan food',
        ];
      }
    }
  }

  return result;
}
