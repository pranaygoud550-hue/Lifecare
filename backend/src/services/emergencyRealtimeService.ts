import type { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import { verifyAccessToken, isTokenBlacklisted } from './tokenService.js';
import { AmbulanceUnit, EmergencyRequest, User } from '../models/index.js';
import type { IEmergencyRequest } from '../models/EmergencyRequest.js';
import type { IAmbulanceUnit } from '../models/AmbulanceUnit.js';
import type { UserType } from '../types/index.js';
import {
  findNearestAvailableAmbulances,
  formatAmbulanceResponse,
  findEmergencyRequestByIdentifier,
  recalculateLiveEta,
  getDriverName,
  unitCoords,
} from './emergencyService.js';
import { calculateETA } from '../utils/eta.js';
import { generatePickupOtp } from '../utils/helpers.js';
import { config } from '../config/index.js';
import { sendEmergencyDispatchSms } from './smsService.js';
import { getPatientPhone } from './emergencyService.js';
import type { Server as IoServer } from 'socket.io';

function emitToUserId(io: IoServer, userId: string, event: string, data: unknown): void {
  io.to(`user-${userId}`).emit(event, data);
}

function emitToEmergencyRoomId(io: IoServer, requestId: string, event: string, data: unknown): void {
  io.to(emergencyRoom(requestId)).emit(event, data);
}

const ACCEPT_TIMEOUT_MS = 60_000;
const LOCATION_DB_INTERVAL_MS = 10_000;

function getAcceptTimeoutMs(): number {
  const override = process.env.EMERGENCY_ACCEPT_TIMEOUT_MS;
  if (override) {
    const parsed = parseInt(override, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return ACCEPT_TIMEOUT_MS;
}

export function emergencyRoom(requestId: string): string {
  return `emergency:${requestId}`;
}

interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
    userType?: UserType;
    authenticated?: boolean;
  };
}

const acceptTimeouts = new Map<string, NodeJS.Timeout>();
const locationDbLastWrite = new Map<string, number>();

function patientCoords(request: IEmergencyRequest): { lat: number; lng: number } {
  const [lng, lat] = request.patientLocation.coordinates;
  return { lat, lng };
}

async function loadAssignedUnit(request: IEmergencyRequest) {
  if (!request.assignedAmbulanceId) return null;
  return AmbulanceUnit.findById(request.assignedAmbulanceId).populate(
    'driverId',
    'profile phone userType'
  );
}

function driverUserIdFromUnit(unit: IAmbulanceUnit): string {
  const driver = unit.driverId as unknown as { _id?: Types.ObjectId };
  return String(driver?._id ?? unit.driverId);
}

async function verifyAssignedDriver(request: IEmergencyRequest, driverUserId: string) {
  const unit = await loadAssignedUnit(request);
  if (!unit) return { ok: false as const, unit: null };
  if (driverUserIdFromUnit(unit) !== driverUserId) return { ok: false as const, unit: null };
  return { ok: true as const, unit };
}

export async function buildDriverPayload(unit: IAmbulanceUnit, request: IEmergencyRequest) {
  const patient = patientCoords(request);
  const ambulance = unitCoords(unit);
  const eta = calculateETA(ambulance.lat, ambulance.lng, patient.lat, patient.lng);

  return {
    requestId: request.requestId,
    status: request.status,
    message: statusMessage(request.status),
    calculatedETA: eta.etaMinutes,
    assignedAmbulance: formatAmbulanceResponse(unit, Math.round(eta.distanceKm * 1000), eta.etaMinutes),
    driver: {
      name: getDriverName(unit),
      phone: (unit.driverId as { phone?: string }).phone ?? null,
      vehicleNumber: unit.vehicleNumber,
    },
  };
}

function statusMessage(status: IEmergencyRequest['status']): string {
  switch (status) {
    case 'searching':
      return 'Finding an available ambulance…';
    case 'dispatched':
      return 'Ambulance dispatched — on the way to you';
    case 'arrived':
      return 'Ambulance has arrived at your location';
    case 'pickedUp':
      return 'On the way to hospital';
    case 'atHospital':
      return 'Arrived at hospital';
    case 'completed':
      return 'Emergency completed';
    case 'cancelled':
      return 'Emergency cancelled';
    default:
      return 'Status updated';
  }
}

export function clearAllDriverAcceptTimeouts(): void {
  for (const requestId of acceptTimeouts.keys()) {
    clearDriverAcceptTimeout(requestId);
  }
}

export function clearDriverAcceptTimeout(requestId: string): void {
  const timer = acceptTimeouts.get(requestId);
  if (timer) {
    clearTimeout(timer);
    acceptTimeouts.delete(requestId);
  }
}

export async function scheduleDriverAcceptTimeout(io: Server, requestId: string): Promise<void> {
  clearDriverAcceptTimeout(requestId);

  const timer = setTimeout(() => {
    void handleDriverAcceptTimeout(io, requestId);
  }, getAcceptTimeoutMs());

  acceptTimeouts.set(requestId, timer);
}

async function handleDriverAcceptTimeout(io: Server, requestId: string): Promise<void> {
  acceptTimeouts.delete(requestId);

  const request = await EmergencyRequest.findOne({ requestId });
  if (!request || request.status !== 'searching') return;

  await reassignToNextAmbulance(io, request);
}

async function reassignToNextAmbulance(io: Server, request: IEmergencyRequest): Promise<void> {
  const currentUnitId = request.assignedAmbulanceId ? String(request.assignedAmbulanceId) : null;

  if (request.assignedAmbulanceId) {
    await AmbulanceUnit.findByIdAndUpdate(request.assignedAmbulanceId, {
      status: 'idle',
      isAvailable: true,
      lastUpdated: new Date(),
    });
  }

  const triedIds = new Set(request.candidateAmbulanceIds.map(String));
  if (currentUnitId) triedIds.add(currentUnitId);

  let nextUnit: IAmbulanceUnit | null = null;

  for (const candidateId of request.candidateAmbulanceIds) {
    if (currentUnitId && String(candidateId) === currentUnitId) continue;
    const unit = await AmbulanceUnit.findById(candidateId);
    if (unit?.isAvailable && unit.status === 'idle') {
      nextUnit = unit;
      break;
    }
  }

  if (!nextUnit) {
    const { lat, lng } = patientCoords(request);
    const nearby = await findNearestAvailableAmbulances(lat, lng, 10, 10);
    const fresh = nearby.find((row) => !triedIds.has(String(row.unit._id)));
    if (fresh) {
      nextUnit = fresh.unit;
      if (!request.candidateAmbulanceIds.some((id) => String(id) === String(nextUnit!._id))) {
        request.candidateAmbulanceIds.push(nextUnit._id);
      }
    }
  }

  if (!nextUnit) {
    emitToUserId(io, String(request.patientId), 'emergency:noAmbulance', {
      requestId: request.requestId,
      message: 'No ambulance accepted in time. Please call 108 or retry SOS.',
    });
    emitToEmergencyRoomId(io, request.requestId, 'emergency:noAmbulance', {
      requestId: request.requestId,
    });
    return;
  }

  const patient = patientCoords(request);
  const ambulance = unitCoords(nextUnit);
  const eta = calculateETA(ambulance.lat, ambulance.lng, patient.lat, patient.lng);

  request.assignedAmbulanceId = nextUnit._id;
  request.calculatedETA = eta.etaMinutes;
  request.isDelayed = eta.etaMinutes > 10;
  await request.save();

  await AmbulanceUnit.findByIdAndUpdate(nextUnit._id, {
    status: 'dispatched',
    isAvailable: false,
    lastUpdated: new Date(),
  });

  const populated = await loadAssignedUnit(request);
  const driverId = populated ? String((populated.driverId as { _id?: unknown })._id ?? populated.driverId) : null;

  if (driverId && populated) {
    emitToUserId(io, driverId, 'emergency:new', {
      requestId: request.requestId,
      emergencyType: request.emergencyType,
      patientLocation: patient,
      calculatedETA: eta.etaMinutes,
      reassigned: true,
    });
  }

  const payload = populated
    ? await buildDriverPayload(populated, request)
    : {
        requestId: request.requestId,
        status: request.status,
        message: 'Reassigned to another ambulance',
        calculatedETA: eta.etaMinutes,
      };

  emitToUserId(io, String(request.patientId), 'emergency:reassigned', payload);
  emitToEmergencyRoomId(io, request.requestId, 'emergency:reassigned', payload);
  emitToEmergencyRoomId(io, request.requestId, 'emergency:statusUpdate', payload);

  await scheduleDriverAcceptTimeout(io, request.requestId);
}

export async function authenticateEmergencySocket(
  socket: AuthenticatedSocket,
  token: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const decoded = verifyAccessToken(token);
    if (decoded.jti && (await isTokenBlacklisted(decoded.jti))) {
      return { success: false, message: 'Session ended' };
    }

    socket.data.userId = decoded.userId;
    socket.data.userType = decoded.userType;
    socket.data.authenticated = true;
    socket.join(`user-${decoded.userId}`);
    return { success: true };
  } catch {
    return { success: false, message: 'Invalid token' };
  }
}

