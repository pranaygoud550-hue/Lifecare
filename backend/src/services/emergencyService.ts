import { Types } from 'mongoose';
import { AmbulanceUnit, EmergencyRequest, Hospital, User } from '../models/index.js';
import type { IAmbulanceUnit } from '../models/AmbulanceUnit.js';
import type { IEmergencyRequest } from '../models/EmergencyRequest.js';
import type { IHospital } from '../models/Hospital.js';
import { calculateDistance } from '../utils/helpers.js';
import { calculateETA, selectAmbulanceByEta, type EtaCalculation } from '../utils/eta.js';
import { config } from '../config/index.js';
import {
  isGooglePlacesConfigured,
  searchNearbyPlaces,
  enrichPlacesWithPhones,
} from './googlePlacesService.js';
import { searchOsmHospitals } from './osmHospitalService.js';

export interface AmbulanceWithDistance {
  unit: IAmbulanceUnit;
  distanceKm: number;
  distanceMeters: number;
  eta: EtaCalculation;
}

export interface HospitalWithDistance {
  hospital: IHospital;
  distanceKm: number;
  distanceMeters: number;
}

export interface UnifiedNearbyHospital {
  _id: string;
  name: string;
  address: string;
  phone: string | null;
  city?: string;
  state?: string;
  specialties?: string[];
  emergencyAvailable?: boolean;
  coordinates: { lat: number; lng: number } | null;
  distanceMeters: number;
  source: 'google_places' | 'database' | 'openstreetmap';
  googlePlaceId?: string;
}

function toGeoPoint(lat: number, lng: number) {
  return { type: 'Point' as const, coordinates: [lng, lat] as [number, number] };
}

export function unitCoords(unit: IAmbulanceUnit): { lat: number; lng: number } {
  const [lng, lat] = unit.currentLocation.coordinates;
  return { lat, lng };
}

function hospitalCoords(hospital: IHospital): { lat: number; lng: number } | null {
  if (hospital.location?.coordinates?.length === 2) {
    const [lng, lat] = hospital.location.coordinates;
    return { lat, lng };
  }
  if (hospital.coordinates?.lat != null && hospital.coordinates?.lng != null) {
    return hospital.coordinates;
  }
  return null;
}

function patientCoords(request: IEmergencyRequest): { lat: number; lng: number } {
  const [lng, lat] = request.patientLocation.coordinates;
  return { lat, lng };
}

export async function findNearestAvailableAmbulances(
  lat: number,
  lng: number,
  radiusKm = 10,
  limit = 10
): Promise<AmbulanceWithDistance[]> {
  const point = toGeoPoint(lat, lng);

  const units = await AmbulanceUnit.find({
    isAvailable: true,
    status: 'idle',
    currentLocation: {
      $nearSphere: {
        $geometry: point,
        $maxDistance: radiusKm * 1000,
      },
    },
  })
    .limit(limit)
    .populate('driverId', 'profile phone email userType');

  return units.map((unit) => {
    const coords = unitCoords(unit);
    const distanceKm = calculateDistance(lat, lng, coords.lat, coords.lng);
    const eta = calculateETA(coords.lat, coords.lng, lat, lng);
    return {
      unit,
      distanceKm,
      distanceMeters: Math.round(distanceKm * 1000),
      eta,
    };
  });
}

/** Finds ambulances near the patient, expanding search radius when none are close. */
export async function findNearestAvailableAmbulancesWithFallback(
  lat: number,
  lng: number,
  limit = 10
): Promise<AmbulanceWithDistance[]> {
  for (const radiusKm of [10, 50, 200, 500]) {
    const found = await findNearestAvailableAmbulances(lat, lng, radiusKm, limit);
    if (found.length > 0) return found;
  }

  const units = await AmbulanceUnit.find({ isAvailable: true, status: 'idle' })
    .limit(limit)
    .populate('driverId', 'profile phone email userType');

  return units.map((unit) => {
    const coords = unitCoords(unit);
    const distanceKm = calculateDistance(lat, lng, coords.lat, coords.lng);
    const eta = calculateETA(coords.lat, coords.lng, lat, lng);
    return {
      unit,
      distanceKm,
      distanceMeters: Math.round(distanceKm * 1000),
      eta,
    };
  });
}

