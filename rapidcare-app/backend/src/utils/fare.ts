import type { VehicleType } from '../models/Booking.js';

const BASE: Record<VehicleType, number> = {
  BLS: 500,
  ALS: 1200,
  PTV: 350,
  MORTUARY: 800,
};

const PER_KM: Record<VehicleType, number> = {
  BLS: 25,
  ALS: 45,
  PTV: 15,
  MORTUARY: 30,
};

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function estimateFare(vehicleType: VehicleType, distanceKm: number): number {
  return Math.round(BASE[vehicleType] + distanceKm * PER_KM[vehicleType]);
}

export function generateBookingId(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `RC-${year}-${seq}`;
}

export function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}
