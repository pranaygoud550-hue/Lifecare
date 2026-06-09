import { Types } from 'mongoose';
import { User, VitalReading, ScanReport } from '../models/index.js';
import type { IUser } from '../models/User.js';
import type { IVitalReading } from '../models/VitalReading.js';
import type { IScanReport } from '../models/ScanReport.js';
import { buildSkinCareAdvice, type SkinCareAdvice } from '../utils/skinCareAdvice.js';
import { Prescription } from '../models/index.js';
import {
  getDietLogsForPatient,
  getTodayDietLogs,
  buildAdherenceSummary,
  applyAdherenceToDiet,
  type DietAdherenceSummary,
} from './dietLogService.js';

export type WellnessStatus = 'good' | 'needs_attention' | 'consult_doctor';

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
  /** Full MediScan skin guidance (pimples, pigmentation, etc.) merged into diet */
  skinCareGuidance?: SkinCareAdvice | null;
  prescriptionNotes: string[];
  conditionNotes: string[];
  medicationReminders: string[];
  weeklyGoals: string[];
  disclaimers: string[];
  adherence?: DietAdherenceSummary;
  todayMeals?: Array<{ mealSlot: string; status: string; offPlanDescription?: string }>;
}

type VitalEval = 'normal' | 'elevated' | 'concerning';

function evaluateBp(sys: number, dia: number): VitalEval {
  if (sys >= 140 || dia >= 90) return 'concerning';
  if (sys >= 130 || dia >= 80 || sys >= 120) return 'elevated';
  if (sys >= 90 && sys < 120 && dia >= 60 && dia < 80) return 'normal';
  return 'elevated';
}

function evaluateGlucose(g: number, meal?: string): VitalEval {
  if (meal === 'fasting') {
    if (g >= 126) return 'concerning';
    if (g >= 100) return 'elevated';
    if (g >= 70 && g < 100) return 'normal';
    return 'elevated';
  }
  if (g >= 200) return 'concerning';
  if (g >= 140) return 'elevated';
  return 'normal';
}

function evaluateHr(v: number): VitalEval {
  if (v < 50 || v > 100) return 'concerning';
  if (v < 60 || v > 90) return 'elevated';
  return 'normal';
}

function evaluateO2(v: number): VitalEval {
  if (v < 90) return 'concerning';
  if (v < 95) return 'elevated';
  return 'normal';
}

function toWellnessStatus(v: VitalEval): WellnessStatus {
  if (v === 'concerning') return 'consult_doctor';
  if (v === 'elevated') return 'needs_attention';
  return 'good';
}

function calcBmi(heightCm?: number, weightKg?: number): { value: number; category: string } | undefined {
  if (!heightCm || !weightKg || heightCm <= 0) return undefined;
  const m = heightCm / 100;
  const bmi = Math.round((weightKg / (m * m)) * 10) / 10;
  let category = 'Normal weight';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal weight';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obesity';
  return { value: bmi, category };
}

