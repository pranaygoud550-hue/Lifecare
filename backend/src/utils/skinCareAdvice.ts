/** User-facing skin care guidance derived from MediScan AI output (educational only). */

export type SkinConcernKey =
  | 'acne'
  | 'pigmentation'
  | 'dryness'
  | 'eczema'
  | 'inflammation'
  | 'sun_damage'
  | 'suspicious_lesion'
  | 'healthy';

export interface SkinCareMedicineSuggestion {
  name: string;
  form: string;
  purpose: string;
  howToUse: string;
  whenToUse: string;
  caution: string;
}

export interface SkinCareRoutineBlock {
  period: 'morning' | 'evening';
  steps: string[];
}

export interface SkinCareAdvice {
  primaryConcern: string;
  concernKey: SkinConcernKey;
  summary: string;
  /** Minute details parsed from the scan */
  scanFindings: string[];
  whatYourSkinNeeds: string[];
  dailyRoutine: SkinCareRoutineBlock[];
  suggestedMedicines: SkinCareMedicineSuggestion[];
  foodsToEat: string[];
  foodsToAvoid: string[];
  lifestyleTips: string[];
  severity: 'mild' | 'moderate' | 'urgent';
  /** Shown on skin report only — not merged into BP/sugar diet plan */
  skinFoodDisclaimer: string;
}

const ACNE_PATTERNS = /\b(acne|pimple|pimples|comedone|blackhead|whitehead|papule|pustule|cystic|oily|sebum|rosacea|folliculitis)\b/i;
const PIGMENT_PATTERNS =
  /\b(pigment|pigmentation|melasma|hyperpigment|dark spot|blemish|uneven tone|freckle|lentigo|post.?inflammatory)\b/i;
const DRY_PATTERNS = /\b(dry|xerosis|dehydrat|flaky|rough|scaly)\b/i;
const ECZEMA_PATTERNS = /\b(eczema|atopic|dermatitis|itch|rash|contact)\b/i;
const URGENT_PATTERNS =
  /\b(melanoma|malignant|carcinoma|basal cell|bcc|scc|suspicious|biopsy|critical|urgent|melanocytic)\b/i;
const HEALTHY_PATTERNS = /\b(normal|healthy|benign|clear|negative|no finding|nevus benign)\b/i;

function normalizePct(value: number): number {
  return value <= 1 ? value * 100 : value;
}

function collectText(prediction?: string, probabilities?: Record<string, number>): string {
  const parts = [prediction ?? ''];
  if (probabilities) {
    const sorted = Object.entries(probabilities).sort(
      (a, b) => normalizePct(b[1]) - normalizePct(a[1])
    );
    parts.push(...sorted.slice(0, 6).map(([k]) => k));
  }
  return parts.join(' ').toLowerCase();
}

function topProbabilityEntries(
  probabilities?: Record<string, number>,
  limit = 5
): Array<{ label: string; pct: number }> {
  if (!probabilities) return [];
  return Object.entries(probabilities)
    .sort((a, b) => normalizePct(b[1]) - normalizePct(a[1]))
    .slice(0, limit)
    .map(([label, val]) => ({ label, pct: Math.round(normalizePct(val)) }));
}

function detectConcern(text: string): SkinConcernKey {
  if (URGENT_PATTERNS.test(text)) return 'suspicious_lesion';
  if (ACNE_PATTERNS.test(text)) return 'acne';
  if (PIGMENT_PATTERNS.test(text)) return 'pigmentation';
  if (ECZEMA_PATTERNS.test(text)) return 'eczema';
  if (DRY_PATTERNS.test(text)) return 'dryness';
  if (/\b(inflam|redness|irritat|erythema)\b/i.test(text)) return 'inflammation';
  if (/\b(sun|uv|photo|actinic|solar)\b/i.test(text)) return 'sun_damage';
  if (HEALTHY_PATTERNS.test(text)) return 'healthy';
  return 'inflammation';
}

