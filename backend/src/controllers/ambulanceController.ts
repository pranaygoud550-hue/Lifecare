import { Request, Response } from 'express';
import { AmbulanceRequest, User } from '../models/index.js';
import { asyncHandler } from '../middleware/validate.js';
import { generateRequestId, calculateDistance } from '../utils/helpers.js';
import { createNotification, notifyAmbulanceDispatched } from '../services/notificationService.js';

export const requestAmbulance = asyncHandler(async (req: Request, res: Response) => {
  const { emergencyType, severity, pickupLocation, patientDetails, ambulanceType } = req.body;

  const request = await AmbulanceRequest.create({
    requestId: generateRequestId(),
    patientId: req.user!.userId,
    emergencyType,
    severity,
    pickupLocation,
    patientDetails,
    ambulanceType,
    status: 'requested',
    statusHistory: [{ status: 'requested', timestamp: new Date(), location: pickupLocation.coordinates }],
    charges: {
      baseFare: ambulanceType === 'ALS' ? 2000 : 1000,
      distanceCharges: 0,
      waitingCharges: 0,
      total: ambulanceType === 'ALS' ? 2000 : 1000,
    },
  });

  const nearbyDrivers = await User.find({
    userType: 'ambulance',
    isActive: true,
    'ambulanceDetails.availability': true,
    'ambulanceDetails.vehicleType': ambulanceType,
  }).limit(5);

  for (const driver of nearbyDrivers) {
    await createNotification({
      userId: driver._id,
      type: 'ambulance',
      title: 'Emergency Request Nearby',
      message: `${severity.toUpperCase()} ${emergencyType} emergency at ${pickupLocation.address}`,
      data: { requestId: request._id },
    });
  }

  res.status(201).json({ success: true, data: request });
});

export const getAmbulanceRequests = asyncHandler(async (req: Request, res: Response) => {
  const filter =
    req.user!.userType === 'ambulance'
      ? { assignedAmbulanceId: req.user!.userId }
      : { patientId: req.user!.userId };

  const requests = await AmbulanceRequest.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: requests });
});

export const getAmbulanceRequestById = asyncHandler(async (req: Request, res: Response) => {
  const request = await AmbulanceRequest.findById(req.params.id).populate(
    'assignedAmbulanceId',
    'profile ambulanceDetails'
  );
  if (!request) {
    res.status(404).json({ success: false, message: 'Request not found' });
    return;
  }
  res.json({ success: true, data: request });
});

export const trackAmbulance = asyncHandler(async (req: Request, res: Response) => {
  const request = await AmbulanceRequest.findById(req.params.id).populate(
    'assignedAmbulanceId',
    'profile ambulanceDetails'
  );
  if (!request) {
    res.status(404).json({ success: false, message: 'Request not found' });
    return;
  }

  const driver = request.assignedAmbulanceId as unknown as {
    ambulanceDetails?: { currentLocation?: { lat: number; lng: number } };
  };

  let eta = null;
  if (driver?.ambulanceDetails?.currentLocation) {
    const distance = calculateDistance(
      request.pickupLocation.coordinates.lat,
      request.pickupLocation.coordinates.lng,
      driver.ambulanceDetails.currentLocation.lat,
      driver.ambulanceDetails.currentLocation.lng
    );
    eta = Math.ceil(distance * 3);
  }

  res.json({
    success: true,
    data: {
      request,
      tracking: {
        ambulanceLocation: driver?.ambulanceDetails?.currentLocation,
        patientLocation: request.pickupLocation.coordinates,
        eta,
        status: request.status,
      },
    },
  });
});

export const acceptAmbulanceRequest = asyncHandler(async (req: Request, res: Response) => {
  const request = await AmbulanceRequest.findById(req.params.id);
  if (!request) {
    res.status(404).json({ success: false, message: 'Request not found' });
    return;
  }

  if (request.status !== 'requested') {
    res.status(400).json({ success: false, message: 'Request already assigned' });
    return;
  }

  request.assignedAmbulanceId = req.user!.userId as unknown as typeof request.assignedAmbulanceId;
  request.status = 'dispatched';
  request.statusHistory.push({ status: 'dispatched', timestamp: new Date() });
  request.estimatedArrival = new Date(Date.now() + 15 * 60 * 1000);
  await request.save();

  await User.findByIdAndUpdate(req.user!.userId, {
    'ambulanceDetails.availability': false,
  });

  await notifyAmbulanceDispatched(request.patientId.toString(), request._id.toString());

  res.json({ success: true, data: request });
});

export const updateAmbulanceStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, location } = req.body;
  const request = await AmbulanceRequest.findById(req.params.id);

  if (!request || request.assignedAmbulanceId?.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  request.status = status;
  request.statusHistory.push({ status, timestamp: new Date(), location });

  if (status === 'arrived') request.actualArrival = new Date();
  if (status === 'completed') {
    await User.findByIdAndUpdate(req.user!.userId, {
      'ambulanceDetails.availability': true,
    });
  }

  await request.save();

  await createNotification({
    userId: request.patientId,
    type: 'ambulance',
    title: 'Ambulance Update',
    message: `Status updated: ${status.replace(/-/g, ' ')}`,
    data: { requestId: request._id, status },
  });

  res.json({ success: true, data: request });
});

export const updateDriverLocation = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng } = req.body;
  await User.findByIdAndUpdate(req.user!.userId, {
    'ambulanceDetails.currentLocation': { lat, lng, timestamp: new Date() },
  });
  res.json({ success: true, message: 'Location updated' });
});

export const cancelAmbulanceRequest = asyncHandler(async (req: Request, res: Response) => {
  const request = await AmbulanceRequest.findById(req.params.id);
  if (!request) {
    res.status(404).json({ success: false, message: 'Request not found' });
    return;
  }

  if (!['requested', 'dispatched'].includes(request.status)) {
    res.status(400).json({ success: false, message: 'Cannot cancel at this stage' });
    return;
  }

  request.status = 'cancelled';
  request.statusHistory.push({ status: 'cancelled', timestamp: new Date() });
  await request.save();

  res.json({ success: true, data: request });
});
