import { config } from '../config/index.js';
import { cacheGet, cacheSet, cacheKey } from './cacheService.js';
import { getPlaceDetails } from './googlePlacesService.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'LifeCarePlus/1.0 (emergency geocoding)';

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  placeId?: string;
}

function googleApiKey(): string | null {
  return config.google.placesApiKey || config.google.mapsApiKey || null;
}

async function geocodeWithGoogle(query: string): Promise<GeocodeResult | null> {
  const key = googleApiKey();
  if (!key) return null;

  const params = new URLSearchParams({
    address: query,
    key,
    components: 'country:IN',
    region: 'in',
  });

  const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    results?: Array<{
      place_id: string;
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
    }>;
    error_message?: string;
  };

  if (data.status !== 'OK' || !data.results?.[0]) return null;

  const hit = data.results[0];
  return {
    lat: hit.geometry.location.lat,
    lng: hit.geometry.location.lng,
    displayName: hit.formatted_address,
    placeId: hit.place_id,
  };
}

/** Resolve coordinates from a Google place_id — Place Details first, then Geocoding API. */
export async function geocodePlaceId(placeId: string): Promise<GeocodeResult | null> {
  const trimmed = placeId.trim();
  if (!trimmed) return null;

  const cacheKeyStr = cacheKey(['geocode-place', trimmed]);
  const cached = cacheGet<GeocodeResult>(cacheKeyStr);
  if (cached) return cached;

  const key = googleApiKey();
  if (!key) return null;

  try {
    const details = await getPlaceDetails(trimmed);
    const result: GeocodeResult = {
      lat: details.coordinates.lat,
      lng: details.coordinates.lng,
      displayName: details.address || details.name,
      placeId: details.place_id,
    };
    cacheSet(cacheKeyStr, result, 3600);
    return result;
  } catch {
    /* fall through to Geocoding API */
  }

  const params = new URLSearchParams({ place_id: trimmed, key });
  const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    results?: Array<{
      place_id: string;
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
    }>;
  };

  if (data.status !== 'OK' || !data.results?.[0]) return null;

  const hit = data.results[0];
  const result: GeocodeResult = {
    lat: hit.geometry.location.lat,
    lng: hit.geometry.location.lng,
    displayName: hit.formatted_address,
    placeId: hit.place_id,
  };

  cacheSet(cacheKeyStr, result, 3600);
  return result;
}

/** GPS → readable street address (reverse geocode). */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  const cacheKeyStr = cacheKey(['reverse-geocode', lat.toFixed(5), lng.toFixed(5)]);
  const cached = cacheGet<GeocodeResult>(cacheKeyStr);
  if (cached) return cached;

  const key = googleApiKey();
  if (!key) return null;

  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key,
    result_type: 'street_address|route|neighborhood|sublocality|locality',
  });

  const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    results?: Array<{
      place_id: string;
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
    }>;
  };

  if (data.status !== 'OK' || !data.results?.[0]) return null;

  const hit = data.results[0];
  const result: GeocodeResult = {
    lat: hit.geometry.location.lat,
    lng: hit.geometry.location.lng,
    displayName: hit.formatted_address,
    placeId: hit.place_id,
  };

  cacheSet(cacheKeyStr, result, 3600);
  return result;
}

async function geocodeWithNominatim(query: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    q: query.includes('India') ? query : `${query}, India`,
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

  return {
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    displayName: hit.display_name,
  };
}

/**
 * Convert a typed address to coordinates — Google Geocoding first, then OpenStreetMap fallback.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const cacheKeyStr = cacheKey(['geocode', trimmed.toLowerCase()]);
  const cached = cacheGet<GeocodeResult>(cacheKeyStr);
  if (cached) return cached;

  const google = await geocodeWithGoogle(trimmed);
  if (google) {
    cacheSet(cacheKeyStr, google, 3600);
    return google;
  }

  const osm = await geocodeWithNominatim(trimmed);
  if (osm) {
    cacheSet(cacheKeyStr, osm, 3600);
  }
  return osm;
}
