import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AmbulanceUnit, EmergencyRequest, User } from '../models/index.js';
import { config } from '../config/index.js';
import { asyncHandler } from '../middleware/validate.js';
import { generateEmergencyRequestId } from '../utils/helpers.js';
import { emitToUser, emitToRoom, getIO } from '../services/socketService.js';
import {
  clearDriverAcceptTimeout,
  emergencyRoom as buildEmergencyRoom,
  scheduleDriverAcceptTimeout,
  markDriverArrived,
} from '../services/emergencyRealtimeService.js';
import { startEmergencyDemoFlow, stopLocationSimulation } from '../services/emergencyDemoService.js';
import type { EmergencyType } from '../models/EmergencyRequest.js';
import {
  findNearestAvailableAmbulancesWithFallback,
  findNearestHospitalGlobally,
  findNearbyHospitalsUnified,
  formatAmbulanceResponse,
  formatHospitalResponse,
  findActiveEmergencyForAmbulance,
  findEmergencyRequestByIdentifier,
  recalculateLiveEta,
  getDriverName,
  unitCoords,
  resolveEmergencyDispatch,
} from '../services/emergencyService.js';
import { recommendHospitalForPatient } from '../services/hospitalRecommendationService.js';
import { isGooglePlacesConfigured } from '../services/googlePlacesService.js';
import { geocodeAddress, geocodePlaceId, reverseGeocode } from '../services/geocodeService.js';
import {
  searchAddressSuggestions,
  isAddressAutocompleteConfigured,
} from '../services/addressAutocompleteService.js';
import {
  areaToDisplayName,
  isWithinHyderabadServiceArea,
  resolveHyderabadArea,
  searchHyderabadAreas,
  nearestHyderabadArea,
  HYDERABAD_SERVICE_LABEL,
} from '../data/hyderabadAreas.js';
import { notifyEmergencySosCreated } from '../services/emergencyNotificationService.js';

function resolvePatientId(body: { patientId?: string; userId?: string }): string | null {
  return body.patientId ?? body.userId ?? null;
}

function buildTrackLink(requestId: string): string {
  return `${config.frontendUrl}/track/${requestId}`;
}

function emergencyRoom(requestId: string): string {
  return buildEmergencyRoom(requestId);
}

