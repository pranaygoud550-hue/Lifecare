import { Scan } from '../models/index.js';
import {
  searchNearbyPlaces,
  type GooglePlaceResult,
  type PlaceSearchType,
} from './googlePlacesService.js';

const CONDITION_RULES: Record<
  string,
  { keywords: string[]; type: PlaceSearchType; emergencyOnly?: boolean; reason: string }
> = {
  pneumonia: {
    keywords: ['pulmonology', 'chest', 'respiratory', 'icu'],
    type: 'hospital',
    reason: 'Nearest hospital with pulmonology / chest care for suspected pneumonia',
  },
  tuberculosis: {
    keywords: ['pulmonology', 'isolation', 'chest', 'tb'],
    type: 'hospital',
    reason: 'Hospital with isolation capability for TB concerns',
  },
  covid: {
    keywords: ['isolation', 'covid', 'infectious'],
    type: 'hospital',
    reason: 'Facility with isolation ward for infectious respiratory illness',
  },
  pleural_effusion: {
    keywords: ['pulmonology', 'chest', 'emergency'],
    type: 'hospital',
    reason: 'Emergency-capable hospital for pleural effusion',
  },
  normal: {
    keywords: [],
    type: 'clinic',
    reason: 'Nearest general clinic — scan within normal range',
  },
};

function normalizePrediction(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function scoreHospital(place: GooglePlaceResult, keywords: string[], emergencyOnly: boolean): number {
  const haystack = `${place.name} ${place.specialtyTags.join(' ')} ${place.types.join(' ')}`.toLowerCase();
  let score = 1000 - place.distanceMeters / 10;

  for (const kw of keywords) {
    if (haystack.includes(kw.toLowerCase())) score += 120;
  }

  if (place.isEmergency) score += 80;
  if (place.rating != null) score += place.rating * 10;
  if (place.isOpen === true) score += 40;

  if (emergencyOnly && !place.isEmergency && !place.types.includes('hospital')) {
    score -= 500;
  }

  return score;
}

export interface SmartHospitalRecommendation {
  recommendation: GooglePlaceResult | null;
  alternatives: GooglePlaceResult[];
  scanContext: {
    prediction: string;
    confidence: number;
    explanation: string;
  } | null;
  reason: string;
  source: 'google_places' | 'unavailable';
}

export async function recommendHospitalForPatient(
  patientId: string,
  lat: number,
  lng: number,
  radiusKm = 15
): Promise<SmartHospitalRecommendation> {
  const latestScan = await Scan.findOne({ patientId }).sort({ createdAt: -1 }).lean();

  let rule = CONDITION_RULES.normal;
  let scanContext: SmartHospitalRecommendation['scanContext'] = null;

  if (latestScan) {
    const normalized = normalizePrediction(latestScan.prediction);
    scanContext = {
      prediction: latestScan.prediction,
      confidence: latestScan.confidence,
      explanation: latestScan.explanation,
    };

    if (latestScan.confidence > 90 && normalized !== 'normal') {
      rule = {
        keywords: ['emergency', 'trauma', '24'],
        type: 'hospital',
        emergencyOnly: true,
        reason: `Critical confidence (${latestScan.confidence}%) — nearest emergency room only`,
      };
    } else if (CONDITION_RULES[normalized]) {
      rule = CONDITION_RULES[normalized];
    } else if (/covid|corona|sars/.test(normalized)) {
      rule = CONDITION_RULES.covid;
    } else if (/tb|tubercul/.test(normalized)) {
      rule = CONDITION_RULES.tuberculosis;
    } else if (/pneumon|consolidation/.test(normalized)) {
      rule = CONDITION_RULES.pneumonia;
    }
  }

  try {
    const keyword = rule.keywords.slice(0, 2).join(' ');
    const hospitals = await searchNearbyPlaces(
      lat,
      lng,
      radiusKm * 1000,
      rule.type,
      keyword || undefined
    );

    const ranked = [...hospitals]
      .map((h) => ({
        place: h,
        score: scoreHospital(h, rule.keywords, Boolean(rule.emergencyOnly)),
      }))
      .sort((a, b) => b.score - a.score);

    const top = ranked[0]?.place ?? null;
    const alternatives = ranked.slice(1, 6).map((r) => r.place);

    return {
      recommendation: top,
      alternatives,
      scanContext,
      reason: rule.reason,
      source: 'google_places',
    };
  } catch {
    return {
      recommendation: null,
      alternatives: [],
      scanContext,
      reason: rule.reason,
      source: 'unavailable',
    };
  }
}