export async function joinPatientEmergencyRoom(
  socket: AuthenticatedSocket,
  requestId: string
): Promise<{ success: boolean; message?: string }> {
  const request = await findEmergencyRequestByIdentifier(requestId);
  if (!request) return { success: false, message: 'Emergency request not found' };

  if (socket.data.authenticated && socket.data.userId !== String(request.patientId)) {
    return { success: false, message: 'Not authorized for this emergency room' };
  }

  socket.join(emergencyRoom(requestId));
  return { success: true };
}

export async function joinDriverEmergencyRoom(
  socket: AuthenticatedSocket,
  requestId: string
): Promise<{ success: boolean; message?: string }> {
  if (!socket.data.authenticated || socket.data.userType !== 'ambulance') {
    return { success: false, message: 'Ambulance driver authentication required' };
  }

  const request = await findEmergencyRequestByIdentifier(requestId);
  if (!request) return { success: false, message: 'Emergency request not found' };

  const verified = await verifyAssignedDriver(request, socket.data.userId!);
  if (!verified.ok) return { success: false, message: 'You are not assigned to this request' };

  socket.join(emergencyRoom(requestId));
  socket.join(`driver-${socket.data.userId}`);
  return { success: true };
}

export async function joinAdminEmergencyRoom(
  socket: AuthenticatedSocket,
  requestId: string
): Promise<{ success: boolean; message?: string }> {
  if (!socket.data.authenticated || socket.data.userType !== 'admin') {
    return { success: false, message: 'Admin authentication required' };
  }

  const request = await findEmergencyRequestByIdentifier(requestId);
  if (!request) return { success: false, message: 'Emergency request not found' };

  socket.join(emergencyRoom(requestId));
  return { success: true };
}

