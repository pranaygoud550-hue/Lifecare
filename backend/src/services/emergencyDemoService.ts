import type { Server } from 'socket.io';
import { EmergencyRequest, AmbulanceUnit } from '../models/index.js';
import { generatePickupOtp } from '../utils/helpers.js';
import {
  clearDriverAcceptTimeout,
  emergencyRoom,
  buildDriverPayload,
} from './emergencyRealtimeService.js';
import { unitCoords, recalculateLiveEta } from './emergencyService.js';
import { getIO } from './socketService.js';

const simTimers = new Map<string, NodeJS.Timeout>();

function patientCoords(request: { patientLocation: { coordinates: number[] } }) {
  const [lng, lat] = request.patientLocation.coordinates;
  return { lat, lng };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Demo: auto-accept assigned driver and start live location simulation toward patient. */
export async function startEmergencyDemoFlow(requestId: string): Promise<void> {
  if (process.env.DISABLE_EMERGENCY_DEMO === 'true') return;

  const io = getIO();
  setTimeout(() => void acceptAndSimulate(io, requestId), 2000);
}

async function acceptAndSimulate(io: Server, requestId: string): Promise<void> {
  const request = await EmergencyRequest.findOne({ requestId });
  if (!request || request.status !== 'searching') return;

  clearDriverAcceptTimeout(requestId);

  const unit = request.assignedAmbulanceId
    ? await AmbulanceUnit.findById(request.assignedAmbulanceId).populate('driverId', 'profile phone')
    : null;
  if (!unit) return;

  const otp = generatePickupOtp();
  request.status = 'dispatched';
  request.dispatchedAt = new Date();
  request.pickupOtp = otp;
  request.otpVerified = false;
  await request.save();

  await AmbulanceUnit.findByIdAndUpdate(unit._id, {
    status: 'dispatched',
    isAvailable: false,
    lastUpdated: new Date(),
  });

  const statusPayload = await buildDriverPayload(unit, request);
  io.to(emergencyRoom(requestId)).emit('emergency:statusUpdate', statusPayload);
  io.to(`user-${request.patientId}`).emit('emergency:statusUpdate', statusPayload);

  startLocationSimulation(io, requestId);
}

function startLocationSimulation(io: Server, requestId: string): void {
  stopLocationSimulation(requestId);

  let step = 0;
  const maxSteps = 8;

  const tick = async () => {
    const request = await EmergencyRequest.findOne({ requestId });
    if (!request || !request.assignedAmbulanceId) return;
    if (['cancelled', 'completed', 'atHospital'].includes(request.status)) {
      stopLocationSimulation(requestId);
      return;
    }

    const unit = await AmbulanceUnit.findById(request.assignedAmbulanceId);
    if (!unit) return;

    const patient = patientCoords(request);
    const ambulance = unitCoords(unit);
    step += 1;
    const t = Math.min(step / maxSteps, 1);

    const lat = lerp(ambulance.lat, patient.lat, 0.35);
    const lng = lerp(ambulance.lng, patient.lng, 0.35);

    unit.currentLocation = { type: 'Point', coordinates: [lng, lat] };
    unit.lastUpdated = new Date();
    await unit.save();

    const liveEta = await recalculateLiveEta(request);
    const payload = {
      requestId,
      ambulanceId: String(unit._id),
      location: { lat, lng },
      timestamp: unit.lastUpdated.toISOString(),
      calculatedETA:
        liveEta?.calculatedETA ?? Math.max(1, Math.round((1 - t) * (request.calculatedETA ?? 8))),
      estimatedArrival: liveEta?.estimatedArrival ?? null,
    };

    io.to(emergencyRoom(requestId)).emit('ambulance:locationUpdate', payload);
    io.to(`user-${request.patientId}`).emit('ambulance:locationUpdate', payload);

    if (t >= 1 || step >= maxSteps) {
      stopLocationSimulation(requestId);
      request.status = 'arrived';
      request.arrivedAt = new Date();
      request.actualArrivalTime = new Date();
      await request.save();

      const arrivedPayload = {
        requestId,
        status: 'arrived' as const,
        message: 'Ambulance has arrived — share your safety code with the crew',
        pickupOtp: request.pickupOtp,
      };
      io.to(emergencyRoom(requestId)).emit('emergency:arrived', arrivedPayload);
      io.to(`user-${request.patientId}`).emit('emergency:arrived', arrivedPayload);
      io.to(emergencyRoom(requestId)).emit('emergency:statusUpdate', arrivedPayload);
      return;
    }

    const timer = setTimeout(() => void tick(), 3500);
    simTimers.set(requestId, timer);
  };

  void tick();
}

export function stopLocationSimulation(requestId: string): void {
  const timer = simTimers.get(requestId);
  if (timer) {
    clearTimeout(timer);
    simTimers.delete(requestId);
  }
}