export function selectBestAmbulanceForPatient(
  ambulances: AmbulanceWithDistance[],
  patientLat: number,
  patientLng: number
) {
  const selection = selectAmbulanceByEta(
    ambulances.map((row) => {
      const coords = unitCoords(row.unit);
      return {
        item: row,
        ambulanceLat: coords.lat,
        ambulanceLng: coords.lng,
      };
    }),
    patientLat,
    patientLng
  );

  return selection;
}

export async function findNearestHospital(
  lat: number,
  lng: number,
  radiusKm = 15
): Promise<HospitalWithDistance | null> {
  const point = toGeoPoint(lat, lng);

  let hospital = await Hospital.findOne({
    isActive: true,
    emergencyAvailable: true,
    location: {
      $nearSphere: {
        $geometry: point,
        $maxDistance: radiusKm * 1000,
      },
    },
  });

  if (!hospital) {
    return findNearestHospitalGlobally(lat, lng);
  }

  const coords = hospitalCoords(hospital);
  if (!coords) return findNearestHospitalGlobally(lat, lng);

  const distanceKm = calculateDistance(lat, lng, coords.lat, coords.lng);

  return {
    hospital,
    distanceKm,
    distanceMeters: Math.round(distanceKm * 1000),
  };
}

/** Nearest emergency hospital anywhere in the database (no radius cap). */
export async function findNearestHospitalGlobally(
  lat: number,
  lng: number
): Promise<HospitalWithDistance | null> {
  const hospitals = await Hospital.find({
    isActive: true,
    emergencyAvailable: true,
  }).limit(200);

  let best: HospitalWithDistance | null = null;

  for (const hospital of hospitals) {
    const coords = hospitalCoords(hospital);
    if (!coords) continue;
    const distanceKm = calculateDistance(lat, lng, coords.lat, coords.lng);
    const distanceMeters = Math.round(distanceKm * 1000);
    if (!best || distanceMeters < best.distanceMeters) {
      best = { hospital, distanceKm, distanceMeters };
    }
  }

  return best;
}

function unifiedHospitalToPayload(hospital: UnifiedNearbyHospital): Record<string, unknown> {
  return {
    _id: hospital._id,
    name: hospital.name,
    address: hospital.address,
    phone: hospital.phone,
    emergencyAvailable: hospital.emergencyAvailable ?? true,
    coordinates: hospital.coordinates,
    distanceMeters: hospital.distanceMeters,
    googlePlaceId: hospital.googlePlaceId,
    source: hospital.source,
  };
}

const ACTIVE_EMERGENCY_STATUSES = ['searching', 'dispatched', 'arrived', 'pickedUp', 'atHospital'];

/** Frees ambulances stuck unavailable after completed/cancelled emergencies. */
export async function releaseStaleAmbulanceUnits(): Promise<number> {
  if (config.nodeEnv === 'test') return 0;

  const activeEmergencies = await EmergencyRequest.find({
    status: { $in: ACTIVE_EMERGENCY_STATUSES },
  }).select('assignedAmbulanceId');

  const busyIds = new Set(
    activeEmergencies
      .map((row) => (row.assignedAmbulanceId ? String(row.assignedAmbulanceId) : ''))
      .filter(Boolean)
  );

  const stuckUnits = await AmbulanceUnit.find({ isAvailable: false });
  let released = 0;

  for (const unit of stuckUnits) {
    if (busyIds.has(String(unit._id))) continue;
    unit.isAvailable = true;
    unit.status = 'idle';
    unit.lastUpdated = new Date();
    await unit.save();
    released += 1;
  }

  return released;
}

