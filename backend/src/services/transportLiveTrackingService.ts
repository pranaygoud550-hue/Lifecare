import type { ITransportBooking, TransportStatus } from '../models/TransportBooking.js';
import { findNearbyHospitals } from './emergencyService.js';
import { calculateDistance } from '../utils/helpers.js';

export interface HospitalMapPoint {
  lat: number;
  lng: number;
  name: string;
  address?: string;
}

function stepToward(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  fraction: number
): { lat: number; lng: number } {
  return {
    lat: from.lat + (to.lat - from.lat) * fraction,
    lng: from.lng + (to.lng - from.lng) * fraction,
  };
}

function offsetKm(from: { lat: number; lng: number }, km: number, bearingDeg = 45): { lat: number; lng: number } {
  const R = 6371;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lng1 = (from.lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(km / R) + Math.cos(lat1) * Math.sin(km / R) * Math.cos(brng)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(km / R) * Math.cos(lat1),
      Math.cos(km / R) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

export async function resolveDestinationHospital(
  pickup: { lat: number; lng: number },
  destination?: { name?: string; address?: string; coordinates?: { lat: number; lng: number } }
): Promise<{ name: string; address: string; coordinates: { lat: number; lng: number } } | undefined> {
  if (destination?.coordinates?.lat != null && destination.coordinates.lng != null) {
    return {
      name: destination.name || 'Hospital',
      address: destination.address || '',
      coordinates: destination.coordinates,
    };
  }

  const nearby = await findNearbyHospitals(pickup.lat, pickup.lng, 25);
  const match = destination?.name
    ? nearby.find((h) => h.hospital.name.toLowerCase().includes(destination.name!.toLowerCase().slice(0, 8)))
    : null;
  const pick = match ?? nearby[0];
  if (!pick) return undefined;

  const coords =
    pick.hospital.coordinates ??
    (pick.hospital.location?.coordinates
      ? { lat: pick.hospital.location.coordinates[1], lng: pick.hospital.location.coordinates[0] }
      : undefined);

  if (!coords) return undefined;

  return {
    name: destination?.name || pick.hospital.name,
    address: destination?.address || pick.hospital.address,
    coordinates: coords,
  };
}

export function initialDriverLocation(pickup: { lat: number; lng: number }) {
  return offsetKm(pickup, 1.2 + Math.random() * 0.8, 200 + Math.random() * 80);
}

/** Demo live tracking — moves driver toward pickup then hospital (Rapido/Uber-style). */
export async function advanceTransportSimulation(booking: ITransportBooking): Promise<ITransportBooking> {
  if (['completed', 'cancelled'].includes(booking.status)) return booking;

  const pickup = booking.pickupLocation.coordinates;
  const hospital = booking.destinationHospital?.coordinates;
  let loc =
    booking.driverLocation ??
    initialDriverLocation(pickup);

  if (booking.status === 'requested' && booking.assignedDriverId) {
    booking.status = 'accepted';
    booking.statusHistory.push({ status: 'accepted', timestamp: new Date(), location: loc });
    if (!booking.estimatedArrival) {
      booking.estimatedArrival = new Date(Date.now() + 12 * 60 * 1000);
    }
  }

  let status: TransportStatus = booking.status;

  if (status === 'accepted' || status === 'en-route-to-patient') {
    status = 'en-route-to-patient';
    loc = stepToward(loc, pickup, 0.14);
    const km = calculateDistance(loc.lat, loc.lng, pickup.lat, pickup.lng);
    if (km < 0.08) {
      status = 'patient-picked-up';
      loc = pickup;
    }
  } else if ((status === 'patient-picked-up' || status === 'en-route-to-hospital') && hospital) {
    status = 'en-route-to-hospital';
    loc = stepToward(loc, hospital, 0.1);
    const km = calculateDistance(loc.lat, loc.lng, hospital.lat, hospital.lng);
    if (km < 0.1) {
      status = 'completed';
      loc = hospital;
    }
  } else if (status === 'patient-picked-up' && !hospital) {
    status = 'completed';
  }

  if (status !== booking.status) {
    booking.statusHistory.push({ status, timestamp: new Date(), location: loc });
  }

  booking.status = status;
  booking.driverLocation = { ...loc, timestamp: new Date() };
  await booking.save();
  return booking;
}

export function buildHospitalMapPoint(booking: ITransportBooking): HospitalMapPoint | null {
  const h = booking.destinationHospital;
  if (!h?.coordinates?.lat || h.coordinates.lng == null) return null;
  return {
    lat: h.coordinates.lat,
    lng: h.coordinates.lng,
    name: h.name,
    address: h.address,
  };
}

export function etaMinutesBetween(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const km = calculateDistance(from.lat, from.lng, to.lat, to.lng);
  return Math.max(1, Math.ceil(km * 3));
}