export async function handleDriverLocationUpdate(
  io: Server,
  socket: AuthenticatedSocket,
  payload: { requestId: string; lat: number; lng: number }
): Promise<void> {
  if (!socket.data.authenticated || socket.data.userType !== 'ambulance') return;

  const request = await findEmergencyRequestByIdentifier(payload.requestId);
  if (!request) return;

  const verified = await verifyAssignedDriver(request, socket.data.userId!);
  if (!verified.ok || !verified.unit) return;

  const unit = verified.unit;
  const now = Date.now();
  const ambulanceId = String(unit._id);
  const lastWrite = locationDbLastWrite.get(ambulanceId) ?? 0;
  const shouldPersist = now - lastWrite >= LOCATION_DB_INTERVAL_MS;

  if (shouldPersist) {
    await AmbulanceUnit.findByIdAndUpdate(unit._id, {
      currentLocation: { type: 'Point', coordinates: [payload.lng, payload.lat] },
      lastUpdated: new Date(),
    });
    locationDbLastWrite.set(ambulanceId, now);

    await User.findByIdAndUpdate(socket.data.userId, {
      'ambulanceDetails.currentLocation': { lat: payload.lat, lng: payload.lng, timestamp: new Date() },
      'ambulanceDetails.location': { type: 'Point', coordinates: [payload.lng, payload.lat] },
    });
  }

  const liveEta = await recalculateLiveEta(request);
  const broadcast = {
    requestId: request.requestId,
    ambulanceId,
    location: { lat: payload.lat, lng: payload.lng },
    timestamp: new Date().toISOString(),
    calculatedETA: liveEta?.calculatedETA ?? request.calculatedETA ?? null,
    estimatedArrival: liveEta?.estimatedArrival ?? null,
  };

  io.to(emergencyRoom(request.requestId)).emit('ambulance:locationUpdate', broadcast);
  emitToUserId(io, String(request.patientId), 'ambulance:locationUpdate', broadcast);
}