export const createEmergencySos = asyncHandler(async (req: Request, res: Response) => {
  const { patientLat, patientLng, emergencyType } = req.body as {
    patientLat: number;
    patientLng: number;
    emergencyType: EmergencyType;
    patientId?: string;
    userId?: string;
  };

  const patientId = resolvePatientId(req.body);
  if (!patientId) {
    res.status(400).json({ success: false, message: 'patientId is required' });
    return;
  }

  if (req.user && req.user.userId !== patientId) {
    res.status(403).json({ success: false, message: 'patientId must match the authenticated user' });
    return;
  }

  if (!isWithinHyderabadServiceArea(patientLat, patientLng)) {
    res.status(400).json({
      success: false,
      message: `Emergency SOS is available only in ${HYDERABAD_SERVICE_LABEL}. Please select a Hyderabad area.`,
    });
    return;
  }

  const dispatchPlan = await resolveEmergencyDispatch(patientLat, patientLng);
  if (!dispatchPlan) {
    res.status(503).json({
      success: false,
      message: 'No ambulances are available right now. Call 108 or try again shortly.',
    });
    return;
  }

  const { hospitalPayload: tierHospitalPayload, hospitalDbId, connectedViaRadiusKm, ambulances: nearbyAmbulances, selection } =
    dispatchPlan;

  const assigned = selection.selected;
  const { eta, isDelayed, triedCount } = selection;

  let nearestHospitalPayload: Record<string, unknown> | null = tierHospitalPayload;
  let smartRecommendation: Awaited<ReturnType<typeof recommendHospitalForPatient>> | null = null;
  let nearestHospitalResult: Awaited<ReturnType<typeof findNearestHospitalGlobally>> | null = null;

  if (isGooglePlacesConfigured()) {
    smartRecommendation = await recommendHospitalForPatient(patientId, patientLat, patientLng, 15);
    const rec = smartRecommendation.recommendation;
    const tierDist =
      typeof tierHospitalPayload?.distanceMeters === 'number'
        ? tierHospitalPayload.distanceMeters
        : null;

    if (rec && (!tierDist || rec.distanceMeters <= tierDist * 1.25)) {
      nearestHospitalPayload = {
        place_id: rec.place_id,
        name: rec.name,
        address: rec.address,
        phone: rec.phone,
        rating: rec.rating,
        emergencyAvailable: rec.isEmergency,
        coordinates: rec.coordinates,
        distanceMeters: rec.distanceMeters,
        photo_url: rec.photo_url,
        specialties: rec.specialtyTags,
        googlePlaceId: rec.place_id,
        recommendationReason: smartRecommendation.reason,
        scanContext: smartRecommendation.scanContext,
        connectionTierKm: connectedViaRadiusKm,
      };
    }
  }

  if (!nearestHospitalPayload && tierHospitalPayload) {
    nearestHospitalPayload = tierHospitalPayload;
  }

  if (!nearestHospitalPayload) {
    nearestHospitalResult = await findNearestHospitalGlobally(patientLat, patientLng);
    if (nearestHospitalResult) {
      nearestHospitalPayload = formatHospitalResponse(
        nearestHospitalResult.hospital,
        nearestHospitalResult.distanceMeters
      );
    }
  }
  const requestId = generateEmergencyRequestId();
  const now = new Date();
  const estimatedArrival = new Date(now.getTime() + eta.etaMinutes * 60 * 1000);

  const emergencyRequest = await EmergencyRequest.create({
    requestId,
    patientId: new Types.ObjectId(patientId),
    emergencyType,
    patientLocation: {
      type: 'Point',
      coordinates: [patientLng, patientLat],
    },
    status: 'searching',
    requestedAt: now,
    assignedAmbulanceId: assigned.unit._id,
    hospitalId: hospitalDbId ?? nearestHospitalResult?.hospital._id,
    candidateAmbulanceIds: nearbyAmbulances.map((a) => a.unit._id),
    calculatedETA: eta.etaMinutes,
    isDelayed,
    distanceToAmbulanceKm: eta.distanceKm,
    distanceToHospitalKm: nearestHospitalPayload
      ? Number(nearestHospitalPayload.distanceMeters) / 1000
      : nearestHospitalResult?.distanceKm,
  });

  await AmbulanceUnit.findByIdAndUpdate(assigned.unit._id, {
    isAvailable: false,
    lastUpdated: now,
  });

  const driverId = String(
    (assigned.unit.driverId as { _id?: Types.ObjectId })._id ?? assigned.unit.driverId
  );
  const trackLink = buildTrackLink(emergencyRequest.requestId);

  void notifyEmergencySosCreated({
    patientId,
    requestId: emergencyRequest.requestId,
    lat: patientLat,
    lng: patientLng,
    etaMinutes: eta.etaMinutes,
    trackLink,
    hospitalName:
      typeof nearestHospitalPayload?.name === 'string' ? nearestHospitalPayload.name : undefined,
  });

  await scheduleDriverAcceptTimeout(getIO(), emergencyRequest.requestId);

  emitToUser(driverId, 'emergency:new', {
    requestId: emergencyRequest.requestId,
    emergencyRequestId: emergencyRequest._id,
    emergencyType,
    patientLocation: { lat: patientLat, lng: patientLng },
    estimatedArrival,
    calculatedETA: eta.etaMinutes,
    isDelayed,
    distanceMeters: assigned.distanceMeters,
    acceptDeadlineSeconds: 60,
    nearestHospital: nearestHospitalPayload,
  });

  emitToUser(patientId, 'emergency:searching', {
    requestId: emergencyRequest.requestId,
    status: 'searching',
    message: nearestHospitalPayload
      ? `Connecting you to ${nearestHospitalPayload.name as string} and nearest ambulance…`
      : 'Connecting you to the nearest ambulance…',
    calculatedETA: eta.etaMinutes,
    estimatedArrival,
    isDelayed,
    nearestHospital: nearestHospitalPayload,
    assignedAmbulance: formatAmbulanceResponse(assigned.unit, assigned.distanceMeters, eta.etaMinutes),
    trackLink,
  });

  emitToRoom(emergencyRoom(emergencyRequest.requestId), 'emergency:statusUpdate', {
    requestId: emergencyRequest.requestId,
    status: 'searching',
    message: 'Waiting for ambulance driver to accept',
    calculatedETA: eta.etaMinutes,
    assignedAmbulance: formatAmbulanceResponse(assigned.unit, assigned.distanceMeters, eta.etaMinutes),
  });

  res.status(201).json({
    success: true,
    data: {
      requestId: emergencyRequest.requestId,
      status: emergencyRequest.status,
      estimatedArrival,
      calculatedETA: eta.etaMinutes,
      isDelayed,
      ambulancesEvaluated: triedCount,
      hospitalConnectionTierKm: connectedViaRadiusKm,
      nearestHospital: nearestHospitalPayload,
      smartRecommendation: smartRecommendation
        ? {
            reason: smartRecommendation.reason,
            scanContext: smartRecommendation.scanContext,
            alternatives: smartRecommendation.alternatives.slice(0, 3),
          }
        : null,
      assignedAmbulance: formatAmbulanceResponse(assigned.unit, assigned.distanceMeters, eta.etaMinutes),
      candidateAmbulances: nearbyAmbulances.map((a) =>
        formatAmbulanceResponse(a.unit, a.distanceMeters, a.eta.etaMinutes)
      ),
      trackLink,
    },
  });

  void startEmergencyDemoFlow(emergencyRequest.requestId);
});

