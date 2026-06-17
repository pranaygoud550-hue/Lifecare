import { calculateDistance } from '../utils/helpers.js';
import { cacheGet, cacheSet, cacheKey } from './cacheService.js';
import { isRecognizedHospitalName, isExcludedSmallClinicName } from '../utils/emergencyHospitalFilter.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'LifeCarePlus/1.0 (emergency hospital search)';

export interface OsmHospitalResult {
  _id: string;
  name: string;
  address: string;
  phone: string | null;
  city?: string;
  state?: string;
  specialties?: string[];
  emergencyAvailable: boolean;
  coordinates: { lat: number; lng: number };
  distanceMeters: number;
  source: 'openstreetmap';
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function elementCoords(el: OverpassElement): { lat: number; lng: number } | null {
  if (el.lat != null && el.lon != null) return { lat: el.lat, lng: el.lon };
  if (el.center) return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

/**
 * Real hospitals from OpenStreetMap — works worldwide without a Google API key.
 * Used when Google Places is not configured (Hyderabad, Warangal, etc.).
 */
export async function searchOsmHospitals(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<OsmHospitalResult[]> {
  if (process.env.DISABLE_OSM_HOSPITALS === 'true') {
    return [];
  }

  const radius = Math.min(Math.max(radiusMeters, 500), 50_000);
  const cacheKeyStr = cacheKey(['osm-hospitals', lat.toFixed(4), lng.toFixed(4), radius]);
  const cached = cacheGet<OsmHospitalResult[]>(cacheKeyStr);
  if (cached) return cached;

  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lng});
      way["amenity"="hospital"](around:${radius},${lat},${lng});
      relation["amenity"="hospital"](around:${radius},${lat},${lng});
      node["healthcare"="hospital"](around:${radius},${lat},${lng});
      way["healthcare"="hospital"](around:${radius},${lat},${lng});
    );
    out center tags;
  `;

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error(`OpenStreetMap Overpass error: ${res.status}`);
  }

  const data = (await res.json()) as OverpassResponse;
  const seen = new Set<string>();
  const hospitals: OsmHospitalResult[] = [];

  for (const el of data.elements ?? []) {
    const coords = elementCoords(el);
    if (!coords) continue;

    const name = el.tags?.name;
    if (!name) continue;
    if (isExcludedSmallClinicName(name)) continue;
    if (el.tags?.healthcare === 'clinic' || el.tags?.amenity === 'clinic') continue;
    if (!isRecognizedHospitalName(name) && el.tags?.emergency !== 'yes' && el.tags?.ambulance !== 'yes') {
      continue;
    }

    const dedupeKey = `${name.toLowerCase()}@${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const distanceMeters = Math.round(
      calculateDistance(lat, lng, coords.lat, coords.lng) * 1000
    );

    const address =
      el.tags?.['addr:full'] ||
      [el.tags?.['addr:street'], el.tags?.['addr:city'], el.tags?.['addr:state']]
        .filter(Boolean)
        .join(', ') ||
      el.tags?.['addr:city'] ||
      '';

    hospitals.push({
      _id: `osm-${el.type}-${el.id}`,
      name,
      address,
      phone: el.tags?.phone ?? el.tags?.['contact:phone'] ?? null,
      city: el.tags?.['addr:city'],
      state: el.tags?.['addr:state'],
      specialties: el.tags?.healthcare_speciality
        ? el.tags.healthcare_speciality.split(';').map((s) => s.trim())
        : ['Hospital'],
      emergencyAvailable: true,
      coordinates: coords,
      distanceMeters,
      source: 'openstreetmap',
    });
  }

  hospitals.sort((a, b) => a.distanceMeters - b.distanceMeters);
  cacheSet(cacheKeyStr, hospitals, 600);
  return hospitals;
}

export function isOsmHospitalSearchAvailable(): boolean {
  return true;
}
