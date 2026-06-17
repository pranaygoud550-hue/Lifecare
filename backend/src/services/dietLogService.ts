import { Types } from 'mongoose';
import {
  DietLog,
  type IDietLog,
  type DietAdherenceStatus,
  type MealSlot,
  type OffPlanCategory,
} from '../models/DietLog.js';
import { buildNextMealBalances, detectCategory, type NextMealBalance } from '../lib/dietBalanceAdvisor.js';
import {
  buildRecoveryMealsForUpcoming,
  mealSlotKey,
  type DailyDietSlots,
  type PatientDietFlags,
} from '../lib/dietMealPlanner.js';

export interface DietAdherenceSummary {
  todayScore: number;
  mealsLoggedToday: number;
  followedCount: number;
  missedCount: number;
  offPlanCount: number;
  recentAlerts: string[];
  doctorNote: string;
  suggestedNextMeal?: string;
  nextMealBalances: NextMealBalance[];
  onTrack: boolean;
  /** Meals auto-updated after skip/off-plan */
  adjustedMeals: MealSlot[];
  lastTrigger?: {
    mealSlot: MealSlot;
    status: DietAdherenceStatus;
    food?: string;
  };
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

function findLatestIssue(
  todayLogs: Array<{
    mealSlot: MealSlot;
    status: DietAdherenceStatus;
    actualFood?: string;
    offPlanDescription?: string;
    offPlanCategory?: OffPlanCategory;
    loggedAt?: Date | string;
  }>
) {
  return todayLogs
    .filter((l) => l.status === 'off_plan' || l.status === 'missed')
    .sort((a, b) => new Date(b.loggedAt ?? 0).getTime() - new Date(a.loggedAt ?? 0).getTime())[0];
}

export function buildAdherenceSummary(
  logs: Array<{
    status: DietAdherenceStatus;
    mealSlot: MealSlot;
    dayKey: string;
    actualFood?: string;
    offPlanDescription?: string;
    offPlanCategory?: OffPlanCategory;
    loggedAt?: Date | string;
  }>,
  flags: { highBp: boolean; highSugar: boolean; diabetic: boolean }
): DietAdherenceSummary {
  const today = todayKey();
  const todayLogs = logs.filter((l) => l.dayKey === today);

  const followedCount = todayLogs.filter((l) => l.status === 'followed').length;
  const missedCount = todayLogs.filter((l) => l.status === 'missed').length;
  const offPlanCount = todayLogs.filter((l) => l.status === 'off_plan').length;
  const mealsLoggedToday = todayLogs.length;
  const todayScore =
    mealsLoggedToday === 0 ? 100 : Math.round((followedCount / Math.max(mealsLoggedToday, 1)) * 100);

  const nextMealBalances = buildNextMealBalances(todayLogs, flags);
  const latestIssue = findLatestIssue(todayLogs);

  const recentAlerts: string[] = [];
  let doctorNote =
    'Log each meal so we can tune your plan from your BP, sugar, and what you actually ate.';
  let suggestedNextMeal: string | undefined;
  const adjustedMeals: MealSlot[] = [];

  if (latestIssue) {
    const ate =
      latestIssue.actualFood ||
      latestIssue.offPlanDescription ||
      (latestIssue.status === 'missed' ? `skipped ${latestIssue.mealSlot}` : 'off-plan food');

    if (latestIssue.status === 'missed') {
      recentAlerts.push(
        `You skipped ${latestIssue.mealSlot} — your remaining meals today are updated (lighter, balanced portions).`
      );
      doctorNote =
        'Skipping meals can spike sugar later. Do not skip the next slot — eat a smaller balanced plate.';
    } else {
      recentAlerts.push(`Last log: “${ate}” — upcoming meals adjusted to rebalance your day.`);
      doctorNote =
        'Your plan changed based on your last meal. Follow the updated lunch/snack/dinner below.';
    }

    if (nextMealBalances[0]) {
      suggestedNextMeal = `Next (${nextMealBalances[0].forMealLabel}): ${nextMealBalances[0].addThese.slice(0, 2).join(', ')}.`;
    }
  }

  if (flags.highSugar || flags.diabetic) {
    if (offPlanCount > 0) {
      recentAlerts.push('Tip: log a post-meal sugar reading 1–2 hours after off-plan food.');
    }
    if (missedCount > 0) {
      recentAlerts.push('Missing meals can cause sugar swings — eat on time at the next slot.');
    }
  }

  if (todayScore >= 80 && offPlanCount === 0 && missedCount === 0 && mealsLoggedToday >= 2) {
    doctorNote = 'You are on track today. Keep following your plan and log vitals twice weekly.';
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
    adjustedMeals,
    lastTrigger: latestIssue
      ? {
          mealSlot: latestIssue.mealSlot,
          status: latestIssue.status,
          food: latestIssue.actualFood || latestIssue.offPlanDescription,
        }
      : undefined,
  };
}

export function applyAdherenceToDiet(
  dailyDiet: DailyDietSlots,
  summary: DietAdherenceSummary,
  flags: PatientDietFlags,
  todayLogs: Array<{
    mealSlot: MealSlot;
    status: DietAdherenceStatus;
    actualFood?: string;
    offPlanDescription?: string;
    offPlanCategory?: OffPlanCategory;
    loggedAt?: Date | string;
  }>
): DailyDietSlots {
  const next: DailyDietSlots = {
    breakfast: [...dailyDiet.breakfast],
    lunch: [...dailyDiet.lunch],
    dinner: [...dailyDiet.dinner],
    snacks: [...dailyDiet.snacks],
  };

  const latest = findLatestIssue(todayLogs);
  if (!latest) {
    return applyBalanceHints(next, summary.nextMealBalances);
  }

  const category = latest.offPlanCategory || detectCategory(
    latest.actualFood || latest.offPlanDescription || '',
    latest.status
  );

  const recovery = buildRecoveryMealsForUpcoming(
    latest.mealSlot,
    latest.status === 'missed' ? 'missed' : 'off_plan',
    category,
    flags,
    latest.actualFood || latest.offPlanDescription
  );

  for (const [slot, items] of Object.entries(recovery) as [MealSlot, string[]][]) {
    const key = mealSlotKey(slot);
    next[key] = items;
    if (!summary.adjustedMeals.includes(slot)) {
      summary.adjustedMeals.push(slot);
    }
  }

  return applyBalanceHints(next, summary.nextMealBalances);
}

function applyBalanceHints(
  dailyDiet: DailyDietSlots,
  balances: NextMealBalance[]
): DailyDietSlots {
  const next = { ...dailyDiet };

  for (const balance of balances) {
    const key = mealSlotKey(balance.forMeal);
    const existing = [...next[key]];
    const header = `Balance tip (${balance.forMealLabel}): add ${balance.addThese.slice(0, 2).join(', ')}`;
    if (!existing.some((line) => line.startsWith('Balance tip'))) {
      existing.unshift(header);
    }
    if (balance.portionTip && !existing.includes(balance.portionTip)) {
      existing.push(balance.portionTip);
    }
    next[key] = existing.slice(0, 8);
  }

  return next;
}