export const getEmergencyEta = asyncHandler(async (req: Request, res: Response) => {
  const request = await findEmergencyRequestByIdentifier(String(req.params.id));
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
      res.status(403).json({ success: false, message: 'Not authorized to view this ETA' });
      return;
    }
  }

  const liveEta = await recalculateLiveEta(request);
  if (!liveEta) {
    res.status(404).json({ success: false, message: 'Assigned ambulance not found for this request' });
    return;
  }

  res.json({
    success: true,
    data: liveEta,
  });
});

export const cancelEmergencyRequest = asyncHandler(async (req: Request, res: Response) => {
  const request = await findEmergencyRequestByIdentifier(String(req.params.id));
  if (!request) {
    res.status(404).json({ success: false, message: 'Emergency request not found' });
    return;
  }

  const isPatient = req.user && String(request.patientId) === req.user.userId;
  const isAdmin = req.user?.userType === 'admin';
  if (!isPatient && !isAdmin) {
    res.status(403).json({ success: false, message: 'Not authorized to cancel this emergency' });
    return;
  }

  if (['completed', 'cancelled'].includes(request.status)) {
    res.status(400).json({ success: false, message: 'Emergency request is already closed' });
    return;
  }

  if (request.assignedAmbulanceId) {
    await AmbulanceUnit.findByIdAndUpdate(request.assignedAmbulanceId, {
      status: 'idle',
      isAvailable: true,
      lastUpdated: new Date(),
    });
  }

  clearDriverAcceptTimeout(request.requestId);
  stopLocationSimulation(request.requestId);

  request.status = 'cancelled';
  request.completedAt = new Date();
  await request.save();

  emitToUser(String(request.patientId), 'emergency:cancelled', {
    requestId: request.requestId,
  });

  res.json({
    success: true,
    data: {
      requestId: request.requestId,
      status: request.status,
    },
  });
});

export const getNearbyHospitals = asyncHandler(async (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  let radius = Number(req.query.radius ?? 15);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ success: false, message: 'Valid lat and lng are required' });
    return;
  }

  if (!isWithinHyderabadServiceArea(lat, lng)) {
    res.status(400).json({
      success: false,
      message: `Hospital search is limited to ${HYDERABAD_SERVICE_LABEL}. Pick a Hyderabad area.`,
    });
    return;
  }

  const tierRadii = [5, 8, 15, 25, 50].filter((r) => r >= Math.min(radius, 5));
  let hospitals: Awaited<ReturnType<typeof findNearbyHospitalsUnified>>['hospitals'] = [];
  let source: Awaited<ReturnType<typeof findNearbyHospitalsUnified>>['source'] = 'database';
  let usedRadius = radius;

  for (const r of tierRadii) {
    const result = await findNearbyHospitalsUnified(lat, lng, r);
    const inTier = result.hospitals.filter(
      (h) =>
        h.distanceMeters <= r * 1000 &&
        h.coordinates &&
        isWithinHyderabadServiceArea(h.coordinates.lat, h.coordinates.lng)
    );
    if (inTier.length > 0) {
      hospitals = inTier;
      source = result.source;
      usedRadius = r;
      break;
    }
  }

  if (hospitals.length === 0) {
    const expanded = await findNearbyHospitalsUnified(lat, lng, 50);
    hospitals = expanded.hospitals.filter(
      (h) =>
        h.coordinates && isWithinHyderabadServiceArea(h.coordinates.lat, h.coordinates.lng)
    );
    source = expanded.source;
    usedRadius = 50;
  }

  res.json({
    success: true,
    data: {
      count: hospitals.length,
      radiusKm: usedRadius,
      source,
      patientLocation: { lat, lng },
      hospitals,
    },
  });
});