/** Ensures at least one ambulance is available near the patient for SOS demos. */
export async function ensureEmergencyAmbulanceNearPatient(lat: number, lng: number): Promise<void> {
  if (config.nodeEnv === 'test') return;

  const available = await AmbulanceUnit.countDocuments({ isAvailable: true, status: 'idle' });
  if (available > 0) return;

  await releaseStaleAmbulanceUnits();

  const stillAvailable = await AmbulanceUnit.countDocuments({ isAvailable: true, status: 'idle' });
  if (stillAvailable > 0) return;

  const driver = await User.findOne({ userType: 'ambulance', phone: '9876543216' });
  if (!driver) return;

  const nearLat = lat + 0.018;
  const nearLng = lng + 0.01;

  await AmbulanceUnit.findOneAndUpdate(
    { driverId: driver._id },
    {
      driverId: driver._id,
      vehicleNumber: 'MH-01-AB-1234',
      isAvailable: true,
      status: 'idle',
      lastUpdated: new Date(),
      currentLocation: {
        type: 'Point',
        coordinates: [nearLng, nearLat],
      },
    },
    { upsert: true }
  );

  await User.findByIdAndUpdate(driver._id, {
    'ambulanceDetails.availability': true,
  });
}

export interface EmergencyDispatchResolution {
  hospitalPayload: Record<string, unknown> | null;
  hospitalDbId?: Types.ObjectId;
  connectedViaRadiusKm: number | null;
  ambulances: AmbulanceWithDistance[];
  selection: NonNullable<ReturnType<typeof selectBestAmbulanceForPatient>>;
}

/**
 * Connects patient to nearest hospital in expanding tiers (2→4→8 km…),
 * then assigns the closest available ambulance. Falls back to global nearest hospital.
 */
export async function resolveEmergencyDispatch(
  patientLat: number,
  patientLng: number
): Promise<EmergencyDispatchResolution | null> {
  await releaseStaleAmbulanceUnits();

  const tierRadiiKm = [2, 4, 8, 15, 25, 50, 100];

  for (const radiusKm of tierRadiiKm) {
    const { hospitals } = await findNearbyHospitalsUnified(patientLat, patientLng, radiusKm);
    const inTier = hospitals.filter((h) => h.distanceMeters <= radiusKm * 1000);
    if (inTier.length === 0) continue;

    await ensureEmergencyAmbulanceNearPatient(patientLat, patientLng);
    const ambulances = await findNearestAvailableAmbulancesWithFallback(patientLat, patientLng);
    if (ambulances.length === 0) continue;

    const nearest = inTier[0];
    const selection = selectBestAmbulanceForPatient(ambulances, patientLat, patientLng);
    if (!selection) continue;

    const hospitalPayload = {
      ...unifiedHospitalToPayload(nearest),
      connectionTierKm: radiusKm,
      connectionMessage: `Connected via nearest hospital within ${radiusKm} km`,
    };

    return {
      hospitalPayload,
      hospitalDbId:
        nearest.source === 'database' ? new Types.ObjectId(nearest._id) : undefined,
      connectedViaRadiusKm: radiusKm,
      ambulances,
      selection,
    };
  }

  await ensureEmergencyAmbulanceNearPatient(patientLat, patientLng);
  const ambulances = await findNearestAvailableAmbulancesWithFallback(patientLat, patientLng);
  if (ambulances.length === 0) return null;

  const selection = selectBestAmbulanceForPatient(ambulances, patientLat, patientLng);
  if (!selection) return null;

  const global = await findNearestHospitalGlobally(patientLat, patientLng);
  let hospitalPayload: Record<string, unknown> | null = null;
  let hospitalDbId: Types.ObjectId | undefined;

  if (global) {
    hospitalPayload = {
      ...formatHospitalResponse(global.hospital, global.distanceMeters),
      connectionTierKm: null,
      connectionMessage: 'Connected to nearest emergency hospital from your location',
    };
    hospitalDbId = global.hospital._id;
  }

  return {
    hospitalPayload,
    hospitalDbId,
    connectedViaRadiusKm: null,
    ambulances,
    selection,
  };
}

