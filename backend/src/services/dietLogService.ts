import { Types } from 'mongoose';
import {
  DietLog,
  type IDietLog,
  type DietAdherenceStatus,
  type MealSlot,
  type OffPlanCategory,
} from '../models/DietLog.js';
import { buildNextMealBalances, detectCategory, type NextMealBalance } from '../lib/dietBalanceAdvisor.js';

export interface DietAdherenceSummary {
  todayScore: number;
  mealsLoggedToday: number;
  followedCount: number;
  missedCount: number;
  offPlanCount: number;
  recentAlerts: string[];
  doctorNote: string;
  suggestedNextMeal?: string;
  /** Specific add/avoid list for the next meal based on what they ate */
  nextMealBalances: NextMealBalance[];
  onTrack: boolean;
}

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export async function logDietEntry(
  patientId: string,
  input: {
    mealSlot: MealSlot;
    status: DietAdherenceStatus;
    actualFood?: string;
    offPlanDescription?: string;
    offPlanCategory?: OffPlanCategory;
  }
): Promise<IDietLog> {
  const dayKey = todayKey();
  const food = input.actualFood?.trim() || input.offPlanDescription?.trim();
  let category = input.offPlanCategory;

  if (input.status === 'off_plan' && food && !category) {
    category = detectCategory(food, 'off_plan');
  }
  if (input.status === 'missed') {
    category = 'skipped_meal';
  }

  return DietLog.findOneAndUpdate(
    { patientId: new Types.ObjectId(patientId), dayKey, mealSlot: input.mealSlot },
    {
      patientId: new Types.ObjectId(patientId),
      mealSlot: input.mealSlot,
      status: input.status,
      actualFood: food || undefined,
      offPlanDescription: food || undefined,
      offPlanCategory: category,
      dayKey,
      loggedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec() as Promise<IDietLog>;
}

export async function getDietLogsForPatient(patientId: string, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceKey = since.toISOString().slice(0, 10);

  return DietLog.find({
    patientId: new Types.ObjectId(patientId),
    dayKey: { $gte: sinceKey },
  })
    .sort({ dayKey: -1, loggedAt: -1 })
    .lean();
}

export async function getTodayDietLogs(patientId: string) {
  return DietLog.find({
    patientId: new Types.ObjectId(patientId),
    dayKey: todayKey(),
  })
    .sort({ loggedAt: -1 })
    .lean();
}

export function buildAdherenceSummary(
  logs: Array<{
    status: DietAdherenceStatus;
    mealSlot: MealSlot;
    dayKey: string;
    actualFood?: string;
    offPlanDescription?: string;
    offPlanCategory?: OffPlanCategory;
  }>,
  flags: { highBp: boolean; highSugar: boolean; diabetic: boolean }
): DietAdherenceSummary {
  const today = todayKey();
  const todayLogs = logs.filter((l) => l.dayKey === today);
  const recent = logs.filter((l) => l.dayKey >= todayKey(new Date(Date.now() - 2 * 86400000)));

  const followedCount = todayLogs.filter((l) => l.status === 'followed').length;
  const missedCount = todayLogs.filter((l) => l.status === 'missed').length;
  const offPlanCount = todayLogs.filter((l) => l.status === 'off_plan').length;
  const mealsLoggedToday = todayLogs.length;
  const todayScore =
    mealsLoggedToday === 0 ? 100 : Math.round((followedCount / Math.max(mealsLoggedToday, 1)) * 100);

  const nextMealBalances = buildNextMealBalances(todayLogs, flags);

  const recentAlerts: string[] = [];
  let doctorNote =
    'Log each meal so we know if you followed your plan or what you ate — we will balance your next meal.';
  let suggestedNextMeal: string | undefined;

  const recentOffPlan = recent.filter((l) => l.status === 'off_plan');
  const recentMissed = recent.filter((l) => l.status === 'missed');

  for (const log of recentOffPlan.slice(0, 2)) {
    const ate = log.actualFood || log.offPlanDescription || 'off-plan food';
    recentAlerts.push(`You logged: "${ate}" — see what to add at your next meal below.`);
  }

  if (recentOffPlan.length > 0) {
    doctorNote =
      'You ate off-plan recently. Follow the “Balance your next meal” guide — it tells you exactly what to add and avoid.';
    if (nextMealBalances[0]) {
      suggestedNextMeal = `For ${nextMealBalances[0].forMealLabel}: add ${nextMealBalances[0].addThese.slice(0, 2).join(', ')}.`;
    }
  }

  if (recentMissed.some((l) => l.mealSlot === 'breakfast')) {
    recentAlerts.push('You skipped breakfast — do not overeat at lunch; eat a moderate balanced portion.');
  }

  if (recentMissed.length >= 2) {
    doctorNote =
      'Multiple missed meals today. Eat on time at the next slot with a smaller balanced plate.';
  }

  if (todayScore >= 80 && offPlanCount === 0 && missedCount === 0 && mealsLoggedToday >= 2) {
    doctorNote = 'You are on track today. Keep following your plan and log vitals twice weekly.';
  }

  if (flags.highSugar || flags.diabetic) {
    if (offPlanCount > 0) {
      recentAlerts.push('Tip: log a post-meal sugar reading 1–2 hours after off-plan food.');
    }
  }

  return {
    todayScore,
    mealsLoggedToday,
    followedCount,
    missedCount,
    offPlanCount,
    recentAlerts: [...new Set(recentAlerts)],
    doctorNote,
    suggestedNextMeal,
    nextMealBalances,
    onTrack: offPlanCount === 0 && missedCount === 0 && mealsLoggedToday >= 1,
  };
}

export function applyAdherenceToDiet(
  dailyDiet: { breakfast: string[]; lunch: string[]; dinner: string[]; snacks: string[] },
  summary: DietAdherenceSummary,
  _flags: { highBp: boolean; highSugar: boolean }
): typeof dailyDiet {
  if (summary.nextMealBalances.length === 0) return dailyDiet;

  const next = { ...dailyDiet };

  for (const balance of summary.nextMealBalances) {
    const key = balance.forMeal === 'snack' ? 'snacks' : balance.forMeal;
    const mealList = [...next[key]];

    mealList.unshift(
      `Adjusted for “${balance.becauseYouAte}”: add ${balance.addThese.slice(0, 2).join(', ')}`
    );
    mealList.push(`Skip at ${balance.forMealLabel.toLowerCase()}: ${balance.avoidThese.slice(0, 2).join('; ')}`);
    if (balance.portionTip) {
      mealList.push(balance.portionTip);
    }

    next[key] = mealList.slice(0, 8);
  }

  return next;
}
