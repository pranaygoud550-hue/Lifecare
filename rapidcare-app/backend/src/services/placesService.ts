import { env } from '../config/env.js';

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  coords: { lat: number; lng: number };
}

export interface NearbyHospital {
  placeId: string;
  name: string;
  address: string;
  coords: { lat: number; lng: number };
  distanceKm: number;
}

function key(): string | null {
  return env.googleMapsKey || null;
}

export async function autocomplete(input: string, lat?: number, lng?: number): Promise<PlaceSuggestion[]> {
  const apiKey = key();
  if (!apiKey || input.trim().length < 3) return [];

  const params = new URLSearchParams({
    input: input.trim(),
    key: apiKey,
    components: 'country:in',
    types: 'geocode|establishment',
  });
  if (lat != null && lng != null) {
    params.set('location', `${lat},${lng}`);
    params.set('radius', '50000');
  }

  const res = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`);
  const data = (await res.json()) as {
    status: string;
    predictions?: Array<{ place_id: string; description: string; structured_formatting?: { main_text: string } }>;
  };

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return [];

  return (data.predictions || []).map((p) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text || p.description,
  }));
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const apiKey = key();
  if (!apiKey) return null;

  const params = new URLSearchParams({
    place_id: placeId,
    key: apiKey,
    fields: 'place_id,name,formatted_address,geometry',
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`);
  const data = (await res.json()) as {
    status: string;
    result?: {
      place_id: string;
      name: string;
      formatted_address?: string;
      geometry?: { location: { lat: number; lng: number } };
    };
  };

  if (data.status !== 'OK' || !data.result?.geometry) return null;

  return {
    placeId: data.result.place_id,
    name: data.result.name,
    address: data.result.formatted_address || data.result.name,
    coords: {
      lat: data.result.geometry.location.lat,
      lng: data.result.geometry.location.lng,
    },
  };
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export async function findNearestHospital(origin: { lat: number; lng: number }): Promise<NearbyHospital | null> {
  const apiKey = key();
  if (!apiKey) {
    const fallback = [
      { name: 'Apollo Hospital, Jubilee Hills', address: 'Jubilee Hills, Hyderabad', coords: { lat: 17.4215, lng: 78.4078 } },
      { name: 'Yashoda Hospital, Somajiguda', address: 'Somajiguda, Hyderabad', coords: { lat: 17.4239, lng: 78.4575 } },
    ];
    let best = fallback[0];
    let bestDist = Infinity;
    for (const h of fallback) {
      const d = haversineKm(origin, h.coords);
      if (d < bestDist) {
        bestDist = d;
        best = h;
      }
    }
    return { placeId: 'fallback', ...best, distanceKm: bestDist };
  }

  const params = new URLSearchParams({
    location: `${origin.lat},${origin.lng}`,
    radius: '15000',
    type: 'hospital',
    key: apiKey,
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`);
  const data = (await res.json()) as {
    status: string;
    results?: Array<{
      place_id: string;
      name: string;
      vicinity?: string;
      geometry: { location: { lat: number; lng: number } };
    }>;
  };

  if (!data.results?.length) return null;

  const sorted = data.results
    .map((r) => ({
      placeId: r.place_id,
      name: r.name,
      address: r.vicinity || r.name,
      coords: { lat: r.geometry.location.lat, lng: r.geometry.location.lng },
      distanceKm: haversineKm(origin, r.geometry.location),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return sorted[0] || null;
}