export async function findNearbyHospitals(
  lat: number,
  lng: number,
  radiusKm = 10
): Promise<HospitalWithDistance[]> {
  try {
    const point = toGeoPoint(lat, lng);

    const hospitals = await Hospital.aggregate<
      IHospital & { distanceMeters: number }
    >([
      {
        $geoNear: {
          near: point,
          distanceField: 'distanceMeters',
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: { isActive: true, emergencyAvailable: true, location: { $exists: true } },
        },
      },
      { $limit: 50 },
    ]);

    if (hospitals.length > 0) {
      return hospitals.map((row) => ({
        hospital: row as unknown as IHospital,
        distanceKm: row.distanceMeters / 1000,
        distanceMeters: Math.round(row.distanceMeters),
      }));
    }

    const fallback = await Hospital.find({
      isActive: true,
      emergencyAvailable: true,
      'coordinates.lat': { $exists: true },
      'coordinates.lng': { $exists: true },
    }).limit(50);

    const withDistance: HospitalWithDistance[] = [];

    for (const h of fallback) {
      const coords = hospitalCoords(h);
      if (!coords) continue;
      const distanceKm = calculateDistance(lat, lng, coords.lat, coords.lng);
      if (distanceKm > radiusKm) continue;
      withDistance.push({
        hospital: h,
        distanceKm,
        distanceMeters: Math.round(distanceKm * 1000),
      });
    }

    return withDistance.sort((a, b) => a.distanceMeters - b.distanceMeters);
  } catch (err) {
    console.error('findNearbyHospitals failed:', err);
    return [];
  }
}

/** MongoDB hospitals near a point (seed / partner facilities). */
export async function findNearbyHospitalsFromDb(
  lat: number,
  lng: number,
  radiusKm = 10
): Promise<HospitalWithDistance[]> {
  return findNearbyHospitals(lat, lng, radiusKm);
}

/**
 * Nearest hospitals for emergency flows — Google Places worldwide when configured,
 * merged with LifeCare database hospitals.
 */
export async function findNearbyHospitalsUnified(
  lat: number,
  lng: number,
  radiusKm = 25
): Promise<{ hospitals: UnifiedNearbyHospital[]; source: 'google_places' | 'database' | 'mixed' | 'openstreetmap' }> {
  const merged = new Map<string, UnifiedNearbyHospital>();
  let usedGoogle = false;
  let usedDb = false;
  let usedOsm = false;

  if (isGooglePlacesConfigured()) {
    try {
      let places = await searchNearbyPlaces(lat, lng, radiusKm * 1000, 'hospital');
      places = await enrichPlacesWithPhones(places, 8);
      usedGoogle = true;
      for (const place of places) {
        merged.set(`g:${place.place_id}`, {
          _id: place.place_id,
          name: place.name,
          address: place.address,
          phone: place.phone,
          specialties: place.specialtyTags,
          emergencyAvailable: place.isEmergency,
          coordinates: place.coordinates,
          distanceMeters: place.distanceMeters,
          source: 'google_places',
          googlePlaceId: place.place_id,
        });
      }
    } catch (err) {
      console.error('Google Places nearby search failed:', err);
    }
  }

  if (!usedGoogle || merged.size === 0) {
    try {
      const osmRows = await searchOsmHospitals(lat, lng, radiusKm * 1000);
      if (osmRows.length > 0) usedOsm = true;
      for (const row of osmRows) {
        merged.set(`o:${row._id}`, { ...row });
      }
    } catch (err) {
      console.error('OpenStreetMap hospital search failed:', err);
    }
  }

  const dbRows = await findNearbyHospitalsFromDb(lat, lng, radiusKm).catch((err) => {
    console.error('Database nearby hospital search failed:', err);
    return [] as HospitalWithDistance[];
  });
  if (dbRows.length > 0) usedDb = true;

  for (const row of dbRows) {
    const formatted = formatHospitalResponse(row.hospital, row.distanceMeters);
    const id = String(row.hospital._id);
    const nearDup = [...merged.values()].some(
      (h) =>
        h.source === 'google_places' &&
        h.coordinates &&
        formatted.coordinates &&
        calculateDistance(
          h.coordinates.lat,
          h.coordinates.lng,
          formatted.coordinates.lat,
          formatted.coordinates.lng
        ) < 0.15
    );
    if (nearDup) continue;
    merged.set(`d:${id}`, {
      _id: id,
      name: formatted.name,
      address: formatted.address ?? '',
      phone: formatted.phone ?? null,
      city: formatted.city,
      state: formatted.state,
      specialties: formatted.specialties,
      emergencyAvailable: formatted.emergencyAvailable,
      coordinates: formatted.coordinates,
      distanceMeters: formatted.distanceMeters,
      source: 'database',
    });
  }

  const hospitals = [...merged.values()].sort((a, b) => a.distanceMeters - b.distanceMeters);
  const source: 'google_places' | 'database' | 'mixed' | 'openstreetmap' =
    usedGoogle && usedDb ? 'mixed' : usedGoogle ? 'google_places' : usedOsm && usedDb ? 'mixed' : usedOsm ? 'openstreetmap' : 'database';

  return { hospitals, source };
}

