import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { User, AmbulanceUnit, Hospital, EmergencyRequest } from '../../src/models/index.js';
import { calculateDistance } from '../../src/utils/helpers.js';
import { calculateETA } from '../../src/utils/eta.js';
import { issueTokenPair } from '../../src/services/tokenService.js';

/** Fixed Hyderabad-area coordinates for deterministic Haversine assertions. */
export const TEST_COORDS = {
  patient: { lat: 17.385, lng: 78.4867 },
  ambulances: {
    nearest: { lat: 17.402, lng: 78.4867, vehicleNumber: 'AMB-TEST-1' },
    mid: { lat: 17.43, lng: 78.4867, vehicleNumber: 'AMB-TEST-2' },
    far: { lat: 17.4706, lng: 78.4867, vehicleNumber: 'AMB-TEST-3' },
  },
  hospitals: {
    near: {
      lat: 17.388,
      lng: 78.489,
      name: 'Test Trauma Center Alpha',
      slug: 'test-trauma-alpha',
    },
    far: {
      lat: 17.415,
      lng: 78.505,
      name: 'Test Multi-Specialty Beta',
      slug: 'test-multi-beta',
    },
  },
  /** Remote point with no seeded hospitals within 1 km. */
  remote: { lat: 28.6139, lng: 77.209 },
} as const;

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return Math.round(calculateDistance(lat1, lng1, lat2, lng2) * 1000);
}

export function expectedEtaMinutes(
  ambulanceLat: number,
  ambulanceLng: number,
  patientLat: number,
  patientLng: number
): number {
  return calculateETA(ambulanceLat, ambulanceLng, patientLat, patientLng).etaMinutes;
}

export interface EmergencyTestSeed {
  patient: { _id: Types.ObjectId; token: string };
  drivers: Array<{
    userId: Types.ObjectId;
    token: string;
    vehicleNumber: string;
    unitId: Types.ObjectId;
  }>;
  hospitals: {
    nearId: Types.ObjectId;
    farId: Types.ObjectId;
  };
  distances: {
    nearestAmbulanceMeters: number;
    nearestHospitalMeters: number;
  };
}

