import { calculateDistance } from '../../src/utils/helpers.js';
import { calculateETA, getTrafficMultiplier } from '../../src/utils/eta.js';
import { TEST_COORDS } from '../helpers/emergencyFixtures.js';

function pointAtDistanceKm(originLat: number, originLng: number, distanceKm: number) {
  const deltaLat = distanceKm / 111;
  return { lat: originLat + deltaLat, lng: originLng };
}

describe('calculateETA utility', () => {
  const patient = TEST_COORDS.patient;

  it('returns correct minutes for a 3km distance', () => {
    const ambulance = pointAtDistanceKm(patient.lat, patient.lng, 3);
    const distanceKm = calculateDistance(ambulance.lat, ambulance.lng, patient.lat, patient.lng);
    const result = calculateETA(ambulance.lat, ambulance.lng, patient.lat, patient.lng);

    expect(distanceKm).toBeGreaterThan(2.9);
    expect(distanceKm).toBeLessThan(3.1);
    expect(result.trafficMultiplier).toBe(getTrafficMultiplier(distanceKm));
    expect(result.etaMinutes).toBe(
      Math.max(1, Math.ceil(((distanceKm * result.trafficMultiplier) / 60) * 60))
    );
    expect(result.etaMinutes).toBe(5);
  });

  it('returns correct minutes for an 8km distance', () => {
    const ambulance = pointAtDistanceKm(patient.lat, patient.lng, 8);
    const distanceKm = calculateDistance(ambulance.lat, ambulance.lng, patient.lat, patient.lng);
    const result = calculateETA(ambulance.lat, ambulance.lng, patient.lat, patient.lng);

    expect(distanceKm).toBeGreaterThan(7.9);
    expect(distanceKm).toBeLessThan(8.1);
    expect(result.trafficMultiplier).toBe(1.6);
    expect(result.etaMinutes).toBe(
      Math.max(1, Math.ceil(((distanceKm * 1.6) / 60) * 60))
    );
    expect(result.etaMinutes).toBe(13);
  });

  it('always rounds up and never returns a decimal', () => {
    const ambulance = pointAtDistanceKm(patient.lat, patient.lng, 2.5);
    const result = calculateETA(ambulance.lat, ambulance.lng, patient.lat, patient.lng);

    expect(Number.isInteger(result.etaMinutes)).toBe(true);
    expect(result.etaMinutes).toBeGreaterThanOrEqual(1);
    expect(result.etaMinutes).toEqual(Math.ceil(result.etaMinutes));
  });

  it('returns a higher ETA when the traffic multiplier is applied', () => {
    const ambulance = pointAtDistanceKm(patient.lat, patient.lng, 3);
    const distanceKm = calculateDistance(ambulance.lat, ambulance.lng, patient.lat, patient.lng);
    const withTraffic = calculateETA(ambulance.lat, ambulance.lng, patient.lat, patient.lng);
    const withoutTrafficMinutes = Math.ceil((distanceKm / 60) * 60);

    expect(withTraffic.trafficMultiplier).toBeGreaterThan(1);
    expect(withTraffic.etaMinutes).toBeGreaterThan(withoutTrafficMinutes);
  });
});