function humanizeLabel(label: string): string {
  return label
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const SKIN_FOOD_DISCLAIMER =
  'These eat/avoid tips are for your skin only (self-care). They are NOT added to your BP, sugar, or wellness diet plan — follow those separately on the Vitals tab.';

function confidenceInterpretation(conf: number | null): string {
  if (conf == null) return 'Scan quality: re-scan in bright, even light for clearer detail.';
  if (conf >= 85) return `Scan quality: strong (${conf}%) — findings below are reliable for routine care guidance.`;
  if (conf >= 65) return `Scan quality: good (${conf}%) — follow the routine; re-scan if lighting was poor or face was blurry.`;
  if (conf >= 45) return `Scan quality: moderate (${conf}%) — use guidance cautiously; re-scan closer to a window with face centered in the oval.`;
  return `Scan quality: low (${conf}%) — please re-scan: remove glasses, face the light, hold still, fill the oval.`;
}

function buildScanFindings(
  concernKey: SkinConcernKey,
  prediction?: string,
  confidence?: number,
  probabilities?: Record<string, number>
): string[] {
  const findings: string[] = [];
  const conf = confidence != null ? Math.round(confidence) : null;
  const top = topProbabilityEntries(probabilities, 6);

  findings.push(confidenceInterpretation(conf));

  if (prediction) {
    findings.push(
      `Primary AI reading: ${humanizeLabel(prediction)}${conf != null ? ` (${conf}% match)` : ''}.`
    );
  }

  const secondary = top.filter((t) => {
    const main = prediction?.toLowerCase().replace(/\s+/g, '_');
    return t.pct >= 10 && !main?.includes(t.label.toLowerCase().replace(/\s+/g, '_'));
  });
  for (const { label, pct } of secondary.slice(0, 4)) {
    findings.push(`Secondary signal: ${humanizeLabel(label)} (~${pct}% — may affect cheeks, forehead, or T-zone).`);
  }

  findings.push(
    'Zones checked in your photo: forehead (oil & lines), cheeks (pigment & redness), nose/chin (pores & acne), under-eye (dryness).'
  );

  const detailByConcern: Record<SkinConcernKey, string[]> = {
    acne: [
      'Check T-zone (forehead, nose, chin) — common for clogged pores and oil buildup.',
      'Red raised bumps suggest active inflammation; black/white dots suggest clogged pores.',
      'Post-acne brown marks are different from active pimples — both need sun protection.',
    ],
    pigmentation: [
      'Dark patches on cheeks, forehead, or upper lip often worsen with sun exposure.',
      'Uneven tone can follow healed pimples, eczema, or hormonal changes.',
      'Compare both sides of face — symmetrical patches may suggest melasma pattern.',
    ],
    dryness: [
      'Tight feeling after washing, fine lines, or flaking suggest a weakened moisture barrier.',
      'Dry patches often appear around nose, mouth, and under eyes first.',
      'Dehydrated skin can still feel oily on the surface — you may need hydration, not more oil stripping.',
    ],
    eczema: [
      'Pink-red patches with itch suggest barrier inflammation, not just dryness.',
      'Look for triggers: sweat, dust, harsh soap, or fragrance in products.',
      'Broken skin from scratching increases infection risk — keep nails short.',
    ],
    inflammation: [
      'General redness or stinging may mean your routine is too harsh or skin is sensitized.',
      'Pause strong acids and retinol until calm for 5–7 days.',
      'Patch test any new product on jawline for 48 hours before full-face use.',
    ],
    sun_damage: [
      'Freckles, uneven tan lines, or rough texture can reflect cumulative UV exposure.',
      'Prevention stops new spots; brightening actives fade existing marks slowly (8–12 weeks).',
      'Daily SPF is non-negotiable — even indoors near windows.',
    ],
    suspicious_lesion: [
      'Changing mole signs: asymmetry, irregular border, multiple colors, size >6mm, evolving shape.',
      'Do not treat with face acids, home remedies, or OTC bleaching on a suspicious spot.',
      'Photograph the area weekly in the same lighting to track changes for your doctor.',
    ],
    healthy: [
      'No major inflammatory or suspicious patterns detected in the scanned region.',
      'Maintain prevention: cleanser, moisturizer, SPF — consistency prevents future issues.',
      'Re-scan monthly or if you notice new spots, persistent pimples, or color changes.',
    ],
  };

  findings.push(...detailByConcern[concernKey]);

  if (conf != null && conf < 55) {
    findings.push(
      'Tip for a clearer re-scan: wash face (no heavy cream), stand 30–40 cm from camera, use daylight, keep hair off cheeks, capture once face is sharp.'
    );
  }

  return findings.slice(0, 12);
}

type AdviceTemplate = Omit<
  SkinCareAdvice,
  'concernKey' | 'scanFindings' | 'severity' | 'skinFoodDisclaimer'
> & { defaultSeverity: SkinCareAdvice['severity'] };

const ADVICE_BY_CONCERN: Record<SkinConcernKey, AdviceTemplate> = {
  acne: {
    primaryConcern: 'Acne & breakouts',
    summary:
      'Your scan shows signs of active acne, clogged pores, or oily T-zone inflammation. Follow the exact face wash routine below and avoid trigger foods.',
    whatYourSkinNeeds: [
      'Gentle oil-control face wash — morning and night (never skip night wash)',
      'Non-comedogenic gel moisturizer — oily skin still needs hydration',
      'Broad-spectrum SPF 30+ every morning — prevents dark marks after pimples heal',
      'Do not squeeze or pick — it causes scars and post-acne pigmentation',
      'Change pillowcase 2× per week; clean phone screen daily',
      'Patch test new products on jawline for 48 hours before full face',
    ],
    dailyRoutine: [
      {
        period: 'morning',
        steps: [
          '1. Wet face with lukewarm water (not hot).',
          '2. Face wash: Salicylic acid 2% or gentle gel cleanser — massage 30–60 sec on T-zone, rinse fully.',
          '3. Pat dry with clean towel — do not rub.',
          '4. Niacinamide 10% serum — 3–4 drops on forehead, cheeks, chin.',
          '5. Oil-free gel moisturizer — pea-sized amount.',
          '6. SPF 30+ non-comedogenic sunscreen — 2 finger-lengths for face + neck.',
        ],
      },
      {
        period: 'evening',
        steps: [
          '1. Remove makeup/sunscreen with micellar water or cleansing balm first.',
          '2. Face wash: same salicylic or benzoyl peroxide wash (alternate nights if skin is dry).',
          '3. Pat dry — wait 5 min if using active treatment.',
          '4. Benzoyl peroxide 2.5% gel — thin layer on active pimples only (not whole face at start).',
          '5. Lightweight moisturizer on entire face to prevent peeling.',
          '6. No heavy night cream or coconut oil on acne areas.',
        ],
      },
    ],
    suggestedMedicines: [
      {
        name: 'Salicylic acid 2% face wash',
        form: 'Cleanser (prescribed routine step 1)',
        purpose: 'Unclogs pores, reduces blackheads/whiteheads on nose and chin',
        howToUse: 'Apply to wet face, massage 30–60 seconds on oily zones, rinse with lukewarm water. Use AM + PM.',
        whenToUse: 'Morning and night — primary face wash for acne-prone skin',
        caution: 'If skin peels, use once daily and add moisturizer. Avoid eye area.',
      },
      {
        name: 'Benzoyl peroxide 2.5% gel',
        form: 'Spot treatment gel',
        purpose: 'Kills acne bacteria on active red pimples',
        howToUse: 'Pea-sized amount on each pimple after cleansing. Start every other night for 1 week.',
        whenToUse: 'Evening only — after face wash and before moisturizer',
        caution: 'Bleaches towels/pillowcases. Not for whole face initially. Stop if severe burning.',
      },
      {
        name: 'Niacinamide 10% serum',
        form: 'Serum',
        purpose: 'Reduces oil, redness, and post-acne marks over time',
        howToUse: '3–4 drops on clean dry skin, pat gently. Follow with moisturizer.',
        whenToUse: 'Morning (before SPF) or evening (before moisturizer)',
        caution: 'OTC. See dermatologist for painful cystic or nodular acne.',
      },
      {
        name: 'Oil-free SPF 30+ gel sunscreen',
        form: 'Sunscreen',
        purpose: 'Prevents dark spots and protects healing pimples from UV',
        howToUse: 'Two finger-lengths for face + neck. Reapply every 2–3 hours if outdoors.',
        whenToUse: 'Every morning — last step of AM routine',
        caution: 'Choose “non-comedogenic” label. Required even on cloudy days.',
      },
    ],
    foodsToEat: [
      'Low-GI foods: millets, brown rice, whole wheat roti, vegetables, dal',
      'Zinc-rich: roasted chana, pumpkin seeds, legumes (if no allergy)',
      'Water-rich: cucumber, watermelon, bottle gourd — 2–3 L water daily',
      'Omega-3: flaxseed, walnuts (small handful)',
      'Probiotic: fresh curd (if dairy tolerated)',
      'Green tea — anti-inflammatory, limit to 1–2 cups',
    ],
    foodsToAvoid: [
      'Full-fat milk, cheese, whey shakes — linked to breakouts in many people',
      'Sugary drinks, sodas, packaged juices, mithai, pastries',
      'Greasy fast food: fries, pizza, samosa, pakora, biryani with heavy oil',
      'Excess white bread, maida snacks, chips',
      'Alcohol and heavy late-night meals — worsen inflammation',
      'Do not eliminate all fats — healthy fats in moderation are OK',
    ],
    lifestyleTips: [
      'Wash face after sweating (gym, heat) — do not let sweat sit on skin',
      'Use fragrance-free detergent for pillowcases',
      'Keep hair off forehead if you use oily hair products',
      'Stress and poor sleep can flare acne — aim for 7–8 hours sleep',
    ],
    defaultSeverity: 'moderate',
  },
  pigmentation: {
    primaryConcern: 'Pigmentation & dark spots',
    summary:
      'Your scan indicates uneven skin tone, dark spots, or post-acne marks. Strict sunscreen plus the brightening routine below is essential.',
    whatYourSkinNeeds: [
      'Gentle creamy or gel cleanser — no harsh scrubs on pigmented areas',
      'Vitamin C serum every morning — fades dullness and supports even tone',
      'SPF 50 PA++++ daily — reapply outdoors; skipping SPF undoes all treatment',
      'Azelaic or kojic acid at night — gradual fading over 8–12 weeks',
      'Never pick at spots — trauma creates more pigment',
      'Patience: pigment fades slowly; take weekly photos in same lighting',
    ],
    dailyRoutine: [
      {
        period: 'morning',
        steps: [
          '1. Gentle face wash — lukewarm water, no scrubbing pigmented patches.',
          '2. Pat dry, wait 2 min.',
          '3. Vitamin C 15% serum — 4 drops on cheeks, forehead, chin (avoid if stinging — patch test).',
          '4. Lightweight moisturizer.',
          '5. SPF 50 PA++++ — generous layer; cover spots fully. Reapply every 2–3 hours outdoors.',
        ],
      },
      {
        period: 'evening',
        steps: [
          '1. Double cleanse if wearing sunscreen/makeup.',
          '2. Gentle face wash — rinse thoroughly.',
          '3. Azelaic acid 10% cream — thin layer on dark patches and full face if tolerated.',
          '4. OR Kojic acid brightening cream on spots only (alternate nights with azelaic).',
          '5. Fragrance-free moisturizer to lock in treatment.',
          '6. No lemon juice or harsh DIY bleaching on face.',
        ],
      },
    ],
    suggestedMedicines: [
      {
        name: 'Vitamin C 15% face serum',
        form: 'Serum',
        purpose: 'Brightens dull tone, evens post-acne marks, antioxidant protection',
        howToUse: '4 drops on clean dry skin, pat gently. Wait 1 min before moisturizer.',
        whenToUse: 'Morning only — always followed by SPF',
        caution: 'Store away from direct sun if product requires. Tingling first week is common.',
      },
      {
        name: 'Azelaic acid 10% cream',
        form: 'Treatment cream',
        purpose: 'Fades melasma, post-inflammatory hyperpigmentation, and redness',
        howToUse: 'Thin even layer on affected areas after cleansing. Start 3 nights/week, build to nightly.',
        whenToUse: 'Evening — before moisturizer',
        caution: 'Safe for many skin types. Avoid if pregnant unless doctor approves.',
      },
      {
        name: 'Kojic acid + arbutin night cream',
        form: 'Night cream',
        purpose: 'Gradually lightens dark patches on cheeks and forehead',
        howToUse: 'Apply on dark spots only, not whole face initially. Pea-sized per area.',
        whenToUse: 'Night — alternate with azelaic acid if both used',
        caution: 'Hydroquinone requires dermatologist prescription — do not use strong bleach OTC.',
      },
      {
        name: 'SPF 50 PA++++ sunscreen',
        form: 'Sunscreen',
        purpose: 'Stops existing spots from darkening — most important step',
        howToUse: 'Two finger-lengths face + neck. Reapply after sweating or every 2–3 hours outdoors.',
        whenToUse: 'Every morning without exception',
        caution: 'Indoor window UV also affects pigment. No skipping on cloudy days.',
      },
    ],
    foodsToEat: [
      'Vitamin C: amla, guava, bell pepper, tomato (cooked releases lycopene)',
      'Beta-carotene: carrots, papaya, sweet potato, spinach, methi',
      'Antioxidants: berries (if available), pomegranate, green tea',
      'Turmeric in cooked dal/vegetables — anti-inflammatory',
      'Adequate protein: dal, sprouts, paneer in moderation',
      'Water 2–3 L daily — hydrated skin heals better',
    ],
    foodsToAvoid: [
      'Excess sugar, mithai, ice cream — glycation can worsen dullness',
      'Fried snacks, chips, namkeen — inflammatory',
      'Skipping sunscreen or midday sun without hat — undoes treatment',
      'Very hot spicy food if skin is actively red or irritated',
      'Alcohol — dehydrates skin and worsens uneven tone',
      'Do not rely on “skin whitening” pills without doctor advice',
    ],
    lifestyleTips: [
      'Wear wide-brim hat and UV sunglasses outdoors',
      'Treat active acne first — new pimples leave fresh marks',
      'Avoid physical scrubs on pigmented skin — use gentle chemical exfoliation only if tolerated',
    ],
    defaultSeverity: 'moderate',
  },
  dryness: {
    primaryConcern: 'Dry or dehydrated skin',
    summary:
      'Your scan suggests dryness, flaking, or a weakened skin barrier. Use creamy cleansers and layer hydration — never skip moisturizer.',
    whatYourSkinNeeds: [
      'Fragrance-free creamy or milk cleanser — not foaming soap',
      'Hyaluronic acid on damp skin — then seal with cream immediately',
      'Ceramide-rich moisturizer morning and night',
      'Lukewarm water only — hot water strips natural oils',
      'SPF in a moisturizing base — dry skin still needs sun protection',
      'Humidifier in AC rooms; drink 2–3 L water daily',
    ],
    dailyRoutine: [
      {
        period: 'morning',
        steps: [
          '1. Rinse with lukewarm water OR use creamy cleanser if oily overnight.',
          '2. Leave skin slightly damp.',
          '3. Hyaluronic acid serum — 3–4 drops on damp skin.',
          '4. Ceramide moisturizer — while skin is still damp.',
          '5. SPF 30 moisturizing sunscreen — do not use alcohol-based sunscreens.',
        ],
      },
      {
        period: 'evening',
        steps: [
          '1. Creamy gentle face wash — massage softly, rinse with lukewarm water.',
          '2. Pat dry — leave slightly damp.',
          '3. Hyaluronic acid serum on damp skin.',
          '4. Rich ceramide night cream — generous pea-to-marble size.',
          '5. Optional: thin petrolatum layer on very dry cheeks/nose crease only.',
        ],
      },
    ],
    suggestedMedicines: [
      {
        name: 'Ceramide repair face moisturizer',
        form: 'Cream',
        purpose: 'Rebuilds skin barrier, stops flaking and tight feeling',
        howToUse: 'Apply on slightly damp skin after serum. Use AM and PM generously.',
        whenToUse: 'After every wash — never skip',
        caution: 'Choose fragrance-free. Thick layer on dry patches is OK.',
      },
      {
        name: 'Hyaluronic acid 2% serum',
        form: 'Serum',
        purpose: 'Pulls water into skin — must be sealed with cream',
        howToUse: 'On damp skin, 3–4 drops, pat in. Apply moisturizer within 60 seconds.',
        whenToUse: 'Morning and evening before moisturizer',
        caution: 'Without moisturizer on top, skin can feel tighter in dry air.',
      },
      {
        name: 'Gentle creamy face wash',
        form: 'Cleanser',
        purpose: 'Cleans without stripping natural oils',
        howToUse: 'Massage gently 20–30 sec, rinse with lukewarm water. No scrubbing.',
        whenToUse: 'Evening daily; morning only if needed',
        caution: 'Avoid soap bars and alcohol toners.',
      },
    ],
    foodsToEat: [
      'Healthy fats: ghee in moderation, nuts, seeds, avocado if available',
      'Omega-3: flaxseed powder, walnuts, fish (if non-veg)',
      'Water-rich vegetables: cucumber, bottle gourd, spinach soup',
      'Protein for repair: dal, sprouts, eggs (if eaten)',
      'Warm water and herbal tea — avoid excess caffeine',
    ],
    foodsToAvoid: [
      'Excess caffeine without water — dehydrates skin',
      'Very spicy food if skin is cracked or stinging',
      'Alcohol — worsens dehydration',
      'Crash diets or very low fat intake — skin needs healthy fats',
      'Salty packaged snacks — increase water retention, not skin hydration',
    ],
    lifestyleTips: [
      'Use humidifier in bedroom during AC season',
      'Avoid over-washing face (max 2× daily)',
      'Wear soft cotton scarf in cold dry wind',
    ],
    defaultSeverity: 'mild',
  },
  eczema: {
    primaryConcern: 'Eczema / irritated skin',
    summary:
      'Your scan suggests dermatitis or eczema-type inflammation. Simplify products, soothe the barrier, and identify triggers.',
    whatYourSkinNeeds: [
      'Soap-free, fragrance-free cleanser or cleansing oil',
      'Thick moisturizer within 3 minutes of every wash',
      'Identify triggers: dust, sweat, wool, harsh detergent, fragrance',
      'Short lukewarm baths — pat dry, never rub inflamed areas',
      'Keep nails short — scratching worsens eczema and causes infection',
      'See doctor if oozing, crusting, fever, or spreading rash',
    ],
    dailyRoutine: [
      {
        period: 'morning',
        steps: [
          '1. Splash lukewarm water OR soap-free wash on affected areas only.',
          '2. Pat dry — leave slightly damp.',
          '3. Colloidal oatmeal or ceramide cream on all affected patches.',
          '4. Mineral SPF 30 on face if going outdoors (fragrance-free).',
        ],
      },
      {
        period: 'evening',
        steps: [
          '1. Soap-free cleanser — 20 sec gentle wash, rinse well.',
          '2. Pat dry within 3 min apply thick moisturizer (colloidal oatmeal or ceramide).',
          '3. If doctor advised: hydrocortisone 1% thin layer on small flare only — max 7 days on face.',
          '4. Cotton pajamas; avoid wool directly on skin.',
        ],
      },
    ],
    suggestedMedicines: [
      {
        name: 'Colloidal oatmeal moisturizer',
        form: 'Cream',
        purpose: 'Calms itch, redness, and eczema flares',
        howToUse: 'Generous layer on affected areas within 3 min of washing. Reapply when itchy.',
        whenToUse: 'After every wash — AM and PM',
        caution: 'If oozing, yellow crust, or fever — see doctor (may need prescription).',
      },
      {
        name: 'Soap-free gentle face wash',
        form: 'Cleanser',
        purpose: 'Cleans without stripping eczema barrier',
        howToUse: 'Apply to wet skin, rinse with lukewarm water. No scrubbing.',
        whenToUse: 'Once daily evening, or twice if very mild formula',
        caution: 'No fragrance, no SLS if possible.',
      },
      {
        name: 'Hydrocortisone 1% cream',
        form: 'Short-course topical',
        purpose: 'Mild flare control on small itchy patches',
        howToUse: 'Thin layer on flare only, once or twice daily.',
        whenToUse: 'During flare — max 7 days on face without doctor advice',
        caution: 'Not for long-term daily use. Not on broken infected skin.',
      },
    ],
    foodsToEat: [
      'Probiotic curd (if dairy tolerated) — supports gut-skin axis',
      'Anti-inflammatory: turmeric in cooked food, ginger tea',
      'Vegetables, dal, khichdi during flares — easy to digest',
      'Adequate water — dehydration worsens itch',
    ],
    foodsToAvoid: [
      'Known personal triggers — citrus, nuts, eggs only if you react (not universal)',
      'Very spicy food during active flare',
      'Alcohol — worsens inflammation and itch',
      'Processed food with artificial colors if you notice flares after eating',
    ],
    lifestyleTips: [
      'Soft cotton clothing; avoid wool on direct skin',
      'Fragrance-free laundry detergent for towels and pillowcases',
      'Keep room cool — sweat triggers itch',
    ],
    defaultSeverity: 'moderate',
  },
  inflammation: {
    primaryConcern: 'Irritation & inflammation',
    summary:
      'Your scan shows red, irritated, or sensitized skin. Pause strong actives and use a minimal soothing routine.',
    whatYourSkinNeeds: [
      'Stop retinol, AHA/BHA, and benzoyl peroxide until calm (5–7 days minimum)',
      'Minimal routine: gentle wash + soothing gel + moisturizer + mineral SPF',
      'Cool compress 5 min for hot, stinging areas',
      'Patch test every new product on jawline 48 hours',
      'Fragrance-free everything — including detergent and hair products near face',
    ],
    dailyRoutine: [
      {
        period: 'morning',
        steps: [
          '1. Lukewarm water rinse OR ultra-gentle cleanser if oily.',
          '2. Pat dry.',
          '3. Panthenol or aloe soothing gel on red areas.',
          '4. Fragrance-free moisturizer.',
          '5. Zinc oxide mineral SPF 30 — no chemical filters if stinging.',
        ],
      },
      {
        period: 'evening',
        steps: [
          '1. Gentle fragrance-free face wash — 20 sec max.',
          '2. Pat dry.',
          '3. Soothing gel (panthenol/aloe) on irritated zones.',
          '4. Barrier repair moisturizer — ceramide if available.',
          '5. No actives until redness subsides.',
        ],
      },
    ],
    suggestedMedicines: [
      {
        name: 'Panthenol (B5) soothing gel',
        form: 'Gel',
        purpose: 'Calms redness, stinging, and post-product irritation',
        howToUse: 'Thin layer on red areas after cleansing. Can reapply mid-day.',
        whenToUse: 'AM and PM after wash',
        caution: 'Choose alcohol-free, fragrance-free formula.',
      },
      {
        name: 'Gentle fragrance-free face wash',
        form: 'Cleanser',
        purpose: 'Cleans without worsening sensitivity',
        howToUse: 'Lukewarm water, gentle massage, full rinse.',
        whenToUse: 'Evening; morning water rinse may be enough',
        caution: 'No scrubs, no mint/menthol products.',
      },
      {
        name: 'Zinc oxide mineral sunscreen SPF 30',
        form: 'Sunscreen',
        purpose: 'Protects healing inflamed skin',
        howToUse: 'Generous layer; reapply outdoors every 2–3 hours.',
        whenToUse: 'Morning — every day',
        caution: 'Physical/mineral filters gentler than chemical for sensitive skin.',
      },
    ],
    foodsToEat: [
      'Cooling foods: cucumber, coconut water, curd (if tolerated)',
      'Anti-inflammatory: turmeric, green leafy vegetables',
      'Omega-3: flaxseed, walnuts',
      'Plenty of water — 2–3 L',
    ],
    foodsToAvoid: [
      'Very spicy food during active redness',
      'Alcohol — dilates blood vessels, worsens redness',
      'Excess hot tea/coffee on empty stomach if skin is reactive',
      'New supplements or herbal mixes without doctor advice during flare',
    ],
    lifestyleTips: [
      'Sleep 7–8 hours — stress triggers skin flares',
      'Change pillowcase every 2–3 days',
      'Avoid saunas and very hot showers on face',
    ],
    defaultSeverity: 'moderate',
  },
  sun_damage: {
    primaryConcern: 'Sun damage',
    summary:
      'Your scan may reflect UV-related spots, rough texture, or photo-aging. Daily high-SPF protection is the foundation.',
    whatYourSkinNeeds: [
      'SPF 50 broad-spectrum — every day, reapply outdoors',
      'Antioxidant serum (vitamin C or niacinamide) in morning',
      'Wide-brim hat and sunglasses for outdoor time',
      'Retinol at night only if not pregnant and skin is not inflamed',
      'Annual dermatologist skin check if many moles or family history',
    ],
    dailyRoutine: [
      {
        period: 'morning',
        steps: [
          '1. Gentle face wash.',
          '2. Vitamin C or niacinamide antioxidant serum.',
          '3. Moisturizer.',
          '4. SPF 50 — two finger-lengths; do not forget ears and neck.',
        ],
      },
      {
        period: 'evening',
        steps: [
          '1. Cleanse sunscreen fully.',
          '2. Retinol 0.25% serum — 2× weekly to start, build slowly.',
          '3. Moisturizer to reduce retinol dryness.',
          '4. No retinol on nights after sunburn.',
        ],
      },
    ],
    suggestedMedicines: [
      {
        name: 'SPF 50 PA++++ broad-spectrum sunscreen',
        form: 'Sunscreen',
        purpose: 'Prevents new spots and worsening of sun damage',
        howToUse: 'Two finger-lengths for face. Reapply every 2–3 hours outdoors.',
        whenToUse: 'Every morning — 365 days a year',
        caution: 'Most important anti-aging product. Apply even indoors near windows.',
      },
      {
        name: 'Retinol 0.25% night serum',
        form: 'Serum',
        purpose: 'Improves texture, fine lines, and sun spots over months',
        howToUse: 'Pea-sized amount after cleansing. Start 2 nights/week for 2 weeks.',
        whenToUse: 'Evening only — never with strong sun exposure next day without SPF',
        caution: 'Not if pregnant/breastfeeding. Stop during active irritation.',
      },
    ],
    foodsToEat: [
      'Antioxidants: berries, pomegranate, green tea, colorful vegetables',
      'Lycopene: cooked tomatoes',
      'Beta-carotene: carrots, papaya, spinach',
      'Water 2–3 L — sun-exposed skin needs hydration',
    ],
    foodsToAvoid: [
      'Midday sun 10am–4pm without hat and SPF',
      'Tanning beds or deliberate sun exposure',
      'Excess alcohol — increases photosensitivity',
      'Thinking clouds block UV — they do not',
    ],
    lifestyleTips: [
      'Seek shade during peak sun hours',
      'UV-blocking sunglasses protect eye area skin too',
    ],
    defaultSeverity: 'moderate',
  },
  suspicious_lesion: {
    primaryConcern: 'Needs dermatologist review',
    summary:
      'Your scan flagged features that require an in-person skin exam. Do not self-treat with face wash acids or home remedies on the spot.',
    whatYourSkinNeeds: [
      'Book dermatologist appointment within 1–2 weeks (sooner if changing rapidly)',
      'Photograph the area weekly — same angle and lighting',
      'Note size (compare to eraser), color, border, bleeding, itch',
      'Gentle cleanser on rest of face only — avoid harsh products on the lesion',
      'Full-body monthly self-check for new or changing moles',
      'Strict sun protection on the area until seen by specialist',
    ],
    dailyRoutine: [
      {
        period: 'morning',
        steps: [
          '1. Gentle face wash — avoid scrubbing the flagged area.',
          '2. Pat dry.',
          '3. Mineral SPF 50 on entire face including the spot.',
          '4. Do not apply acids, retinol, or “whitening” creams on the lesion.',
        ],
      },
      {
        period: 'evening',
        steps: [
          '1. Gentle cleanse — soft pat dry on concerned area.',
          '2. Plain fragrance-free moisturizer away from lesion if doctor allows.',
          '3. Monitor for changes — photograph weekly.',
        ],
      },
    ],
    suggestedMedicines: [],
    foodsToEat: [
      'Balanced diet with vegetables and adequate protein for general health',
      'Antioxidant-rich foods: berries, green tea, colorful vegetables',
      'Water 2–3 L daily',
    ],
    foodsToAvoid: [
      'Do not treat changing moles with diet or OTC creams alone',
      'Avoid applying lemon, garlic, or unknown “natural bleaches” on the spot',
      'Limit alcohol until dermatologist review',
    ],
    lifestyleTips: [
      'Sun protection on the area until specialist review',
      'Bring scan photos and weekly progress photos to dermatologist visit',
    ],
    defaultSeverity: 'urgent',
  },
  healthy: {
    primaryConcern: 'Skin looks balanced',
    summary:
      'No major concerns detected in the scanned area. Maintain this simple preventive routine to keep skin clear.',
    whatYourSkinNeeds: [
      'Gentle face wash morning and night',
      'Light moisturizer suited to your skin type',
      'Daily SPF 30+ — prevention is easier than treating spots later',
      'Stay hydrated and sleep 7–8 hours',
      'Re-scan if you notice new persistent pimples, spots, or texture changes',
    ],
    dailyRoutine: [
      {
        period: 'morning',
        steps: [
          '1. Gentle gel or cream face wash — 30 sec massage, rinse.',
          '2. Light moisturizer.',
          '3. SPF 30 non-comedogenic sunscreen.',
        ],
      },
      {
        period: 'evening',
        steps: [
          '1. Remove makeup/sunscreen if worn.',
          '2. Same gentle face wash.',
          '3. Moisturizer before sleep.',
        ],
      },
    ],
    suggestedMedicines: [
      {
        name: 'Gentle daily face wash',
        form: 'Cleanser',
        purpose: 'Maintains clean skin without over-drying',
        howToUse: 'AM and PM — 30 sec massage, lukewarm rinse.',
        whenToUse: 'Twice daily',
        caution: 'Choose pH-balanced, non-stripping formula.',
      },
      {
        name: 'SPF 30 moisturizer (day cream)',
        form: 'Day cream with SPF',
        purpose: 'Prevents future acne marks, pigmentation, and aging',
        howToUse: 'Apply every morning as last step.',
        whenToUse: 'Daily — even when staying indoors',
        caution: 'Non-comedogenic if you have oily skin.',
      },
    ],
    foodsToEat: [
      'Balanced meals: vegetables, dal, whole grains, curd, seasonal fruits',
      'Water 2–3 L daily',
      'Nuts and seeds in small portions for vitamin E',
      'Limit processed food — home cooking supports skin health',
    ],
    foodsToAvoid: [
      'Excess sugar and fried food — prevention is easier before problems start',
      'Skipping sunscreen on “good skin days”',
      'Sleeping with makeup on',
    ],
    lifestyleTips: [
      'Simple consistent routine beats a complex 10-step regimen',
      'Monthly self-check for any new spots or moles',
    ],
    defaultSeverity: 'mild',
  },
};

export function buildSkinCareAdvice(
  prediction?: string,
  confidence?: number,
  probabilities?: Record<string, number>
): SkinCareAdvice | null {
  const text = collectText(prediction, probabilities);
  const concernKey = detectConcern(text);
  const template = ADVICE_BY_CONCERN[concernKey];
  const conf = confidence ?? 0;

  let severity = template.defaultSeverity;
  if (concernKey === 'suspicious_lesion' || URGENT_PATTERNS.test(prediction ?? '')) {
    severity = 'urgent';
  } else if (conf >= 75 && concernKey === 'healthy') {
    severity = 'mild';
  } else if (conf < 50) {
    severity = 'moderate';
  }

  const scanFindings = buildScanFindings(concernKey, prediction, confidence, probabilities);
  const top = topProbabilityEntries(probabilities, 4);
  const probNote =
    top.length > 0
      ? ` Detailed breakdown: ${top.map((t) => `${humanizeLabel(t.label)} ${t.pct}%`).join(' · ')}.`
      : '';

  return {
    primaryConcern: template.primaryConcern,
    concernKey,
    summary: template.summary + probNote,
    scanFindings,
    whatYourSkinNeeds: template.whatYourSkinNeeds,
    dailyRoutine: template.dailyRoutine,
    suggestedMedicines: template.suggestedMedicines,
    foodsToEat: template.foodsToEat,
    foodsToAvoid: template.foodsToAvoid,
    lifestyleTips: template.lifestyleTips,
    severity,
    skinFoodDisclaimer: SKIN_FOOD_DISCLAIMER,
  };
}