function hasCondition(conditions: string[], patterns: RegExp[]): boolean {
  const text = conditions.join(' ').toLowerCase();
  return patterns.some((p) => p.test(text));
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function formatVital(reading: IVitalReading): { label: string; value: string } {
  switch (reading.type) {
    case 'blood_pressure':
      return { label: 'Blood pressure', value: `${reading.systolic}/${reading.diastolic} mmHg` };
    case 'blood_sugar':
      return {
        label: 'Blood sugar',
        value: `${reading.glucose} mg/dL (${reading.glucoseMeal === 'fasting' ? 'fasting' : 'post-meal'})`,
      };
    case 'heart_rate':
      return { label: 'Heart rate', value: `${reading.value} bpm` };
    case 'oxygen':
      return { label: 'Oxygen', value: `${reading.value}% SpO₂` };
    case 'weight':
      return { label: 'Weight', value: `${reading.value} ${reading.unit || 'kg'}` };
    default:
      return { label: reading.type, value: '—' };
  }
}

const SCAN_LABELS: Record<string, string> = {
  chest_xray: 'Chest X-ray (MediScan)',
  skin_lesion: 'Skin check (MediScan)',
  retina: 'Eye scan (MediScan)',
};

export async function buildWellnessPlanForPatient(patientId: string): Promise<WellnessPlan> {
  const user = await User.findById(patientId).select('profile medicalHistory');
  if (!user) {
    throw new Error('Patient not found');
  }

  const latestByType = await VitalReading.aggregate([
    { $match: { patientId: new Types.ObjectId(patientId) } },
    { $sort: { recordedAt: -1 } },
    { $group: { _id: '$type', latest: { $first: '$$ROOT' } } },
  ]);
  const latestVitals = latestByType.map((g) => g.latest as IVitalReading);

  const scans = await ScanReport.find({ patientId })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('scanType prediction confidence probabilities status skinCareAdvice createdAt');

  const recentPrescriptions = await Prescription.find({ patientId })
    .sort({ date: -1 })
    .limit(3)
    .select('diagnosis advice medications date');

  const dietLogs = await getDietLogsForPatient(patientId, 7);
  const todayMeals = await getTodayDietLogs(patientId);

  const basePlan = composeWellnessPlan(user, latestVitals, scans, recentPrescriptions);

  const highBp = basePlan.vitalInsights.some((v) => v.type === 'blood_pressure' && v.status !== 'good');
  const highSugar = basePlan.vitalInsights.some((v) => v.type === 'blood_sugar' && v.status !== 'good');
  const diabetic = hasCondition(user.medicalHistory?.chronicConditions ?? [], [/diabet/i, /sugar/i]);

  const adherence = buildAdherenceSummary(dietLogs, {
    highBp,
    highSugar,
    diabetic,
  });

  const dailyDiet = applyAdherenceToDiet(basePlan.dailyDiet, adherence, { highBp, highSugar });

  if (adherence.mealsLoggedToday > 0) {
    basePlan.dataUsed.push('Today’s meal adherence log');
  }

  return {
    ...basePlan,
    dailyDiet,
    adherence,
    todayMeals: todayMeals.map((m) => ({
      mealSlot: m.mealSlot,
      status: m.status,
      actualFood: m.actualFood || m.offPlanDescription,
      offPlanDescription: m.offPlanDescription,
      offPlanCategory: m.offPlanCategory,
    })),
  };
}

function scanProbabilities(scan: IScanReport): Record<string, number> | undefined {
  if (!scan.probabilities) return undefined;
  if (scan.probabilities instanceof Map) {
    return Object.fromEntries(scan.probabilities);
  }
  return scan.probabilities as Record<string, number>;
}

function applySkinCareMetadata(skin: SkinCareAdvice, conditionNotes: string[]): void {
  conditionNotes.push(
    `Skin (MediScan — separate from meal plan): ${skin.primaryConcern}. Face wash & skin food tips are on your skin report only.`
  );
}

function composeWellnessPlan(
  user: IUser,
  latestVitals: IVitalReading[],
  scans: IScanReport[],
  prescriptions: Array<{ diagnosis?: string; advice?: string; medications?: Array<{ medicineName: string; beforeAfterFood?: string }>; date?: Date }>
): WellnessPlan {
  const mh = user.medicalHistory;
  const dataUsed: string[] = [];
  const foodsToFavor: string[] = [];
  const foodsToLimit: string[] = [];
  const lifestyleTips: string[] = [];
  const conditionNotes: string[] = [];
  const medicationReminders: string[] = [];
  const weeklyGoals: string[] = [];
  const vitalInsights: WellnessVitalInsight[] = [];
  const scanInsights: WellnessScanInsight[] = [];
  const prescriptionNotes: string[] = [];
  let skinCareGuidance: SkinCareAdvice | null = null;

  let worstStatus: WellnessStatus = 'good';

  function bump(status: WellnessStatus) {
    if (status === 'consult_doctor') worstStatus = 'consult_doctor';
    else if (status === 'needs_attention' && worstStatus === 'good') worstStatus = 'needs_attention';
  }

  if (mh?.bloodGroup || mh?.heightCm || mh?.weightKg) {
    dataUsed.push('Medical profile (height, weight, blood group)');
  }
  if (mh?.chronicConditions?.length) dataUsed.push('Chronic conditions');
  if (mh?.allergies?.length) dataUsed.push('Food & drug allergies');
  if (mh?.currentMedications?.length) dataUsed.push('Current medications');
  if (latestVitals.length) {
    const types = latestVitals.map((v) => formatVital(v).label).join(', ');
    dataUsed.push(`Latest vitals (${types})`);
  }
  const analyzedScans = scans.filter((s) =>
    ['ai_analyzed', 'doctor_reviewed', 'final'].includes(s.status)
  );
  if (analyzedScans.some((s) => s.scanType === 'chest_xray')) dataUsed.push('MediScan chest X-ray');
  if (analyzedScans.some((s) => s.scanType === 'skin_lesion')) dataUsed.push('MediScan skin check & skin-care tips');
  if (analyzedScans.some((s) => s.scanType === 'retina')) dataUsed.push('MediScan eye scan');
  if (mh?.pastSurgeries?.length) dataUsed.push('Past surgeries (general recovery diet)');
  if (prescriptions.length) dataUsed.push('Doctor prescriptions & meal timing');

  const bmi = calcBmi(mh?.heightCm, mh?.weightKg);
  if (bmi) {
    if (bmi.category === 'Overweight' || bmi.category === 'Obesity') {
      foodsToLimit.push('Fried foods, sugary drinks, large refined-carb portions');
      foodsToFavor.push('Vegetables, dal, grilled protein, millets, salads');
      lifestyleTips.push(`BMI ${bmi.value} (${bmi.category}) — aim for portion control and 30 min daily walking`);
      weeklyGoals.push('Lose 0.25–0.5 kg per week with steady habits (not crash diets)');
      bump('needs_attention');
    } else if (bmi.category === 'Underweight') {
      foodsToFavor.push('Protein-rich meals: eggs, paneer, dal, nuts, whole milk, bananas');
      lifestyleTips.push('Eat 3 balanced meals + 2 healthy snacks; strength training 2× weekly if cleared by doctor');
    }
  }

  const conditions = [...(mh?.chronicConditions ?? []), ...(mh?.familyHistory ?? [])];
  const diabetic = hasCondition(conditions, [/diabet/i, /sugar/i, /glucose/i, /prediabet/i]);
  const hypertensive = hasCondition(conditions, [/hypertens/i, /high blood pressure/i, /bp/i]);
  const heart = hasCondition(conditions, [/heart/i, /cardiac/i, /cholesterol/i, /cad/i]);
  const kidney = hasCondition(conditions, [/kidney/i, /renal/i, /ckd/i]);

  if (diabetic) {
    conditionNotes.push('Diabetes-related care: focus on steady blood sugar, not skipping meals.');
    foodsToFavor.push('Whole grains (brown rice, millets), vegetables, pulses, cinnamon in moderation');
    foodsToLimit.push('White bread, sweets, fruit juice, packaged snacks, honey-heavy desserts');
    weeklyGoals.push('Log fasting and post-meal sugar 3× per week');
    bump('needs_attention');
  }

  if (hypertensive || heart) {
    conditionNotes.push('Heart & blood pressure: low sodium, heart-friendly fats.');
    foodsToFavor.push('Oats, flaxseed, leafy greens, fish (if non-veg), olive oil in moderation');
    foodsToLimit.push('Pickles, papad, restaurant gravies, processed meat, excess salt');
    lifestyleTips.push('Reduce salt — aim under 5 g/day; check labels on packaged food');
    bump('needs_attention');
  }

  if (kidney) {
    foodsToLimit.push('Very high protein diets, excess potassium/sodium unless your doctor advises otherwise');
    conditionNotes.push('Kidney condition: follow nephrologist diet rules — this plan is general only.');
    bump('consult_doctor');
  }

  for (const allergy of mh?.allergies ?? []) {
    const a = allergy.toLowerCase();
    if (/peanut|nut|milk|dairy|egg|wheat|gluten|soy|shellfish|fish/.test(a)) {
      foodsToLimit.push(`Avoid ${allergy} (listed allergy)`);
    }
  }

  for (const med of mh?.currentMedications ?? []) {
    medicationReminders.push(`Take as prescribed: ${med}`);
    if (/metformin|insulin|glipizide/i.test(med)) {
      foodsToLimit.push('Skipping meals while on diabetes medicines — eat on time');
    }
    if (/warfarin|blood thinner/i.test(med)) {
      lifestyleTips.push('On blood thinners: keep vitamin K foods consistent (leafy greens) — ask your doctor');
    }
  }

  if (mh?.smokingStatus && /current|yes|smok/i.test(mh.smokingStatus)) {
    lifestyleTips.push('Smoking harms heart and lungs — consider cessation support on LifeCare+ or national quitline');
    bump('needs_attention');
  }

  if (mh?.alcoholUse && /regular|heavy|daily|frequent/i.test(mh.alcoholUse)) {
    foodsToLimit.push('Alcohol — limits blood sugar and BP control');
    lifestyleTips.push('Limit alcohol; avoid on days you feel unwell or before driving');
  }

  for (const rx of prescriptions) {
    if (rx.diagnosis) {
      prescriptionNotes.push(`Prescription (${rx.date ? new Date(rx.date).toLocaleDateString('en-IN') : 'recent'}): ${rx.diagnosis}`);
    }
    if (rx.advice) prescriptionNotes.push(`Doctor advice: ${rx.advice}`);
    for (const med of rx.medications ?? []) {
      const timing = med.beforeAfterFood ? ` — ${med.beforeAfterFood}` : '';
      prescriptionNotes.push(`Medicine: ${med.medicineName}${timing}`);
      if (/before food|after food|empty stomach/i.test(med.beforeAfterFood ?? '')) {
        lifestyleTips.push(`Take ${med.medicineName} as directed (${med.beforeAfterFood})`);
      }
    }
  }

  if (mh?.pastSurgeries?.length) {
    const recent = mh.pastSurgeries[mh.pastSurgeries.length - 1];
    if (recent) {
      conditionNotes.push(
        `After surgery (${recent.surgery}): protein and soft cooked foods unless your surgeon gave other rules.`
      );
    }
  }

  for (const v of latestVitals) {
    const { label, value } = formatVital(v);
    let vitalEval: VitalEval = 'normal';
    let dietTip = 'Keep balanced plates: half vegetables, quarter protein, quarter whole grains.';

    if (v.type === 'blood_pressure' && v.systolic != null && v.diastolic != null) {
      vitalEval = evaluateBp(v.systolic, v.diastolic);
      if (vitalEval === 'concerning' || vitalEval === 'elevated') {
        dietTip =
          'DASH-style day: oats or upma with less salt, salad, dal, roti — avoid pickles and fried snacks.';
        foodsToLimit.push('Extra salt today — your BP reading is high');
      }
    } else if (v.type === 'blood_sugar' && v.glucose != null) {
      vitalEval = evaluateGlucose(v.glucose, v.glucoseMeal);
      if (vitalEval === 'concerning' || vitalEval === 'elevated') {
        dietTip =
          'Low-GI meals: vegetable dal, millets, curd; avoid sweets and white rice at dinner.';
        foodsToLimit.push('Sugary foods until sugar is back in range');
      }
    } else if (v.type === 'heart_rate' && v.value != null) {
      vitalEval = evaluateHr(v.value);
      dietTip =
        vitalEval !== 'normal'
          ? 'Light meals, hydrate, limit caffeine; rest if palpitations persist.'
          : dietTip;
    } else if (v.type === 'oxygen' && v.value != null) {
      vitalEval = evaluateO2(v.value);
      if (vitalEval !== 'normal') {
        dietTip = 'Easy-to-digest meals; sit upright after eating; seek care if breathless.';
        bump('consult_doctor');
      }
    }

    const status = toWellnessStatus(vitalEval);
    bump(status);
    vitalInsights.push({ type: v.type, label, value, status, dietTip });
  }

  for (const scan of scans) {
    if (!['ai_analyzed', 'doctor_reviewed', 'final'].includes(scan.status)) continue;
    const label = SCAN_LABELS[scan.scanType] ?? scan.scanType;
    let tip = 'Continue routine healthy eating; repeat scan or see doctor if symptoms persist.';

    if (scan.scanType === 'chest_xray') {
      const p = (scan.prediction ?? '').toLowerCase();
      if (/pneumonia|opacity|covid|infiltrat|urgent|positive/.test(p)) {
        tip =
          'Lung findings: light warm meals, plenty of fluids, avoid smoking; follow doctor treatment plan.';
        foodsToFavor.push('Soups, khichdi, steamed vegetables, protein for recovery');
        foodsToLimit.push('Cold drinks, fried food until doctor clears you');
        bump('consult_doctor');
      } else {
        tip = 'Chest scan: heart-lung friendly diet — fiber, lean protein, limit saturated fat.';
        foodsToFavor.push('Whole grains, nuts (if no allergy), fatty fish or flaxseed');
      }
    } else if (scan.scanType === 'skin_lesion') {
      const probs = scanProbabilities(scan);
      const skinAdvice =
        scan.skinCareAdvice ?? buildSkinCareAdvice(scan.prediction, scan.confidence, probs);
      if (skinAdvice) {
        if (!skinCareGuidance) {
          skinCareGuidance = skinAdvice;
          applySkinCareMetadata(skinAdvice, conditionNotes);
        }
        tip = `${skinAdvice.primaryConcern}: ${skinAdvice.summary}`;
        if (skinAdvice.suggestedMedicines.length) {
          tip += ` Topicals (not food): ${skinAdvice.suggestedMedicines.map((m) => m.name).join(', ')}.`;
        }
        if (skinAdvice.severity === 'urgent') bump('consult_doctor');
        else if (skinAdvice.severity === 'moderate') bump('needs_attention');
      }
    } else if (scan.scanType === 'retina') {
      if (/retinopathy|glaucoma|macular|diabet/.test((scan.prediction ?? '').toLowerCase())) {
        tip =
          'Eye scan: control blood sugar and BP; leafy greens, omega-3; yearly eye follow-up.';
        foodsToFavor.push('Spinach, carrots, citrus (unless sugar is high), walnuts');
        bump('needs_attention');
      }
    }

    scanInsights.push({
      scanType: scan.scanType,
      label,
      prediction: scan.prediction,
      tip,
    });
  }

  // Indian vegetarian-friendly daily template — tuned to latest vitals (not a fixed menu)
  const dailyDiet = buildDailyMealPlan(
    {
      diabetic,
      hypertensive: hypertensive || heart,
      highBp: vitalInsights.some((v) => v.type === 'blood_pressure' && v.status !== 'good'),
      highSugar: vitalInsights.some((v) => v.type === 'blood_sugar' && v.status !== 'good'),
      overweight: bmi?.category === 'Overweight' || bmi?.category === 'Obesity',
    },
    vitalInsights
  );

  if (foodsToFavor.length === 0) {
    foodsToFavor.push(
      'Seasonal vegetables, dal, roti or brown rice, curd, fruits (1–2 servings)',
      'Water, green tea, nuts in small portions',
      'Home-cooked meals over packaged food'
    );
  }

  lifestyleTips.push(
    'Eat at fixed times; do not skip breakfast if you have blood pressure or sugar concerns',
    'Walk 20–30 minutes daily if your doctor allows',
    'Sleep 7–8 hours — poor sleep raises sugar and BP'
  );

  weeklyGoals.push('Update vitals on LifeCare+ at least twice this week');

  const healthSummary = buildSummary(
    user,
    vitalInsights,
    scanInsights,
    bmi,
    worstStatus,
    skinCareGuidance,
    dataUsed
  );

  return {
    generatedAt: new Date().toISOString(),
    overallStatus: worstStatus,
    healthSummary,
    dataUsed: unique(dataUsed),
    bmi,
    dailyDiet,
    foodsToFavor: unique(foodsToFavor).slice(0, 12),
    foodsToLimit: unique(foodsToLimit).slice(0, 12),
    hydration:
      kidney
        ? 'Ask your doctor about fluid limits. Otherwise sip water through the day.'
        : diabetic
          ? '8–10 glasses water; avoid sugary drinks; herbal tea without sugar is fine.'
          : '8 glasses water daily; coconut water occasionally if BP is normal.',
    lifestyleTips: unique(lifestyleTips).slice(0, 10),
    vitalInsights,
    scanInsights,
    skinCareGuidance,
    prescriptionNotes: unique(prescriptionNotes).slice(0, 8),
    conditionNotes: unique(conditionNotes),
    medicationReminders: unique(medicationReminders).slice(0, 8),
    weeklyGoals: unique(weeklyGoals).slice(0, 6),
    disclaimers: [
      'This plan is general wellness guidance from your LifeCare+ data — not a prescription.',
      'Always follow your doctor’s advice for diabetes, BP, pregnancy, or kidney disease.',
      'If you feel chest pain, severe breathlessness, or very high sugar/BP, seek care immediately.',
    ],
  };
}

function buildDailyMealPlan(
  flags: {
    diabetic: boolean;
    hypertensive: boolean;
    highBp: boolean;
    highSugar: boolean;
    overweight: boolean;
  },
  vitalInsights: WellnessVitalInsight[] = []
): WellnessPlan['dailyDiet'] {
  const lowSalt = flags.hypertensive || flags.highBp;
  const lowGi = flags.diabetic || flags.highSugar;

  const bp = vitalInsights.find((v) => v.type === 'blood_pressure');
  const sugar = vitalInsights.find((v) => v.type === 'blood_sugar');
  const hr = vitalInsights.find((v) => v.type === 'heart_rate');

  const breakfast: string[] = lowGi
    ? [
        'Vegetable upma or oats with minimal sugar',
        'Boiled egg or paneer slice (if you eat dairy)',
        'Tea/coffee with little or no sugar',
      ]
    : [
        'Idli/dosa with sambar (less salt) or poha with peas',
        'Fruit: apple or papaya',
        'Protein: curd or sprouts',
      ];

  if (bp && bp.status !== 'good') {
    breakfast.unshift(`Your BP ${bp.value}: low-salt start — ${bp.dietTip}`);
  }
  if (sugar && sugar.status !== 'good') {
    breakfast.push(`Your sugar ${sugar.value}: ${sugar.dietTip}`);
  }
  if (hr && hr.status !== 'good') {
    breakfast.push(`Heart rate ${hr.value}: lighter breakfast, limit caffeine today.`);
  }

  const lunch: string[] = [
    lowSalt ? 'Salad first (cucumber, carrot, tomato)' : 'Fresh salad',
    lowGi ? '2 phulka or brown rice + dal + sabzi' : 'Roti + dal + seasonal vegetable',
    'Curd or buttermilk (low salt)',
  ];
  if (flags.highBp) {
    lunch.push('No pickle/papad — your latest BP needs less sodium at lunch.');
  }
  if (flags.highSugar) {
    lunch.push('Skip white rice seconds; walk 10 min after lunch if you can.');
  }

  const dinner: string[] = [
    lowGi ? 'Light dinner before 8:30 pm: soup + dal + vegetables' : 'Khichdi or roti with vegetables',
    'Avoid heavy fried food at night',
    flags.overweight ? 'Smaller portion than lunch' : 'Moderate portion',
  ];
  if (lowGi && sugar && sugar.status !== 'good') {
    dinner.unshift(`Evening rule (sugar ${sugar.value}): no sweets or fruit juice after dinner.`);
  }

  const snacks: string[] = [
    flags.diabetic ? 'Handful roasted chana or peanuts (if no allergy)' : 'Fruit or roasted makhana',
    'Green tea or buttermilk',
    'Avoid biscuits, soda, and sweets between meals',
  ];

  return { breakfast: breakfast.slice(0, 6), lunch: lunch.slice(0, 6), dinner: dinner.slice(0, 6), snacks };
}

function buildSummary(
  user: IUser,
  vitals: WellnessVitalInsight[],
  scans: WellnessScanInsight[],
  bmi: { value: number; category: string } | undefined,
  status: WellnessStatus,
  skin: SkinCareAdvice | null,
  dataUsed: string[]
): string {
  const name = user.profile?.firstName ?? 'there';
  const parts: string[] = [
    `Hi ${name}, this plan combines your vitals, medical profile, MediScan (chest & eye), and prescriptions into one daily diet guide for BP, sugar, and weight.`,
  ];

  if (dataUsed.length) {
    parts.push(`Based on: ${dataUsed.join('; ')}.`);
  }

  if (bmi) parts.push(`Your BMI is ${bmi.value} (${bmi.category}).`);

  const concerningVitals = vitals.filter((v) => v.status !== 'good');
  if (concerningVitals.length) {
    parts.push(
      `Meals are adjusted for your ${concerningVitals.map((v) => v.label.toLowerCase()).join(', ')} readings.`
    );
  }

  if (skin) {
    parts.push(
      `Your skin scan (${skin.primaryConcern}) has its own face wash routine and self-care food tips on MediScan — those are separate from this meal plan.`
    );
  }

  if (scans.length) {
    parts.push(`MediScan: ${scans.map((s) => s.label).join(', ')}.`);
  }

  if (status === 'consult_doctor') {
    parts.push('Some readings need a doctor’s review — use this diet as support, not a replacement for medical care.');
  } else if (status === 'needs_attention') {
    parts.push('Small daily food choices can help keep sugar, BP, and weight steadier.');
  } else {
    parts.push('Keep logging vitals weekly so we can keep refining your plan.');
  }

  return parts.join(' ');
}
