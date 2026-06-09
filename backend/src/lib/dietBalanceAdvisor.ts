import type { DietAdherenceStatus, MealSlot } from '../models/DietLog.js';

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

const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
};

const NEXT_MEAL: Record<MealSlot, MealSlot> = {
  breakfast: 'snack',
  lunch: 'snack',
  snack: 'dinner',
  dinner: 'breakfast',
};

function detectCategory(text: string, status: DietAdherenceStatus): OffPlanCategory {
  if (status === 'missed') return 'skipped_meal';
  const t = text.toLowerCase();
  if (/biryani|pizza|burger|fries|samosa|pakora|fried|chips|vada|puri/.test(t)) return 'fried';
  if (/sweet|cake|ice.?cream|chocolate|mithai|dessert|soda|cola|juice|pastry|donut/.test(t)) return 'sweets';
  if (/pickle|papad|namkeen|chips|salty|restaurant|gravy/.test(t)) return 'salty';
  if (/mcd|kfc|domino|fast.?food|street food/.test(t)) return 'fast_food';
  if (/extra|rice|large|double|overeat|buffet/.test(t)) return 'large_portion';
  return 'other';
}

function balanceForCategory(
  category: OffPlanCategory,
  nextMeal: MealSlot,
  flags: { highBp: boolean; highSugar: boolean; diabetic: boolean },
  actualFood: string
): NextMealBalance {
  const label = MEAL_LABELS[nextMeal];
  const base: NextMealBalance = {
    forMeal: nextMeal,
    forMealLabel: label,
    becauseYouAte: actualFood || 'an off-plan meal',
    addThese: [],
    avoidThese: [],
    portionTip: 'Eat slowly and stop when 80% full.',
  };

  const sugarFocus = flags.highSugar || flags.diabetic;

  switch (category) {
    case 'sweets':
      return {
        ...base,
        addThese: sugarFocus
          ? ['Green salad or cucumber first', 'Roasted chana or handful of nuts (if allowed)', 'Plain dal + vegetables', 'Water or unsweetened tea']
          : ['Fresh vegetable salad', 'Dal + sabzi with less oil', 'Curd or buttermilk'],
        avoidThese: ['Sweets, mithai, fruit juice, soda', 'White bread or extra rice', 'Fried snacks'],
        portionTip: sugarFocus
          ? 'Log a post-meal sugar reading in 2 hours. Keep the next meal light.'
          : 'Skip dessert today — fruit only if your sugar is normal.',
      };
    case 'fried':
      return {
        ...base,
        addThese: [
          'Steamed or grilled food only (no frying)',
          'Large portion of vegetables or salad',
          'Buttermilk or lemon water',
          flags.highBp ? 'Food with minimal salt' : 'Home-cooked dal',
        ],
        avoidThese: ['Fried foods, pakoras, paratha with oil', 'Creamy gravies', 'Packaged snacks'],
        portionTip: 'Your last meal was heavy on oil — go light and fiber-rich next.',
      };
    case 'salty':
      return {
        ...base,
        addThese: [
          'Fresh fruits (apple, papaya) or coconut water',
          'Steamed vegetables',
          'Plain roti or brown rice in small portion',
          'Extra water through the day',
        ],
        avoidThese: ['Pickles, papad, chips, restaurant gravies', 'Extra salt on food'],
        portionTip: flags.highBp
          ? 'Salt from your last meal can raise BP — keep the next meal under 1 tsp salt total.'
          : 'Choose low-sodium home food for the next meal.',
      };
    case 'fast_food':
      return {
        ...base,
        addThese: ['Home-cooked khichdi or dal + roti', 'Vegetable soup', 'Probiotic curd', 'Plenty of water'],
        avoidThese: ['More fast food or street food', 'Sugary drinks', 'Late-night snacking'],
        portionTip: 'Fast food is high in salt, fat, and sugar — reset with a simple home meal.',
      };
    case 'large_portion':
      return {
        ...base,
        addThese: ['Light soup or salad to start', 'Half your usual roti/rice portion', 'Extra vegetables, less carbs'],
        avoidThese: ['Second servings', 'Heavy desserts', 'Late heavy dinner'],
        portionTip: 'Do not skip the next meal — eat a smaller balanced portion instead.',
      };
    case 'skipped_meal':
      return {
        ...base,
        addThese: [
          'Do not overeat to compensate',
          'Protein + fiber: dal, vegetables, one roti or small rice portion',
          'A fruit or handful of nuts if hungry later',
        ],
        avoidThese: ['Large oily meal to "make up"', 'Sugary drinks on empty stomach'],
        portionTip: 'Missing meals can spike sugar later — eat on time at the next slot.',
      };
    default:
      return {
        ...base,
        addThese: sugarFocus
          ? ['Vegetables + dal, minimal rice', 'Roasted chana or cucumber', 'Water before eating']
          : ['Salad first, then dal + sabzi', 'Curd or buttermilk', 'Fruit instead of dessert'],
        avoidThese: ['Repeating the same off-plan food', 'Fried or sugary items', 'Large late dinner'],
        portionTip: 'Tell us what you ate so we can fine-tune — keep the next meal simple and home-cooked.',
      };
  }
}

export function buildNextMealBalances(
  todayLogs: Array<{
    mealSlot: MealSlot;
    status: DietAdherenceStatus;
    actualFood?: string;
    offPlanDescription?: string;
    offPlanCategory?: OffPlanCategory;
  }>,
  flags: { highBp: boolean; highSugar: boolean; diabetic: boolean }
): NextMealBalance[] {
  const issues = todayLogs.filter((l) => l.status === 'off_plan' || l.status === 'missed');
  if (issues.length === 0) return [];

  const balances: NextMealBalance[] = [];
  const seen = new Set<MealSlot>();

  for (const log of issues.sort((a, b) => slotOrder(a.mealSlot) - slotOrder(b.mealSlot))) {
    const nextMeal = NEXT_MEAL[log.mealSlot];
    if (seen.has(nextMeal)) continue;
    seen.add(nextMeal);

    const foodText = log.actualFood || log.offPlanDescription || (log.status === 'missed' ? 'Skipped meal' : 'Off-plan food');
    const category =
      log.offPlanCategory ||
      detectCategory(foodText, log.status);

    balances.push(balanceForCategory(category, nextMeal, flags, foodText));
  }

  return balances.slice(0, 2);
}

function slotOrder(slot: MealSlot): number {
  return { breakfast: 0, lunch: 1, snack: 2, dinner: 3 }[slot];
}

export { detectCategory, MEAL_LABELS, NEXT_MEAL };