export function formatHospitalResponse(hospital: IHospital, distanceMeters: number) {
  const coords = hospitalCoords(hospital);
  return {
    _id: hospital._id,
    name: hospital.name,
    address: hospital.address,
    phone: hospital.phone ?? null,
    city: hospital.city,
    state: hospital.state,
    specialties: hospital.specialties,
    emergencyAvailable: hospital.emergencyAvailable,
    coordinates: coords,
    distanceMeters,
  };
}

export function formatAmbulanceResponse(
  unit: IAmbulanceUnit,
  distanceMeters: number,
  etaMinutes?: number
) {
  const [lng, lat] = unit.currentLocation.coordinates;
  const driver = unit.driverId as unknown as {
    _id?: Types.ObjectId;
    profile?: { firstName?: string; lastName?: string };
    phone?: string;
  };

  return {
    _id: unit._id,
    vehicleNumber: unit.vehicleNumber,
    status: unit.status,
    isAvailable: unit.isAvailable,
    currentLocation: { lat, lng },
    distanceMeters,
    etaMinutes: etaMinutes ?? null,
    driver: driver?._id
      ? {
          _id: driver._id,
          name: [driver.profile?.firstName, driver.profile?.lastName].filter(Boolean).join(' '),
          phone: driver.phone ?? null,
        }
      : null,
  };
}

export function getDriverName(unit: IAmbulanceUnit): string {
  const driver = unit.driverId as unknown as {
    profile?: { firstName?: string; lastName?: string };
  };
  return [driver?.profile?.firstName, driver?.profile?.lastName].filter(Boolean).join(' ') || 'Driver';
}

export async function findEmergencyRequestByIdentifier(id: string) {
  if (/^[a-f\d]{24}$/i.test(id)) {
    const byObjectId = await EmergencyRequest.findById(id);
    if (byObjectId) return byObjectId;
  }
  return EmergencyRequest.findOne({ requestId: id });
}

export async function findActiveEmergencyForAmbulance(ambulanceId: string) {
  return EmergencyRequest.findOne({
    assignedAmbulanceId: ambulanceId,
    status: { $in: ['searching', 'dispatched', 'arrived', 'pickedUp', 'atHospital'] },
  }).sort({ requestedAt: -1 });
}

export async function recalculateLiveEta(request: IEmergencyRequest) {
  if (!request.assignedAmbulanceId) {
    return null;
  }

  const unit = await AmbulanceUnit.findById(request.assignedAmbulanceId).populate(
    'driverId',
    'profile phone'
  );
  if (!unit) return null;

  const ambulance = unitCoords(unit);
  const patient = patientCoords(request);
  const eta = calculateETA(ambulance.lat, ambulance.lng, patient.lat, patient.lng);
  const estimatedArrival = new Date(Date.now() + eta.etaMinutes * 60 * 1000);

  return {
    requestId: request.requestId,
    status: request.status,
    isDelayed: request.isDelayed,
    calculatedETA: eta.etaMinutes,
    estimatedArrival,
    distanceKm: eta.distanceKm,
    adjustedDistanceKm: eta.adjustedDistanceKm,
    trafficMultiplier: eta.trafficMultiplier,
    ambulanceLocation: ambulance,
    patientLocation: patient,
    assignedAmbulance: formatAmbulanceResponse(unit, Math.round(eta.distanceKm * 1000), eta.etaMinutes),
    recalculatedAt: new Date().toISOString(),
  };
}

export async function getPatientPhone(patientId: Types.ObjectId | string): Promise<string | null> {
  const user = await User.findById(patientId).select('phone');
  return user?.phone ?? null;
}
