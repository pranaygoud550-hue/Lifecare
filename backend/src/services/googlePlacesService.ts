import { config } from '../config/index.js';
import { calculateDistance } from '../utils/helpers.js';
import { cacheGet, cacheSet, cacheKey } from './cacheService.js';

export type PlaceSearchType =
  | 'hospital'
  | 'clinic'
  | 'pharmacy'
  | 'diagnostic'
  | 'all';

const PLACE_TYPE_MAP: Record<Exclude<PlaceSearchType, 'all' | 'diagnostic'>, string> = {
  hospital: 'hospital',
  clinic: 'doctor',
  pharmacy: 'pharmacy',
};

const DIAGNOSTIC_KEYWORD = 'diagnostic center';

export interface GooglePlaceResult {
  place_id: string;
  name: string;
  address: string;
  phone: string | null;
  distance: string;
  distanceMeters: number;
  rating: number | null;
  isOpen: boolean | null;
  isEmergency: boolean;
  coordinates: { lat: number; lng: number };
  photo_url: string | null;
  types: string[];
  specialtyTags: string[];
}

interface GoogleNearbyResult {
  results: Array<{
    place_id: string;
    name: string;
    vicinity?: string;
    formatted_address?: string;
    geometry: { location: { lat: number; lng: number } };
    rating?: number;
    opening_hours?: { open_now?: boolean };
    types?: string[];
    photos?: Array<{ photo_reference: string }>;
    business_status?: string;
  }>;
  status: string;
  error_message?: string;
  next_page_token?: string;
}

interface GoogleDetailsResult {
  result: {
    place_id: string;
    name: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    geometry: { location: { lat: number; lng: number } };
    rating?: number;
    opening_hours?: { open_now?: boolean; weekday_text?: string[] };
    types?: string[];
    photos?: Array<{ photo_reference: string }>;
    business_status?: string;
    website?: string;
    url?: string;
  };
  status: string;
  error_message?: string;
}

function apiKey(): string | null {
  return config.google.placesApiKey || config.google.mapsApiKey || null;
}

function formatDistanceKm(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function photoUrl(reference: string | undefined): string | null {
  const key = apiKey();
  if (!reference || !key) return null;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${encodeURIComponent(reference)}&key=${key}`;
}

function inferSpecialtyTags(name: string, types: string[]): string[] {
  const tags = new Set<string>();
  const haystack = `${name} ${types.join(' ')}`.toLowerCase();

  if (haystack.includes('pulmon') || haystack.includes('chest')) tags.add('Pulmonology');
  if (haystack.includes('cardio') || haystack.includes('heart')) tags.add('Cardiology');
  if (haystack.includes('icu') || haystack.includes('critical')) tags.add('ICU');
  if (haystack.includes('isolation') || haystack.includes('covid')) tags.add('Isolation ward');
  if (types.includes('hospital')) tags.add('Hospital');
  if (types.includes('doctor')) tags.add('Clinic');
  if (types.includes('pharmacy')) tags.add('Pharmacy');
  if (haystack.includes('diagnostic') || haystack.includes('lab')) tags.add('Diagnostic');

  return [...tags];
}

function isEmergencyFacility(name: string, types: string[]): boolean {
  const haystack = `${name} ${types.join(' ')}`.toLowerCase();
  return (
    types.includes('hospital') &&
    (haystack.includes('emergency') ||
      haystack.includes('trauma') ||
      haystack.includes('accident') ||
      haystack.includes('24'))
  );
}

function mapNearbyResult(
  row: GoogleNearbyResult['results'][number],
  originLat: number,
  originLng: number
): GooglePlaceResult {
  const lat = row.geometry.location.lat;
  const lng = row.geometry.location.lng;
  const types = row.types ?? [];
  const distanceMeters = Math.round(calculateDistance(originLat, originLng, lat, lng) * 1000);

  return {
    place_id: row.place_id,
    name: row.name,
    address: row.vicinity ?? row.formatted_address ?? '',
    phone: null,
    distance: formatDistanceKm(distanceMeters),
    distanceMeters,
    rating: row.rating ?? null,
    isOpen: row.opening_hours?.open_now ?? null,
    isEmergency: isEmergencyFacility(row.name, types),
    coordinates: { lat, lng },
    photo_url: photoUrl(row.photos?.[0]?.photo_reference),
    types,
    specialtyTags: inferSpecialtyTags(row.name, types),
  };
}

function resolveSearchType(type: PlaceSearchType): { type?: string; keyword?: string } {
  if (type === 'all') return {};
  if (type === 'diagnostic') return { keyword: DIAGNOSTIC_KEYWORD };
  return { type: PLACE_TYPE_MAP[type] };
}

export function isGooglePlacesConfigured(): boolean {
  return Boolean(apiKey());
}

export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  radiusMeters: number,
  type: PlaceSearchType = 'hospital',
  keyword?: string
): Promise<GooglePlaceResult[]> {
  const key = apiKey();
  if (!key) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured');
  }

  const cacheKeyStr = cacheKey(['places-nearby', lat, lng, radiusMeters, type, keyword ?? '']);
  const cached = cacheGet<GooglePlaceResult[]>(cacheKeyStr);
  if (cached) return cached;

  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(radiusMeters),
    key,
  });

  const search = resolveSearchType(type);
  if (search.type) params.set('type', search.type);
  if (search.keyword || keyword) params.set('keyword', keyword ?? search.keyword ?? '');

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`;
  const res = await fetch(url);
  const data = (await res.json()) as GoogleNearbyResult;

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || `Google Places error: ${data.status}`);
  }

  let results = (data.results ?? []).map((row) => mapNearbyResult(row, lat, lng));

  if (type === 'diagnostic') {
    results = results.filter(
      (h) =>
        h.specialtyTags.includes('Diagnostic') ||
        h.name.toLowerCase().includes('diagnostic') ||
        h.name.toLowerCase().includes('lab')
    );
  }

  results.sort((a, b) => a.distanceMeters - b.distanceMeters);

  cacheSet(cacheKeyStr, results, config.google.placesCacheTtlSeconds);
  return results;
}

