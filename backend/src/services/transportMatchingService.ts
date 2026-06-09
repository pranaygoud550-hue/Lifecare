import { User } from '../models/index.js';
import type { IUser } from '../models/User.js';
import { calculateDistance } from '../utils/helpers.js';

const VEHICLE_TYPE_MAP: Record<string, string[]> = {
  basic_ambulance: ['BLS', 'ALS', 'Transport'],
  medical_cab: ['Transport', 'BLS'],
  wheelchair_van: ['Transport', 'BLS'],
  bike_ambulance: ['BLS', 'Transport'],
  home_visit_doctor: ['Transport'],
  BLS: ['BLS'],
  ALS: ['ALS'],
  emergency: ['BLS', 'ALS'],
};

function driverLocation(driver: IUser) {
  const details = driver.ambulanceDetails;
  if (details?.currentLocation?.lat != null && details.currentLocation.lng != null) {
    return { lat: details.currentLocation.lat, lng: details.currentLocation.lng };
  }
  const coords = details?.location?.coordinates;
  if (coords?.length === 2) {
    return { lat: coords[1], lng: coords[0] };
  }
  return { lat: 0, lng: 0 };
}

type DriverMatch = { driver: IUser; distance: number };

function rankDrivers(list: IUser[], coordinates: { lat: number; lng: number }): DriverMatch[] {
  return list
    .map((d) => {
      const loc = driverLocation(d);
      const distance = calculateDistance(coordinates.lat, coordinates.lng, loc.lat, loc.lng);
      return { driver: d, distance };
    })
    .sort((a, b) => {
      const ratingDiff =
        (b.driver.ambulanceDetails?.rating || 0) - (a.driver.ambulanceDetails?.rating || 0);
      if (Math.abs(a.distance - b.distance) < 0.5) return ratingDiff;
      return a.distance - b.distance;
    });
}

async function findDriversWithoutGeo(
  coordinates: { lat: number; lng: number },
  vehicleType: string,
  radiusKm: number
): Promise<DriverMatch[]> {
  const types = VEHICLE_TYPE_MAP[vehicleType] || [vehicleType, 'BLS', 'Transport'];

  let list = await User.find({
    userType: 'ambulance',
    isActive: true,
    'ambulanceDetails.availability': true,
    'ambulanceDetails.vehicleType': { $in: types },
  }).limit(30);

  if (list.length === 0) {
    list = await User.find({
      userType: 'ambulance',
      isActive: true,
      'ambulanceDetails.availability': true,
    }).limit(30);
  }

  const ranked = rankDrivers(list, coordinates);
  const withinRadius = ranked.filter((row) => row.distance <= radiusKm);
  return withinRadius.length > 0 ? withinRadius : ranked;
}

export async function findNearestDrivers(
  coordinates: { lat: number; lng: number },
  vehicleType: string,
  radiusKm: number
) {
  const types = VEHICLE_TYPE_MAP[vehicleType] || [vehicleType, 'BLS', 'Transport'];
  const point = { type: 'Point' as const, coordinates: [coordinates.lng, coordinates.lat] };

  try {
    let drivers = await User.find({
      userType: 'ambulance',
      isActive: true,
      'ambulanceDetails.availability': true,
      'ambulanceDetails.vehicleType': { $in: types },
      'ambulanceDetails.location': {
        $nearSphere: {
          $geometry: point,
          $maxDistance: radiusKm * 1000,
        },
      },
    }).limit(10);

    if (drivers.length === 0) {
      drivers = await User.find({
        userType: 'ambulance',
        isActive: true,
        'ambulanceDetails.availability': true,
        'ambulanceDetails.location': {
          $nearSphere: {
            $geometry: point,
            $maxDistance: radiusKm * 1000,
          },
        },
      }).limit(10);
    }

    if (drivers.length > 0) {
      return rankDrivers(drivers, coordinates);
    }
  } catch (err) {
    console.warn(
      'Geo driver search unavailable, using distance fallback:',
      err instanceof Error ? err.message : err
    );
  }

  return findDriversWithoutGeo(coordinates, vehicleType, radiusKm);
}

export function syncDriverGeoLocation(userId: string, lat: number, lng: number) {
  return User.findByIdAndUpdate(userId, {
    'ambulanceDetails.currentLocation': { lat, lng, timestamp: new Date() },
    'ambulanceDetails.location': {
      type: 'Point',
      coordinates: [lng, lat],
    },
  });
}