export async function handleDriverAccepted(
  io: Server,
  socket: AuthenticatedSocket,
  payload: { requestId: string }
): Promise<void> {
  if (!socket.data.authenticated || socket.data.userType !== 'ambulance') return;

  const request = await findEmergencyRequestByIdentifier(payload.requestId);
  if (!request) return;

  const verified = await verifyAssignedDriver(request, socket.data.userId!);
  if (!verified.ok || !verified.unit) return;

  clearDriverAcceptTimeout(request.requestId);

  request.status = 'dispatched';
  request.dispatchedAt = new Date();
  request.pickupOtp = generatePickupOtp();
  request.otpVerified = false;
  await request.save();

  await AmbulanceUnit.findByIdAndUpdate(verified.unit._id, {
    status: 'dispatched',
    isAvailable: false,
    lastUpdated: new Date(),
  });

  socket.join(emergencyRoom(request.requestId));

  const statusPayload = await buildDriverPayload(verified.unit, request);
  io.to(emergencyRoom(request.requestId)).emit('emergency:statusUpdate', statusPayload);
  emitToUserId(io, String(request.patientId), 'emergency:statusUpdate', statusPayload);

  const patientPhone = await getPatientPhone(String(request.patientId));
  if (patientPhone) {
    await sendEmergencyDispatchSms({
      to: patientPhone,
      etaMinutes: statusPayload.calculatedETA ?? request.calculatedETA ?? 0,
      driverName: statusPayload.driver.name ?? 'Ambulance crew',
      vehicleNumber: verified.unit.vehicleNumber,
      trackLink: `${config.frontendUrl}/track/${request.requestId}`,
      isDelayed: request.isDelayed,
    });
  }
}

/** Mark driver arrived — shared by socket handler and REST API. */
export async function markDriverArrived(
  io: Server,
  requestId: string,
  driverUserId: string
): Promise<{ ok: boolean; message?: string }> {
  const request = await findEmergencyRequestByIdentifier(requestId);
  if (!request) return { ok: false, message: 'Emergency request not found' };

  const verified = await verifyAssignedDriver(request, driverUserId);
  if (!verified.ok || !verified.unit) {
    return { ok: false, message: 'You are not assigned to this emergency' };
  }

  if (!['dispatched', 'searching'].includes(request.status)) {
    return { ok: false, message: `Cannot mark arrived from status: ${request.status}` };
  }

  if (!request.pickupOtp) {
    request.pickupOtp = generatePickupOtp();
  }

  request.status = 'arrived';
  request.arrivedAt = new Date();
  request.actualArrivalTime = new Date();
  await request.save();

  const arrivedPayload = {
    requestId: request.requestId,
    status: 'arrived' as const,
    message: 'Ambulance has arrived at your location',
    pickupOtp: request.pickupOtp,
  };

  io.to(emergencyRoom(request.requestId)).emit('emergency:arrived', arrivedPayload);
  emitToUserId(io, String(request.patientId), 'emergency:arrived', arrivedPayload);
  io.to(emergencyRoom(request.requestId)).emit('emergency:statusUpdate', {
    ...(await buildDriverPayload(verified.unit, request)),
    pickupOtp: request.pickupOtp,
    message: 'Ambulance has arrived at your location',
  });

  return { ok: true };
}

export async function handleDriverArrived(
  io: Server,
  socket: AuthenticatedSocket,
  payload: { requestId: string }
): Promise<void> {
  if (!socket.data.authenticated || socket.data.userType !== 'ambulance') return;
  await markDriverArrived(io, payload.requestId, socket.data.userId!);
}

