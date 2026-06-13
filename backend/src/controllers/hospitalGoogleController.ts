import { type Response, type NextFunction, type Router } from 'express';
import { asyncHandler } from '../middleware/validate.js';
import {
  getPlaceDetails,
  searchNearbyPlaces,
  isGooglePlacesConfigured,
  type PlaceSearchType,
} from '../services/googlePlacesService.js';
import { recommendHospitalForPatient } from '../services/hospitalRecommendationService.js';
import { findNearbyHospitals, formatHospitalResponse } from '../services/emergencyService.js';
import {
  getDirectionsRoute,
  isGoogleDirectionsConfigured,
} from '../services/googleDirectionsService.js';

const VALID_TYPES = new Set<PlaceSearchType>([
  'hospital',
  'clinic',
  'pharmacy',
  'diagnostic',
  'all',
]);

function parsePlaceType(raw: unknown): PlaceSearchType {
  const value = String(raw ?? 'hospital').toLowerCase();
  if (value === 'clinic' || value === 'doctor') return 'clinic';
  if (value === 'diagnostic' || value === 'diagnostic_center') return 'diagnostic';
  if (VALID_TYPES.has(value as PlaceSearchType)) return value as PlaceSearchType;
  return 'hospital';
}

function fallbackMongoHospitals(lat: number, lng: number, radiusKm: number) {
  return findNearbyHospitals(lat, lng, radiusKm).then((rows) =>
    rows.map((row) => {
      const coords = row.hospital.location?.coordinates;
      const lngCoord = coords?.[0] ?? 0;
      const latCoord = coords?.[1] ?? 0;
      const formatted = formatHospitalResponse(row.hospital, row.distanceMeters);
      return {
        place_id: String(row.hospital._id),
        name: formatted.name,
        address: formatted.address ?? '',
        phone: formatted.phone ?? null,
        distance: `${(row.distanceMeters / 1000).toFixed(1)} km`,
        distanceMeters: row.distanceMeters,
        rating: null,
        isOpen: null,
        isEmergency: Boolean(formatted.emergencyAvailable),
        coordinates: formatted.coordinates ?? { lat: latCoord, lng: lngCoord },
        photo_url: null,
        types: ['hospital'],
        specialtyTags: formatted.specialties ?? [],
        source: 'database' as const,
      };
    })
  );
}

export const getNearbyGooglePlaces = asyncHandler(async (req, res: Response) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = Number(req.query.radius ?? 5);
  const type = parsePlaceType(req.query.type);
  const sort = String(req.query.sort ?? 'distance');
  const openNow = req.query.openNow === 'true';

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ success: false, message: 'lat and lng are required' });
    return;
  }

  if (!isGooglePlacesConfigured()) {
    const hospitals = await fallbackMongoHospitals(lat, lng, radiusKm).catch(() => []);
    res.json({
      success: true,
      data: {
        count: hospitals.length,
        radiusKm,
        source: 'database',
        message: 'Configure GOOGLE_PLACES_API_KEY for live Google Places data',
        hospitals,
      },
    });
    return;
  }

  try {
    let hospitals = await searchNearbyPlaces(lat, lng, radiusKm * 1000, type);

    if (openNow) {
      hospitals = hospitals.filter((h) => h.isOpen === true);
    }

    if (sort === 'rating') {
      hospitals.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sort === 'open') {
      hospitals.sort((a, b) => Number(b.isOpen === true) - Number(a.isOpen === true));
    }

    res.json({
      success: true,
      data: {
        count: hospitals.length,
        radiusKm,
        source: 'google_places',
        patientLocation: { lat, lng },
        hospitals,
      },
    });
  } catch (err) {
    console.error('Google Places nearby search failed:', err);
    const hospitals = await fallbackMongoHospitals(lat, lng, radiusKm).catch(() => []);
    res.json({
      success: true,
      data: {
        count: hospitals.length,
        radiusKm,
        source: 'database',
        message: 'Google Places unavailable — showing database hospitals only',
        hospitals,
      },
    });
  }
});

export const getGooglePlaceDetails = asyncHandler(async (req, res: Response) => {
  const placeId = String(req.params.place_id);

  if (!isGooglePlacesConfigured()) {
    res.status(503).json({
      success: false,
      message: 'GOOGLE_PLACES_API_KEY is not configured',
    });
    return;
  }

  const details = await getPlaceDetails(placeId);
  res.json({ success: true, data: details });
});

export const getHospitalRoutePreview = asyncHandler(async (req, res: Response) => {
  const originLat = Number(req.query.originLat);
  const originLng = Number(req.query.originLng);
  const destLat = Number(req.query.destLat);
  const destLng = Number(req.query.destLng);

  if (
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLng) ||
    !Number.isFinite(destLat) ||
    !Number.isFinite(destLng)
  ) {
    res.status(400).json({ success: false, message: 'originLat, originLng, destLat, destLng are required' });
    return;
  }

  if (!isGoogleDirectionsConfigured()) {
    res.json({
      success: true,
      data: {
        source: 'straight_line',
        decodedPath: [
          [originLat, originLng],
          [destLat, destLng],
        ],
      },
    });
    return;
  }

  try {
    const route = await getDirectionsRoute(originLat, originLng, destLat, destLng, 'driving');
    res.json({
      success: true,
      data: {
        source: 'google_directions',
        distance: route.distance,
        duration: route.duration,
        durationInTraffic: route.durationInTraffic ?? route.duration,
        decodedPath: route.decodedPath,
        polyline: route.polyline,
      },
    });
  } catch (err) {
    console.error('Route preview failed:', err);
    res.json({
      success: true,
      data: {
        source: 'straight_line',
        decodedPath: [
          [originLat, originLng],
          [destLat, destLng],
        ],
      },
    });
  }
});

export const recommendSmartHospital = asyncHandler(async (req, res: Response) => {
  const patientId = String(req.query.patientId ?? req.user!.userId);
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = Number(req.query.radius ?? 15);

  if (req.user!.userType === 'patient' && patientId !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Cannot view another patient scan context' });
    return;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ success: false, message: 'lat and lng are required' });
    return;
  }

  const result = await recommendHospitalForPatient(patientId, lat, lng, radiusKm);
  res.json({ success: true, data: result });
});