export const searchHyderabadAreasHandler = asyncHandler(async (req: Request, res: Response) => {
  const q = String(req.query.q ?? '').trim();
  const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 50);
  const areas = searchHyderabadAreas(q, limit);
  res.json({ success: true, data: { areas, serviceLabel: HYDERABAD_SERVICE_LABEL } });
});

export const searchEmergencyAddresses = asyncHandler(async (req: Request, res: Response) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 2) {
    res.json({ success: true, data: { suggestions: [], areas: [], configured: isAddressAutocompleteConfigured() } });
    return;
  }

  const areas = searchHyderabadAreas(q, 8);
  let suggestions: Awaited<ReturnType<typeof searchAddressSuggestions>> = [];

  if (isAddressAutocompleteConfigured()) {
    try {
      suggestions = await searchAddressSuggestions(q);
    } catch (err) {
      console.error('Address autocomplete failed:', err);
    }
  }

  res.json({
    success: true,
    data: {
      suggestions,
      areas,
      configured: isAddressAutocompleteConfigured(),
      serviceLabel: HYDERABAD_SERVICE_LABEL,
    },
  });
});

export const reverseGeocodeEmergency = asyncHandler(async (req: Request, res: Response) => {
  const lat = parseFloat(String(req.query.lat ?? ''));
  const lng = parseFloat(String(req.query.lng ?? ''));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ success: false, message: 'lat and lng query parameters are required' });
    return;
  }

  if (!isWithinHyderabadServiceArea(lat, lng)) {
    res.status(400).json({
      success: false,
      message: `Your GPS location is outside ${HYDERABAD_SERVICE_LABEL}. Enter your address manually.`,
    });
    return;
  }

  const reversed = await reverseGeocode(lat, lng);
  const nearest = nearestHyderabadArea(lat, lng);

  if (reversed) {
    res.json({
      success: true,
      data: {
        lat: reversed.lat,
        lng: reversed.lng,
        displayName: reversed.displayName,
        placeId: reversed.placeId,
        areaId: nearest?.id,
        zone: nearest?.zone,
      },
    });
    return;
  }

  if (nearest) {
    res.json({
      success: true,
      data: {
        lat,
        lng,
        displayName: areaToDisplayName(nearest),
        areaId: nearest.id,
        zone: nearest.zone,
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      lat,
      lng,
      displayName: `Your location (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
    },
  });
});

export const geocodeEmergencyAddress = asyncHandler(async (req: Request, res: Response) => {
  const address = String(req.query.address ?? '').trim();
  const placeId = String(req.query.placeId ?? '').trim();

  if (!address && !placeId) {
    res.status(400).json({ success: false, message: 'address or placeId query parameter is required' });
    return;
  }

  if (placeId) {
    let fromPlace = await geocodePlaceId(placeId);
    if (!fromPlace && address) {
      fromPlace = await geocodeAddress(address);
    }
    if (!fromPlace) {
      const localFromText = resolveHyderabadArea(address || placeId);
      if (localFromText) {
        res.json({
          success: true,
          data: {
            lat: localFromText.lat,
            lng: localFromText.lng,
            displayName: areaToDisplayName(localFromText),
            areaId: localFromText.id,
            zone: localFromText.zone,
          },
        });
        return;
      }
      res.status(404).json({
        success: false,
        message: `Could not resolve that address. Pick an area below or add flat/building details.`,
      });
      return;
    }
    if (!isWithinHyderabadServiceArea(fromPlace.lat, fromPlace.lng)) {
      res.status(404).json({
        success: false,
        message: `That location is outside ${HYDERABAD_SERVICE_LABEL}. Pick an address within the service area.`,
      });
      return;
    }
    res.json({
      success: true,
      data: {
        lat: fromPlace.lat,
        lng: fromPlace.lng,
        displayName: fromPlace.displayName,
        placeId: fromPlace.placeId,
      },
    });
    return;
  }

  const local = resolveHyderabadArea(address);
  if (local) {
    res.json({
      success: true,
      data: {
        lat: local.lat,
        lng: local.lng,
        displayName: areaToDisplayName(local),
        areaId: local.id,
        zone: local.zone,
      },
    });
    return;
  }

  const lower = address.toLowerCase();
  if (/warangal|bengaluru|bangalore|mumbai|delhi|chennai|vizag|vijayawada|pune/i.test(lower)) {
    res.status(400).json({
      success: false,
      message: `Only ${HYDERABAD_SERVICE_LABEL} is supported. Pick an area like Madhapur or Gachibowli.`,
    });
    return;
  }

  const result = await geocodeAddress(
    lower.includes('hyderabad') || lower.includes('telangana')
      ? address
      : `${address}, Hyderabad, Telangana`
  );
  if (result && isWithinHyderabadServiceArea(result.lat, result.lng)) {
    res.json({ success: true, data: result });
    return;
  }

  const nearest = result
    ? nearestHyderabadArea(result.lat, result.lng)
    : resolveHyderabadArea(address.split(',')[0]?.trim() ?? address);

  if (nearest && isWithinHyderabadServiceArea(nearest.lat, nearest.lng)) {
    res.json({
      success: true,
      data: {
        lat: nearest.lat,
        lng: nearest.lng,
        displayName: areaToDisplayName(nearest),
        areaId: nearest.id,
        zone: nearest.zone,
      },
    });
    return;
  }

  res.status(404).json({
    success: false,
    message: `Could not find that address in ${HYDERABAD_SERVICE_LABEL}. Try a nearby landmark or colony name.`,
  });
});

export const updateAmbulanceLocation = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng, ambulanceId } = req.body as {
    lat: number;
    lng: number;
    ambulanceId: string;
  };

  const unit = await AmbulanceUnit.findById(ambulanceId);
  if (!unit) {
    res.status(404).json({ success: false, message: 'Ambulance unit not found' });
    return;
  }

  if (req.user && String(unit.driverId) !== req.user.userId) {
    res.status(403).json({ success: false, message: 'You can only update your assigned ambulance' });
    return;
  }

  unit.currentLocation = {
    type: 'Point',
    coordinates: [lng, lat],
  };
  unit.lastUpdated = new Date();
  await unit.save();

  const activeRequest = await findActiveEmergencyForAmbulance(ambulanceId);
  if (activeRequest) {
    const liveEta = await recalculateLiveEta(activeRequest);
    const payload = {
      requestId: activeRequest.requestId,
      ambulanceId,
      location: { lat, lng },
      timestamp: unit.lastUpdated.toISOString(),
      calculatedETA: liveEta?.calculatedETA ?? null,
      estimatedArrival: liveEta?.estimatedArrival ?? null,
    };

    emitToUser(String(activeRequest.patientId), 'ambulance:locationUpdate', payload);
    emitToRoom(emergencyRoom(activeRequest.requestId), 'ambulance:locationUpdate', payload);
    emitToRoom(emergencyRoom(activeRequest.requestId), 'emergency:statusUpdate', {
      requestId: activeRequest.requestId,
      status: activeRequest.status,
      calculatedETA: liveEta?.calculatedETA ?? null,
    });
  }

  res.json({
    success: true,
    data: {
      ambulanceId: unit._id,
      location: { lat, lng },
      lastUpdated: unit.lastUpdated,
      trackingRequestId: activeRequest?.requestId ?? null,
      liveEta: activeRequest ? await recalculateLiveEta(activeRequest) : null,
    },
  });
});

export const getDriverActiveRequest = asyncHandler(async (req: Request, res: Response) => {
  const unit = await AmbulanceUnit.findOne({ driverId: req.user!.userId }).populate(
    'driverId',
    'profile phone email userType'
  );

  if (!unit) {
    res.json({ success: true, data: { unit: null, request: null } });
    return;
  }

  const request = await findActiveEmergencyForAmbulance(String(unit._id));
  if (!request) {
    res.json({
      success: true,
      data: {
        unit: {
          id: unit._id,
          vehicleNumber: unit.vehicleNumber,
          status: unit.status,
          isAvailable: unit.isAvailable,
          currentLocation: unitCoords(unit),
        },
        request: null,
      },
    });
    return;
  }

  const [lng, lat] = request.patientLocation.coordinates;
  const liveEta = await recalculateLiveEta(request);

  res.json({
    success: true,
    data: {
      unit: {
        id: unit._id,
        vehicleNumber: unit.vehicleNumber,
        status: unit.status,
        isAvailable: unit.isAvailable,
        currentLocation: unitCoords(unit),
      },
      request: {
        requestId: request.requestId,
        status: request.status,
        emergencyType: request.emergencyType,
        patientLocation: { lat, lng },
        requestedAt: request.requestedAt,
        dispatchedAt: request.dispatchedAt,
        calculatedETA: liveEta?.calculatedETA ?? request.calculatedETA,
        estimatedArrival: liveEta?.estimatedArrival ?? null,
        isDelayed: request.isDelayed,
        pickupOtp: request.status === 'arrived' ? request.pickupOtp : undefined,
        otpVerified: request.otpVerified,
        driver: {
          name: getDriverName(unit),
          phone: (unit.driverId as { phone?: string }).phone ?? null,
        },
      },
    },
  });
});

export const patchDriverAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { isAvailable } = req.body as { isAvailable: boolean };

  const unit = await AmbulanceUnit.findOne({ driverId: req.user!.userId });
  if (!unit) {
    res.status(404).json({ success: false, message: 'Ambulance unit not found for this driver' });
    return;
  }

  const activeRequest = await findActiveEmergencyForAmbulance(String(unit._id));
  if (!isAvailable && activeRequest) {
    res.status(400).json({
      success: false,
      message: 'Cannot go offline while an emergency request is active',
    });
    return;
  }

  unit.isAvailable = isAvailable;
  if (isAvailable && unit.status === 'idle') {
    unit.lastUpdated = new Date();
  }
  await unit.save();

  await User.findByIdAndUpdate(req.user!.userId, {
    'ambulanceDetails.availability': isAvailable,
  });

  res.json({
    success: true,
    data: {
      isAvailable: unit.isAvailable,
      status: unit.status,
    },
  });
});

export const markDriverArrivedRequest = asyncHandler(async (req: Request, res: Response) => {
  const result = await markDriverArrived(getIO(), String(req.params.id), req.user!.userId);
  if (!result.ok) {
    res.status(result.message?.includes('not assigned') ? 403 : 400).json({
      success: false,
      message: result.message ?? 'Could not mark arrived',
    });
    return;
  }
  res.json({
    success: true,
    data: { requestId: req.params.id, status: 'arrived', message: 'Ambulance marked as arrived' },
  });
});

export const verifyEmergencyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { otp } = req.body as { otp: string };
  const request = await findEmergencyRequestByIdentifier(String(req.params.id));
  if (!request) {
    res.status(404).json({ success: false, message: 'Emergency request not found' });
    return;
  }

  const unit = await AmbulanceUnit.findOne({ driverId: req.user!.userId });
  if (!unit || String(request.assignedAmbulanceId) !== String(unit._id)) {
    res.status(403).json({ success: false, message: 'You are not assigned to this emergency' });
    return;
  }

  if (request.status !== 'arrived') {
    res.status(400).json({ success: false, message: 'OTP can only be verified after arrival' });
    return;
  }

  if (!request.pickupOtp || request.pickupOtp !== String(otp).trim()) {
    res.status(400).json({ success: false, message: 'Invalid safety code' });
    return;
  }

  request.otpVerified = true;
  request.status = 'pickedUp';
  await request.save();

  const payload = {
    requestId: request.requestId,
    status: 'pickedUp' as const,
    message: 'Safety code verified — patient confirmed',
  };

  emitToUser(String(request.patientId), 'emergency:statusUpdate', payload);
  emitToRoom(emergencyRoom(request.requestId), 'emergency:statusUpdate', payload);

  res.json({ success: true, data: payload });
});
