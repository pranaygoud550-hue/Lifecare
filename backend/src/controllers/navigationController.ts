import { type Response } from 'express';
import { asyncHandler } from '../middleware/validate.js';
import {
  getDirectionsRoute,
  etaMinutesFromDirections,
  isGoogleDirectionsConfigured,
  type NavigationMode,
} from '../services/googleDirectionsService.js';
import {
  findEmergencyRequestByIdentifier,
  recalculateLiveEta,
  unitCoords,
} from '../services/emergencyService.js';
import { AmbulanceUnit } from '../models/index.js';

const MODES = new Set<NavigationMode>(['driving', 'walking', 'ambulance']);

function parseMode(raw: unknown): NavigationMode {
  const mode = String(raw ?? 'driving').toLowerCase() as NavigationMode;
  return MODES.has(mode) ? mode : 'driving';
}

export const getNavigationRoute = asyncHandler(async (req, res: Response) => {
  const { originLat, originLng, destLat, destLng, mode: rawMode } = req.body as {
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
    mode?: NavigationMode;
  };

  const mode = parseMode(rawMode);

  if (!isGoogleDirectionsConfigured()) {
    res.status(503).json({
      success: false,
      message: 'GOOGLE_MAPS_API_KEY is not configured',
    });
    return;
  }

  const route = await getDirectionsRoute(originLat, originLng, destLat, destLng, mode);

  res.json({
    success: true,
    data: {
      distance: route.distance,
      duration: route.duration,
      durationInTraffic: route.durationInTraffic ?? route.duration,
      durationSeconds: route.durationSeconds,
      durationInTrafficSeconds: route.durationInTrafficSeconds ?? route.durationSeconds,
      steps: route.steps.map((s) => ({
        instruction: s.instruction,
        distance: s.distance,
        duration: s.duration,
        maneuver: s.maneuver,
      })),
      polyline: route.polyline,
      decodedPath: route.decodedPath,
      warnings: route.warnings,
      mode: mode === 'ambulance' ? 'ambulance' : mode,
    },
  });
});

export const getNavigationEta = asyncHandler(async (req, res: Response) => {
  const requestId = String(req.query.requestId ?? req.query.id ?? '');
  if (!requestId) {
    res.status(400).json({ success: false, message: 'requestId is required' });
    return;
  }

  const request = await findEmergencyRequestByIdentifier(requestId);
  if (!request) {
    res.status(404).json({ success: false, message: 'Emergency request not found' });
    return;
  }

  if (req.user) {
    const isPatient = String(request.patientId) === req.user.userId;
    const isAdmin = req.user.userType === 'admin';
    let isAssignedDriver = false;

    if (request.assignedAmbulanceId) {
      const unit = await AmbulanceUnit.findById(request.assignedAmbulanceId).select('driverId');
      isAssignedDriver = unit ? String(unit.driverId) === req.user.userId : false;
    }

    if (!isPatient && !isAdmin && !isAssignedDriver) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }
  }

  const liveEta = await recalculateLiveEta(request);
  if (!liveEta?.assignedAmbulance?.currentLocation) {
    res.status(404).json({ success: false, message: 'Ambulance location unavailable' });
    return;
  }

  const unit = await AmbulanceUnit.findById(request.assignedAmbulanceId);
  if (!unit) {
    res.status(404).json({ success: false, message: 'Ambulance not found' });
    return;
  }

  const ambulance = unitCoords(unit);
  const [patientLng, patientLat] = request.patientLocation.coordinates;

  let navigation: Awaited<ReturnType<typeof getDirectionsRoute>> | null = null;
  if (isGoogleDirectionsConfigured()) {
    try {
      navigation = await getDirectionsRoute(ambulance.lat, ambulance.lng, patientLat, patientLng, 'ambulance');
    } catch {
      navigation = null;
    }
  }

  const calculatedETA = navigation
    ? etaMinutesFromDirections(navigation)
    : (liveEta.calculatedETA ?? null);

  res.json({
    success: true,
    data: {
      requestId: request.requestId,
      status: request.status,
      calculatedETA,
      estimatedArrival: liveEta.estimatedArrival,
      ambulanceLocation: ambulance,
      patientLocation: { lat: patientLat, lng: patientLng },
      distance: navigation?.distance ?? `${liveEta.distanceKm?.toFixed(1) ?? '—'} km`,
      duration: navigation?.durationInTraffic ?? navigation?.duration ?? `${calculatedETA ?? '—'} mins`,
      durationInTraffic: navigation?.durationInTraffic ?? null,
      polyline: navigation?.polyline ?? null,
      decodedPath: navigation?.decodedPath ?? null,
      steps: navigation?.steps?.slice(0, 3).map((s) => s.instruction) ?? [],
      warnings: navigation?.warnings ?? [],
    },
  });
});