async function createUser(params: {
  userType: 'patient' | 'ambulance';
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  location?: { lat: number; lng: number };
}) {
  const base = {
    userType: params.userType,
    email: params.email,
    phone: params.phone,
    password: await bcrypt.hash('TestPass123!', 4),
    isEmailVerified: true,
    isPhoneVerified: true,
    profile: {
      firstName: params.firstName,
      lastName: params.lastName,
    },
  };

  if (params.userType === 'ambulance' && params.location) {
    return User.create({
      ...base,
      ambulanceDetails: {
        availability: true,
        vehicleNumber: 'TEST-AMB',
        location: {
          type: 'Point',
          coordinates: [params.location.lng, params.location.lat],
        },
        currentLocation: {
          lat: params.location.lat,
          lng: params.location.lng,
          timestamp: new Date(),
        },
      },
    });
  }

  return User.collection.insertOne({
    ...base,
    twoFactorEnabled: false,
    isActive: true,
    isBlocked: false,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).then((result) => User.findById(result.insertedId)) as Promise<InstanceType<typeof User>>;
}

export async function seedEmergencyTestData(options?: {
  onlyFarAmbulanceAvailable?: boolean;
}): Promise<EmergencyTestSeed> {
  const patient = await createUser({
    userType: 'patient',
    email: 'patient-emergency@test.com',
    phone: '9000000001',
    firstName: 'Test',
    lastName: 'Patient',
  });

  if (!patient) {
    throw new Error('Failed to seed patient user');
  }

  const driverDefs = [
    { email: 'driver1@test.com', phone: '9000000011', firstName: 'Driver', lastName: 'One', ...TEST_COORDS.ambulances.nearest },
    { email: 'driver2@test.com', phone: '9000000012', firstName: 'Driver', lastName: 'Two', ...TEST_COORDS.ambulances.mid },
    { email: 'driver3@test.com', phone: '9000000013', firstName: 'Driver', lastName: 'Three', ...TEST_COORDS.ambulances.far },
  ];

  const drivers: EmergencyTestSeed['drivers'] = [];

  for (const def of driverDefs) {
    const driver = await createUser({
      userType: 'ambulance',
      email: def.email,
      phone: def.phone,
      firstName: def.firstName,
      lastName: def.lastName,
      location: { lat: def.lat, lng: def.lng },
    });

    const onlyFar = options?.onlyFarAmbulanceAvailable === true;
    const isFar = def.vehicleNumber === TEST_COORDS.ambulances.far.vehicleNumber;

    const unit = await AmbulanceUnit.create({
      driverId: driver._id,
      vehicleNumber: def.vehicleNumber,
      currentLocation: {
        type: 'Point',
        coordinates: [def.lng, def.lat],
      },
      isAvailable: onlyFar ? isFar : true,
      status: 'idle',
      lastUpdated: new Date(),
    });

    const tokens = await issueTokenPair({
      userId: String(driver._id),
      userType: 'ambulance',
      email: driver.email,
    });

    drivers.push({
      userId: driver._id as Types.ObjectId,
      token: tokens.accessToken,
      vehicleNumber: def.vehicleNumber,
      unitId: unit._id as Types.ObjectId,
    });
  }

  const nearHospital = await Hospital.create({
    name: TEST_COORDS.hospitals.near.name,
    slug: TEST_COORDS.hospitals.near.slug,
    city: 'Hyderabad',
    state: 'Telangana',
    address: '123 Test Road',
    coordinates: { lat: TEST_COORDS.hospitals.near.lat, lng: TEST_COORDS.hospitals.near.lng },
    location: {
      type: 'Point',
      coordinates: [TEST_COORDS.hospitals.near.lng, TEST_COORDS.hospitals.near.lat],
    },
    type: 'trauma-center',
    specialties: ['Emergency Medicine'],
    emergencyAvailable: true,
    isActive: true,
  });

  const farHospital = await Hospital.create({
    name: TEST_COORDS.hospitals.far.name,
    slug: TEST_COORDS.hospitals.far.slug,
    city: 'Hyderabad',
    state: 'Telangana',
    address: '456 Test Avenue',
    coordinates: { lat: TEST_COORDS.hospitals.far.lat, lng: TEST_COORDS.hospitals.far.lng },
    location: {
      type: 'Point',
      coordinates: [TEST_COORDS.hospitals.far.lng, TEST_COORDS.hospitals.far.lat],
    },
    type: 'multi-specialty',
    specialties: ['General Medicine'],
    emergencyAvailable: true,
    isActive: true,
  });

  const patientTokens = await issueTokenPair({
    userId: String(patient!._id),
    userType: 'patient',
    email: patient!.email,
  });

  await Promise.all([
    AmbulanceUnit.syncIndexes(),
    Hospital.syncIndexes(),
    EmergencyRequest.syncIndexes(),
  ]);

  const { lat: pLat, lng: pLng } = TEST_COORDS.patient;
  const { lat: aLat, lng: aLng } = TEST_COORDS.ambulances.nearest;
  const { lat: hLat, lng: hLng } = TEST_COORDS.hospitals.near;

  return {
    patient: { _id: patient!._id as Types.ObjectId, token: patientTokens.accessToken },
    drivers,
    hospitals: {
      nearId: nearHospital._id as Types.ObjectId,
      farId: farHospital._id as Types.ObjectId,
    },
    distances: {
      nearestAmbulanceMeters: haversineMeters(aLat, aLng, pLat, pLng),
      nearestHospitalMeters: haversineMeters(hLat, hLng, pLat, pLng),
    },
  };
}

export async function flushPromises(rounds = 5): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}
