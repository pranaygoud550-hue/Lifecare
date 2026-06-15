import { cacheGet, cacheSet, cacheKey } from './cacheService.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'LifeCarePlus/1.0 (emergency geocoding)';

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Convert a typed address (e.g. "Warangal, Telangana") to coordinates via OpenStreetMap Nominatim.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const cacheKeyStr = cacheKey(['geocode', trimmed.toLowerCase()]);
  const cached = cacheGet<GeocodeResult>(cacheKeyStr);
  if (cached) return cached;

  const params = new URLSearchParams({
    q: trimmed.includes('India') ? trimmed : `${trimmed}, India`,
    format: 'json',
    limit: '1',
    countrycodes: 'in',
  });

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Geocoding failed: ${res.status}`);
  }

  const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  const hit = rows[0];
  if (!hit) return null;

  const result: GeocodeResult = {
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    displayName: hit.display_name,
  };

  cacheSet(cacheKeyStr, result, 3600);
  return result;
}
