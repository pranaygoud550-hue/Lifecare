import { Request, Response } from 'express';
import { TransportBooking, User } from '../models/index.js';
import type { ITransportBooking } from '../models/TransportBooking.js';
import { asyncHandler } from '../middleware/validate.js';
import {
  generateTransportId,
  generateTrackingToken,
  generatePickupOtp,
  calculateDistance,
} from '../utils/helpers.js';
import { findNearestDrivers } from '../services/transportMatchingService.js';
import {
  resolveDestinationHospital,
  initialDriverLocation,
  advanceTransportSimulation,
  buildHospitalMapPoint,
  etaMinutesBetween,
} from '../services/transportLiveTrackingService.js';
import { getIO, emitToUser } from '../services/socketService.js';
import { createNotification } from '../services/notificationService.js';

const VEHICLE_BASE_FARE: Record<string, number> = {
  basic_ambulance: 1200,
  medical_cab: 450,
  wheelchair_van: 650,
  bike_ambulance: 350,
  home_visit_doctor: 800,
  BLS: 1000,
  ALS: 2000,
  emergency: 1000,
};

function buildTrackingExpiry() {
  return new Date(Date.now() + 4 * 60 * 60 * 1000);
}

async function createTransportRequest(
  req: Request,
  res: Response,
  flowType: 'emergency_sos' | 'escort' | 'teleconsult_first' | 'scheduled',
  defaults: { vehicleType: string; severity?: string }
) {
  const {
    pickupLocation,
    triage,
    guestContact,
    patientDetails,
    destinationHospital,
    scheduledAt,
    conditionNotes,
    vehicleType = defaults.vehicleType,
  } = req.body;

  if (!pickupLocation?.coordinates?.lat || !pickupLocation?.coordinates?.lng) {
    res.status(400).json({ success: false, message: 'Valid pickup coordinates required' });
    return;
  }

  const resolvedHospital = await resolveDestinationHospital(
    pickupLocation.coordinates,
    destinationHospital
  );

  let searchRadiusKm = 10;
  let matches: Awaited<ReturnType<typeof findNearestDrivers>> = [];
  let expandedSearch = false;

  try {
    matches = await findNearestDrivers(pickupLocation.coordinates, vehicleType, searchRadiusKm);
    if (matches.length === 0) {
      searchRadiusKm = 20;
      expandedSearch = true;
      matches = await findNearestDrivers(pickupLocation.coordinates, vehicleType, searchRadiusKm);
    }
  } catch (err) {
    console.warn(
      'Driver matching failed; booking will continue without immediate assignment:',
      err instanceof Error ? err.message : err
    );
    matches = [];
  }

  const best = matches[0];
  const baseFare = VEHICLE_BASE_FARE[vehicleType] || 1000;
  const distanceCharges = best ? Math.round(best.distance * 25) : 0;
  const driverStart = best ? initialDriverLocation(pickupLocation.coordinates) : undefined;

  const booking = await TransportBooking.create({
    bookingId: generateTransportId(),
    flowType,
    patientId: req.user?.userId,
    guestContact,
    triage,
    vehicleType,
    pickupLocation,
    destinationHospital: resolvedHospital,
    patientDetails,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    conditionNotes,
    status: 'requested',
    statusHistory: [{ status: 'requested', timestamp: new Date(), location: pickupLocation.coordinates }],
    searchRadiusKm,
    charges: { baseFare, distanceCharges, total: baseFare + distanceCharges },
    trackingToken: generateTrackingToken(),
    trackingExpiresAt: buildTrackingExpiry(),
    otp: generatePickupOtp(),
    safety: { rideLoggedConsent: true },
    estimatedArrival: new Date(Date.now() + (best ? Math.ceil(best.distance * 4) : 15) * 60 * 1000),
    assignedDriverId: best?.driver._id,
    driverLocation: driverStart ? { ...driverStart, timestamp: new Date() } : undefined,
  });

  const io = getIO();

  if (best) {
    emitToUser(best.driver._id.toString(), 'transport:sos-request', {
      bookingId: booking._id,
      bookingRef: booking.bookingId,
      flowType,
      pickupLocation,
      patientDetails: booking.patientDetails,
      guestContact: booking.guestContact,
      triage: booking.triage,
      vehicleType,
      distanceKm: best.distance,
    });
    io.to(`driver-${best.driver._id}`).emit('transport:sos-request', {
      bookingId: booking._id,
      bookingRef: booking.bookingId,
      flowType,
      pickupLocation,
      distanceKm: best.distance,
    });
  } else {
    const drivers = await User.find({
      userType: 'ambulance',
      isActive: true,
      'ambulanceDetails.availability': true,
    }).limit(8);

    for (const driver of drivers) {
      emitToUser(driver._id.toString(), 'transport:sos-request', {
        bookingId: booking._id,
        bookingRef: booking.bookingId,
        flowType,
        pickupLocation,
      });
      io.to(`driver-${driver._id}`).emit('transport:sos-request', {
        bookingId: booking._id,
        bookingRef: booking.bookingId,
      });
    }
  }

  if (req.user?.userId) {
    await createNotification({
      userId: req.user.userId,
      type: 'ambulance',
      title: flowType === 'emergency_sos' ? 'Emergency help requested' : 'Transport booked',
      message: expandedSearch
        ? 'Searching wider area — estimated wait may be longer'
        : 'Finding nearest available help',
      data: { bookingId: booking._id },
    });
  }

  const populated = await TransportBooking.findById(booking._id).populate(
    'assignedDriverId',
    'profile ambulanceDetails'
  );

  res.status(201).json({
    success: true,
    data: {
      booking: populated,
      match: best
        ? {
            driverId: best.driver._id,
            driverName: best.driver.ambulanceDetails?.driverName || `${best.driver.profile.firstName} ${best.driver.profile.lastName}`,
            vehicleNumber: best.driver.ambulanceDetails?.vehicleNumber,
            phone: best.driver.phone,
            distanceKm: Math.round(best.distance * 10) / 10,
            rating: best.driver.ambulanceDetails?.rating,
            certifications: best.driver.ambulanceDetails?.certifications || [],
            policeVerified: best.driver.ambulanceDetails?.policeVerified,
          }
        : null,
      expandedSearch,
      trackingUrl: `/track/${booking.trackingToken}`,
    },
  });
}

