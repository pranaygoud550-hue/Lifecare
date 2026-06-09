import { calculateDistance } from './helpers.js';

const AMBULANCE_SPEED_KMH = 60;
const MAX_ETA_MINUTES = 10;

export interface EtaCalculation {
  distanceKm: number;
  adjustedDistanceKm: number;
  trafficMultiplier: number;
  etaMinutes: number;
}

/** Urban traffic multiplier by straight-line distance band. */
export function getTrafficMultiplier(distanceKm: number): number {
  if (distanceKm < 5) return 1.4;
  return 1.6;
}

/**
 * Haversine straight-line distance with urban traffic adjustment and 60 km/h city speed.
 * Returns ETA in minutes, rounded up.
 */
export function calculateETA(
  ambulanceLat: number,
  ambulanceLng: number,
  patientLat: number,
  patientLng: number
): EtaCalculation {
  const distanceKm = calculateDistance(ambulanceLat, ambulanceLng, patientLat, patientLng);
  const trafficMultiplier = getTrafficMultiplier(distanceKm);
  const adjustedDistanceKm = distanceKm * trafficMultiplier;
  const etaMinutes = Math.ceil((adjustedDistanceKm / AMBULANCE_SPEED_KMH) * 60);

  return {
    distanceKm,
    adjustedDistanceKm,
    trafficMultiplier,
    etaMinutes: Math.max(1, etaMinutes),
  };
}

export interface AmbulanceEtaCandidate<T> {
  item: T;
  ambulanceLat: number;
  ambulanceLng: number;
}

export interface AmbulanceSelectionResult<T> {
  selected: T;
  eta: EtaCalculation;
  isDelayed: boolean;
  triedCount: number;
}

/**
 * Walks nearest ambulances in order until one has ETA <= maxEtaMinutes.
 * Falls back to the closest ambulance with isDelayed=true when none qualify.
 */
export function selectAmbulanceByEta<T>(
  candidates: AmbulanceEtaCandidate<T>[],
  patientLat: number,
  patientLng: number,
  maxEtaMinutes = MAX_ETA_MINUTES
): AmbulanceSelectionResult<T> | null {
  if (candidates.length === 0) return null;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const eta = calculateETA(
      candidate.ambulanceLat,
      candidate.ambulanceLng,
      patientLat,
      patientLng
    );

    if (eta.etaMinutes <= maxEtaMinutes) {
      return {
        selected: candidate.item,
        eta,
        isDelayed: false,
        triedCount: i + 1,
      };
    }
  }

  const nearest = candidates[0];
  const eta = calculateETA(
    nearest.ambulanceLat,
    nearest.ambulanceLng,
    patientLat,
    patientLng
  );

  return {
    selected: nearest.item,
    eta,
    isDelayed: true,
    triedCount: candidates.length,
  };
}

export { MAX_ETA_MINUTES };
