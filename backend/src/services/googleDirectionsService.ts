import { config } from '../config/index.js';
import { cacheGet, cacheSet, cacheKey } from './cacheService.js';
import { decodePolyline } from '../utils/polyline.js';

export type NavigationMode = 'driving' | 'walking' | 'ambulance';

export interface TurnStep {
  instruction: string;
  distance: string;
  duration: string;
  maneuver?: string;
  startLocation: { lat: number; lng: number };
}

export interface DirectionsResult {
  distance: string;
  distanceMeters: number;
  duration: string;
  durationSeconds: number;
  durationInTraffic: string | null;
  durationInTrafficSeconds: number | null;
  steps: TurnStep[];
  polyline: string;
  decodedPath: [number, number][];
  warnings: string[];
}

interface GoogleDirectionsResponse {
  routes: Array<{
    legs: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      duration_in_traffic?: { text: string; value: number };
      steps: Array<{
        html_instructions?: string;
        distance: { text: string };
        duration: { text: string };
        maneuver?: string;
        start_location: { lat: number; lng: number };
      }>;
    }>;
    overview_polyline: { points: string };
    warnings?: string[];
  }>;
  status: string;
  error_message?: string;
}

function apiKey(): string | null {
  return config.google.mapsApiKey || config.google.placesApiKey || null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isGoogleDirectionsConfigured(): boolean {
  return Boolean(apiKey());
}

export async function getDirectionsRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode: NavigationMode = 'driving'
): Promise<DirectionsResult> {
  const key = apiKey();
  if (!key) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }

  const cacheKeyStr = cacheKey([
    'directions',
    originLat.toFixed(4),
    originLng.toFixed(4),
    destLat.toFixed(4),
    destLng.toFixed(4),
    mode,
  ]);
  const cached = cacheGet<DirectionsResult>(cacheKeyStr);
  if (cached) return cached;

  const params = new URLSearchParams({
    origin: `${originLat},${originLng}`,
    destination: `${destLat},${destLng}`,
    mode: 'driving',
    departure_time: 'now',
    traffic_model: 'best_guess',
    key,
  });

  if (mode === 'walking') {
    params.set('mode', 'walking');
    params.delete('departure_time');
    params.delete('traffic_model');
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?${params}`;
  const res = await fetch(url);
  const data = (await res.json()) as GoogleDirectionsResponse;

  if (data.status !== 'OK') {
    throw new Error(data.error_message || `Google Directions error: ${data.status}`);
  }

  const route = data.routes[0];
  const leg = route.legs[0];
  const encoded = route.overview_polyline.points;

  const result: DirectionsResult = {
    distance: leg.distance.text,
    distanceMeters: leg.distance.value,
    duration: leg.duration.text,
    durationSeconds: leg.duration.value,
    durationInTraffic: leg.duration_in_traffic?.text ?? null,
    durationInTrafficSeconds: leg.duration_in_traffic?.value ?? null,
    steps: leg.steps.map((step) => ({
      instruction: stripHtml(step.html_instructions ?? 'Continue'),
      distance: step.distance.text,
      duration: step.duration.text,
      maneuver: step.maneuver,
      startLocation: {
        lat: step.start_location.lat,
        lng: step.start_location.lng,
      },
    })),
    polyline: encoded,
    decodedPath: decodePolyline(encoded),
    warnings: route.warnings ?? [],
  };

  cacheSet(cacheKeyStr, result, config.google.directionsCacheTtlSeconds);
  return result;
}

export function etaMinutesFromDirections(route: DirectionsResult): number {
  const seconds = route.durationInTrafficSeconds ?? route.durationSeconds;
  return Math.max(1, Math.ceil(seconds / 60));
}