export const requestTransport = asyncHandler(async (req: Request, res: Response) => {
  await createTransportRequest(req, res, 'escort', { vehicleType: req.body.vehicleType || 'medical_cab' });
});

export const requestEmergencySos = asyncHandler(async (req: Request, res: Response) => {
  await createTransportRequest(req, res, 'emergency_sos', { vehicleType: 'BLS' });
});

export const getTransportById = asyncHandler(async (req: Request, res: Response) => {
  const booking = await TransportBooking.findById(req.params.id).populate(
    'assignedDriverId',
    'profile ambulanceDetails phone'
  );
  if (!booking) {
    res.status(404).json({ success: false, message: 'Booking not found' });
    return;
  }

  const isOwner =
    booking.patientId?.toString() === req.user?.userId ||
    booking.assignedDriverId?._id?.toString() === req.user?.userId ||
    req.user?.userType === 'admin';

  if (!isOwner && req.user) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  res.json({ success: true, data: booking });
});

function buildTrackResponse(booking: ITransportBooking | null) {
  if (!booking) return null;

  const driver = booking.assignedDriverId as unknown as {
    profile?: { firstName: string; lastName: string };
    ambulanceDetails?: {
      driverName?: string;
      vehicleNumber?: string;
      currentLocation?: { lat: number; lng: number };
      rating?: number;
    };
    phone?: string;
  } | null;

  const patientLocation = booking.pickupLocation.coordinates;
  const driverLoc = booking.driverLocation || driver?.ambulanceDetails?.currentLocation;
  const hospitalLocation = buildHospitalMapPoint(booking);

  let etaMinutes: number | null = null;
  let etaToHospital: number | null = null;

  if (driverLoc) {
    const target =
      ['patient-picked-up', 'en-route-to-hospital', 'completed'].includes(booking.status) &&
      hospitalLocation
        ? hospitalLocation
        : patientLocation;
    etaMinutes = etaMinutesBetween(driverLoc, target);
  }

  if (hospitalLocation && patientLocation) {
    etaToHospital = etaMinutesBetween(patientLocation, hospitalLocation);
  }

  return {
    booking: {
      _id: booking._id,
      bookingId: booking.bookingId,
      status: booking.status,
      flowType: booking.flowType,
      vehicleType: booking.vehicleType,
      pickupLocation: booking.pickupLocation,
      destinationHospital: booking.destinationHospital,
      estimatedArrival: booking.estimatedArrival,
      otp: booking.otp,
      charges: booking.charges,
    },
    driver: driver
      ? {
          name:
            driver.ambulanceDetails?.driverName ||
            `${driver.profile?.firstName || ''} ${driver.profile?.lastName || ''}`.trim(),
          vehicleNumber: driver.ambulanceDetails?.vehicleNumber,
          phone: driver.phone,
          rating: driver.ambulanceDetails?.rating,
          location: driverLoc,
        }
      : null,
    patientLocation,
    hospitalLocation,
    etaMinutes,
    etaToHospital,
    tracking: {
      otp: booking.otp,
      trackingToken: booking.trackingToken,
      trackingExpiresAt: booking.trackingExpiresAt,
    },
  };
}

