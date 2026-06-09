export type WellnessStatus = 'good' | 'needs_attention' | 'consult_doctor';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type DietAdherenceStatus = 'followed' | 'missed' | 'off_plan';
export type OffPlanCategory =
  | 'fried'
  | 'sweets'
  | 'salty'
  | 'fast_food'
  | 'large_portion'
  | 'skipped_meal'
  | 'other';

export interface NextMealBalance {
  forMeal: MealSlot;
  forMealLabel: string;
  becauseYouAte: string;
  addThese: string[];
  avoidThese: string[];
  portionTip: string;
}

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
}

export interface TodayMealLog {
  mealSlot: MealSlot;
  status: DietAdherenceStatus;
  actualFood?: string;
  offPlanDescription?: string;
  offPlanCategory?: OffPlanCategory;
}

export interface WellnessVitalInsight {
  type: string;
  label: string;
  value: string;
  status: WellnessStatus;
  dietTip: string;
}

export interface WellnessScanInsight {
  scanType: string;
  label: string;
  prediction?: string;
  tip: string;
}

import type { SkinCareAdvice } from '@/types/mediscan';

export interface WellnessPlan {
  generatedAt: string;
  overallStatus: WellnessStatus;
  healthSummary: string;
  dataUsed: string[];
  bmi?: { value: number; category: string };
  dailyDiet: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
    snacks: string[];
  };
  foodsToFavor: string[];
  foodsToLimit: string[];
  hydration: string;
  lifestyleTips: string[];
  vitalInsights: WellnessVitalInsight[];
  scanInsights: WellnessScanInsight[];
  skinCareGuidance?: SkinCareAdvice | null;
  prescriptionNotes: string[];
  conditionNotes: string[];
  medicationReminders: string[];
  weeklyGoals: string[];
  disclaimers: string[];
  adherence?: DietAdherenceSummary;
  todayMeals?: TodayMealLog[];
}

export interface DietLogEntry {
  _id: string;
  mealSlot: MealSlot;
  status: DietAdherenceStatus;
  actualFood?: string;
  offPlanDescription?: string;
  offPlanCategory?: OffPlanCategory;
  dayKey: string;
  loggedAt: string;
}
