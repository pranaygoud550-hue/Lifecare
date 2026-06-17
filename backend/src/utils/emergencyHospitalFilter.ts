import type { IHospital } from '../models/Hospital.js';
import type { GooglePlaceResult } from '../services/googlePlacesService.js';
import type { OsmHospitalResult } from '../services/osmHospitalService.js';

export type EmergencyHospitalCandidate = {
  name: string;
  source: 'database' | 'google_places' | 'openstreetmap';
  emergencyAvailable?: boolean;
  coordinates: { lat: number; lng: number } | null;
};

/** Small clinics / diagnostics — not for ambulance routing. */
const EXCLUDED_NAME_PATTERN =
  /\b(polyclinic|nursing\s*home|diagnostic|diagnostics|pathology|laboratory|\blab\b|dental|dentist|orthodont|skin\s*care|dermatology|eye\s*care|optical|opticals|chemist|physiotherapy|physio|ayurveda|homeopath|cosmetic|aesthetic|fertility|ivf|scan\s*centre|scan\s*center|x-?ray|maternity\s*home|medi\s*care\s*and\s*diagnostic|diagnostic\s*centre|diagnostic\s*center)\b/i;

/** Mis-tagged as hospital but are clinics / stores. */
const CLINIC_ONLY_PATTERN =
  /\b(clinic|homeo|ayurved|wellness\s*centre|wellness\s*center|helpline|diabetic\s*center|diabetic\s*centre|medical\s*&\s*general\s*stores?|drugstore|pharmacy)\b/i;

const RECOGNIZED_DB_TYPES = new Set([
  'multi-specialty',
  'super-specialty',
  'government',
  'trauma-center',
]);

export function hasHospitalInName(name: string): boolean {
  return /\bhospitals?\b/i.test(name.trim());
}

export function isExcludedSmallClinicName(name: string): boolean {
  return EXCLUDED_NAME_PATTERN.test(name.trim());
}

/** Local + major hospitals — name contains Hospital/Hospitals and is not a small clinic. */
export function isRecognizedHospitalName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || isExcludedSmallClinicName(trimmed)) return false;
  if (hasHospitalInName(trimmed)) return true;
  if (/\b(govt|government|uphc|area\s*hospital|district\s*hospital|medical\s*college)\b/i.test(trimmed)) {
    return true;
  }
  return false;
}

export function isEmergencyCapableDbHospital(hospital: IHospital): boolean {
  if (!hospital.isActive || !hospital.emergencyAvailable) return false;
  if (hospital.type === 'clinic') return false;
  if (!RECOGNIZED_DB_TYPES.has(hospital.type)) return false;
  if (isExcludedSmallClinicName(hospital.name)) return false;
  return true;
}

export function isEmergencyCapableGooglePlace(place: GooglePlaceResult): boolean {
  const types = place.types ?? [];
  if (!types.includes('hospital')) return false;
  if (isExcludedSmallClinicName(place.name)) return false;

  const name = place.name.trim();
  if (CLINIC_ONLY_PATTERN.test(name) && !hasHospitalInName(name)) return false;

  if (hasHospitalInName(name)) return true;
  if (place.isEmergency) return true;
  if (/\b(govt|government|uphc|area\s*hospital|district)\b/i.test(name)) return true;

  return false;
}

export function isEmergencyCapableOsmHospital(
  row: OsmHospitalResult,
  tags?: Record<string, string>
): boolean {
  if (isExcludedSmallClinicName(row.name)) return false;
  if (tags?.healthcare === 'clinic' || tags?.amenity === 'clinic') return false;
  if (tags?.emergency === 'no') return false;
  if (tags?.emergency === 'yes' || tags?.ambulance === 'yes') return true;
  return isRecognizedHospitalName(row.name);
}

export function isEmergencyCapableUnifiedHospital(hospital: EmergencyHospitalCandidate): boolean {
  if (!hospital.coordinates) return false;
  if (isExcludedSmallClinicName(hospital.name)) return false;

  if (hospital.source === 'database') {
    return hospital.emergencyAvailable !== false;
  }

  return isRecognizedHospitalName(hospital.name);
}

export function filterEmergencyCapableHospitals<T extends EmergencyHospitalCandidate>(
  hospitals: T[]
): T[] {
  return hospitals.filter(isEmergencyCapableUnifiedHospital);
}