/** Text search finds hospitals nearby search misses (e.g. CMR Hospital, Kandlakoya). */
export async function searchHospitalsTextNearby(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<GooglePlaceResult[]> {
  const key = apiKey();
  if (!key) return [];

  const radius = Math.min(Math.max(radiusMeters, 500), 50_000);
  const cacheKeyStr = cacheKey(['places-text-hospital', lat.toFixed(4), lng.toFixed(4), radius]);
  const cached = cacheGet<GooglePlaceResult[]>(cacheKeyStr);
  if (cached) return cached;

  const params = new URLSearchParams({
    query: 'hospital',
    location: `${lat},${lng}`,
    radius: String(radius),
    key,
  });

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;
  const res = await fetch(url);
  const data = (await res.json()) as GoogleNearbyResult;

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || `Google Text Search error: ${data.status}`);
  }

  const results = (data.results ?? [])
    .map((row) => mapNearbyResult(row, lat, lng))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  cacheSet(cacheKeyStr, results, config.google.placesCacheTtlSeconds);
  return results;
}

export async function getPlaceDetails(placeId: string): Promise<GooglePlaceResult & { weekdayHours?: string[]; website?: string; googleMapsUrl?: string }> {
  const key = apiKey();
  if (!key) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured');
  }

  const cacheKeyStr = cacheKey(['place-details', placeId]);
  const cached = cacheGet<GooglePlaceResult & { weekdayHours?: string[]; website?: string; googleMapsUrl?: string }>(
    cacheKeyStr
  );
  if (cached) return cached;

  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'formatted_phone_number',
    'geometry',
    'rating',
    'opening_hours',
    'types',
    'photos',
    'business_status',
    'website',
    'url',
  ].join(',');

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${key}`;
  const res = await fetch(url);
  const data = (await res.json()) as GoogleDetailsResult;

  if (data.status !== 'OK') {
    throw new Error(data.error_message || `Google Places Details error: ${data.status}`);
  }

  const row = data.result;
  const types = row.types ?? [];
  const result: GooglePlaceResult & { weekdayHours?: string[]; website?: string; googleMapsUrl?: string } = {
    place_id: row.place_id,
    name: row.name,
    address: row.formatted_address ?? '',
    phone: row.formatted_phone_number ?? null,
    distance: '—',
    distanceMeters: 0,
    rating: row.rating ?? null,
    isOpen: row.opening_hours?.open_now ?? null,
    isEmergency: isEmergencyFacility(row.name, types),
    coordinates: {
      lat: row.geometry.location.lat,
      lng: row.geometry.location.lng,
    },
    photo_url: photoUrl(row.photos?.[0]?.photo_reference),
    types,
    specialtyTags: inferSpecialtyTags(row.name, types),
    weekdayHours: row.opening_hours?.weekday_text,
    website: row.website,
    googleMapsUrl: row.url,
  };

  cacheSet(cacheKeyStr, result, config.google.placesCacheTtlSeconds);
  return result;
}

/** Enrich nearby results with phone numbers (batched details — capped). */
export async function enrichPlacesWithPhones(places: GooglePlaceResult[], limit = 5): Promise<GooglePlaceResult[]> {
  const slice = places.slice(0, limit);
  const enriched = await Promise.all(
    slice.map(async (place) => {
      try {
        const details = await getPlaceDetails(place.place_id);
        return { ...place, phone: details.phone, isOpen: details.isOpen ?? place.isOpen };
      } catch {
        return place;
      }
    })
  );
  return [...enriched, ...places.slice(limit)];
}