export const trackByToken = asyncHandler(async (req: Request, res: Response) => {
  const booking = await TransportBooking.findOne({
    trackingToken: req.params.token,
    trackingExpiresAt: { $gt: new Date() },
  }).populate('assignedDriverId', 'profile ambulanceDetails phone');

  if (!booking) {
    res.status(404).json({ success: false, message: 'Tracking link expired or invalid' });
    return;
  }

  if (!['completed', 'cancelled'].includes(booking.status)) {
    await advanceTransportSimulation(booking);
    await booking.populate('assignedDriverId', 'profile ambulanceDetails phone');
  }

  res.json({ success: true, data: buildTrackResponse(booking) });
});

export const trackById = asyncHandler(async (req: Request, res: Response) => {
  const booking = await TransportBooking.findById(req.params.id).populate(
    'assignedDriverId',
    'profile ambulanceDetails phone'
  );
  if (!booking) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }

  if (!['completed', 'cancelled'].includes(booking.status)) {
    await advanceTransportSimulation(booking);
    await booking.populate('assignedDriverId', 'profile ambulanceDetails phone');
  }

  res.json({ success: true, data: buildTrackResponse(booking) });
});

export const acceptTransport = asyncHandler(async (req: Request, res: Response) => {
  const booking = await TransportBooking.findById(req.params.id);
  if (!booking || booking.status !== 'requested') {
    res.status(400).json({ success: false, message: 'Request unavailable' });
    return;
  }

  booking.assignedDriverId = req.user!.userId as unknown as typeof booking.assignedDriverId;
  booking.status = 'accepted';
  booking.statusHistory.push({ status: 'accepted', timestamp: new Date() });
  if (!booking.otp) booking.otp = generatePickupOtp();
  await booking.save();

  await User.findByIdAndUpdate(req.user!.userId, { 'ambulanceDetails.availability': false });

  const io = getIO();
  io.to(`transport-${booking._id}`).emit('transport:accepted', { bookingId: booking._id });
  if (booking.patientId) {
    emitToUser(booking.patientId.toString(), 'transport:accepted', {
      bookingId: booking._id,
      driverId: req.user!.userId,
    });
  }

  res.json({ success: true, data: booking });
});