export async function handleDriverPickedUp(
  io: Server,
  socket: AuthenticatedSocket,
  payload: { requestId: string }
): Promise<void> {
  if (!socket.data.authenticated || socket.data.userType !== 'ambulance') return;

  const request = await findEmergencyRequestByIdentifier(payload.requestId);
  if (!request) return;

  const verified = await verifyAssignedDriver(request, socket.data.userId!);
  if (!verified.ok || !verified.unit) return;

  request.status = 'pickedUp';
  await request.save();

  const statusPayload = {
    ...(await buildDriverPayload(verified.unit, request)),
    status: 'pickedUp',
    message: 'On the way to hospital',
  };

  io.to(emergencyRoom(request.requestId)).emit('emergency:statusUpdate', statusPayload);
  emitToUserId(io, String(request.patientId), 'emergency:statusUpdate', statusPayload);
}

export async function handleDriverAtHospital(
  io: Server,
  socket: AuthenticatedSocket,
  payload: { requestId: string }
): Promise<void> {
  if (!socket.data.authenticated || socket.data.userType !== 'ambulance') return;

  const request = await findEmergencyRequestByIdentifier(payload.requestId);
  if (!request) return;

  const verified = await verifyAssignedDriver(request, socket.data.userId!);
  if (!verified.ok || !verified.unit) return;

  request.status = 'atHospital';
  request.completedAt = new Date();
  await request.save();

  await AmbulanceUnit.findByIdAndUpdate(verified.unit._id, {
    status: 'idle',
    isAvailable: true,
    lastUpdated: new Date(),
  });

  clearDriverAcceptTimeout(request.requestId);

  const completedPayload = {
    requestId: request.requestId,
    status: 'atHospital',
    message: 'Arrived at hospital. Emergency handover complete.',
  };

  io.to(emergencyRoom(request.requestId)).emit('emergency:completed', completedPayload);
  emitToUserId(io, String(request.patientId), 'emergency:completed', completedPayload);
  io.to(emergencyRoom(request.requestId)).emit('emergency:statusUpdate', completedPayload);
}

export function registerEmergencySocketHandlers(io: Server, socket: AuthenticatedSocket): void {
  socket.on('socket:authenticate', async (payload: { token?: string }, callback?) => {
    const token = payload?.token;
    if (!token) {
      callback?.({ success: false, message: 'Token required' });
      return;
    }
    const result = await authenticateEmergencySocket(socket, token);
    callback?.(result);
  });

  socket.on('patient:joinEmergency', async (payload: { requestId: string }, callback?) => {
    const result = await joinPatientEmergencyRoom(socket, payload.requestId);
    callback?.(result);
  });

  socket.on('driver:joinEmergency', async (payload: { requestId: string }, callback?) => {
    const result = await joinDriverEmergencyRoom(socket, payload.requestId);
    callback?.(result);
  });

  socket.on('admin:joinEmergency', async (payload: { requestId: string }, callback?) => {
    const result = await joinAdminEmergencyRoom(socket, payload.requestId);
    callback?.(result);
  });

  socket.on('join-emergency-room', async (requestId: string) => {
    await joinPatientEmergencyRoom(socket, requestId);
  });

  socket.on('leave-emergency-room', (requestId: string) => {
    socket.leave(emergencyRoom(requestId));
  });

  socket.on('driver:locationUpdate', (payload: { requestId: string; lat: number; lng: number }) => {
    void handleDriverLocationUpdate(io, socket, payload);
  });

  socket.on('driver:accepted', (payload: { requestId: string }) => {
    void handleDriverAccepted(io, socket, payload);
  });

  socket.on('driver:arrived', (payload: { requestId: string }) => {
    void handleDriverArrived(io, socket, payload);
  });

  socket.on('driver:pickedUp', (payload: { requestId: string }) => {
    void handleDriverPickedUp(io, socket, payload);
  });

  socket.on('driver:atHospital', (payload: { requestId: string }) => {
    void handleDriverAtHospital(io, socket, payload);
  });
}