export const updateTransportStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, location } = req.body;
  const booking = await TransportBooking.findById(req.params.id);
  if (!booking || booking.assignedDriverId?.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  booking.status = status;
  booking.statusHistory.push({ status, timestamp: new Date(), location });
  if (location) booking.driverLocation = { ...location, timestamp: new Date() };
  if (status === 'completed') {
    await User.findByIdAndUpdate(req.user!.userId, {
      'ambulanceDetails.availability': true,
      $inc: { 'ambulanceDetails.totalTrips': 1 },
    });
  }
  await booking.save();

  const io = getIO();
  io.to(`transport-${booking._id}`).emit('transport:status', { status, location });
  if (booking.patientId) {
    emitToUser(booking.patientId.toString(), 'transport:status', { status, bookingId: booking._id });
  }

  res.json({ success: true, data: booking });
});

export const updateTransportLocation = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng, bookingId } = req.body;
  const { syncDriverGeoLocation } = await import('../services/transportMatchingService.js');
  await syncDriverGeoLocation(req.user!.userId, lat, lng);

  if (bookingId) {
    const booking = await TransportBooking.findById(bookingId);
    if (booking?.assignedDriverId?.toString() === req.user!.userId) {
      booking.driverLocation = { lat, lng, timestamp: new Date() };
      if (booking.status === 'accepted') booking.status = 'en-route-to-patient';
      await booking.save();

      const io = getIO();
      io.to(`transport-${booking._id}`).emit('transport:location', {
        location: { lat, lng },
        timestamp: new Date(),
      });
    }
  }

  res.json({ success: true });
});

export const verifyPickupOtp = asyncHandler(async (req: Request, res: Response) => {
  const { otp } = req.body;
  const booking = await TransportBooking.findById(req.params.id);
  if (!booking || booking.assignedDriverId?.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }
  if (booking.otp !== otp) {
    res.status(400).json({ success: false, message: 'Incorrect OTP' });
    return;
  }
  booking.otpVerified = true;
  booking.status = 'patient-picked-up';
  booking.statusHistory.push({ status: 'patient-picked-up', timestamp: new Date() });
  await booking.save();
  res.json({ success: true, data: booking });
});

export const triggerPanic = asyncHandler(async (req: Request, res: Response) => {
  const booking = await TransportBooking.findById(req.params.id);
  if (!booking) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }
  booking.safety = { ...booking.safety, panicTriggered: true };
  await booking.save();
  res.json({ success: true, message: 'Panic alert sent to emergency contacts and admin' });
});

export const cancelTransport = asyncHandler(async (req: Request, res: Response) => {
  const booking = await TransportBooking.findById(req.params.id);
  if (!booking) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }
  if (!['requested', 'accepted', 'en-route-to-patient'].includes(booking.status)) {
    res.status(400).json({ success: false, message: 'Cannot cancel at this stage' });
    return;
  }
  booking.status = 'cancelled';
  booking.statusHistory.push({ status: 'cancelled', timestamp: new Date() });
  await booking.save();
  if (booking.assignedDriverId) {
    await User.findByIdAndUpdate(booking.assignedDriverId, { 'ambulanceDetails.availability': true });
  }
  res.json({ success: true, data: booking });
});

export const getDriverRequests = asyncHandler(async (req: Request, res: Response) => {
  const active = await TransportBooking.find({
    $or: [
      { status: 'requested' },
      { assignedDriverId: req.user!.userId, status: { $nin: ['completed', 'cancelled'] } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(20);
  res.json({ success: true, data: active });
});

export const regenerateTrackingLink = asyncHandler(async (req: Request, res: Response) => {
  const booking = await TransportBooking.findById(req.params.id);
  if (!booking) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }
  booking.trackingToken = generateTrackingToken();
  booking.trackingExpiresAt = buildTrackingExpiry();
  await booking.save();
  res.json({
    success: true,
    data: { trackingToken: booking.trackingToken, trackingUrl: `/track/${booking.trackingToken}` },
  });
});
