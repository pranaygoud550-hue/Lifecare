import { EmergencyRequest, AmbulanceUnit } from '../models/index.js';
import { getIO } from './socketService.js';
import { emergencyRoom } from './emergencyRealtimeService.js';
import {
  getDirectionsRoute,
  etaMinutesFromDirections,
  isGoogleDirectionsConfigured,
} from './googleDirectionsService.js';
import { recalculateLiveEta, unitCoords } from './emergencyService.js';

const ACTIVE_STATUSES = ['searching', 'dispatched', 'arrived', 'pickedUp'];

let intervalHandle: NodeJS.Timeout | null = null;

export function startNavigationEtaBroadcast(): void {
  if (intervalHandle) return;

  intervalHandle = setInterval(async () => {
    try {
      await broadcastLiveNavigationEta();
    } catch (err) {
      console.warn(
        '[NavigationETA] broadcast error:',
        err instanceof Error ? err.message : err
      );
    }
  }, 30_000);

  console.log('🚑 Navigation ETA socket broadcast every 30s');
}

export function stopNavigationEtaBroadcast(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

export async function broadcastLiveNavigationEta(): Promise<void> {
  const io = getIO();
  const requests = await EmergencyRequest.find({
    status: { $in: ACTIVE_STATUSES },
    assignedAmbulanceId: { $exists: true, $ne: null },
  }).limit(50);

  for (const request of requests) {
    const unit = await AmbulanceUnit.findById(request.assignedAmbulanceId);
    if (!unit) continue;

    const ambulance = unitCoords(unit);
    const [patientLng, patientLat] = request.patientLocation.coordinates;
    const liveEta = await recalculateLiveEta(request);

    let payload: Record<string, unknown> = {
      requestId: request.requestId,
      ambulanceLocation: ambulance,
      patientLocation: { lat: patientLat, lng: patientLng },
      calculatedETA: liveEta?.calculatedETA ?? null,
      estimatedArrival: liveEta?.estimatedArrival ?? null,
      status: request.status,
      polyline: null,
      decodedPath: null,
      durationInTraffic: null,
      nextInstruction: null,
    };

    if (isGoogleDirectionsConfigured()) {
      try {
        const route = await getDirectionsRoute(
          ambulance.lat,
          ambulance.lng,
          patientLat,
          patientLng,
          'ambulance'
        );
        payload = {
          ...payload,
          calculatedETA: etaMinutesFromDirections(route),
          polyline: route.polyline,
          decodedPath: route.decodedPath,
          durationInTraffic: route.durationInTraffic ?? route.duration,
          distance: route.distance,
          nextInstruction: route.steps[0]?.instruction ?? null,
          warnings: route.warnings,
        };
      } catch {
        // keep haversine fallback
      }
    }

    io.to(emergencyRoom(request.requestId)).emit('navigation:etaUpdate', payload);
    io.to(`user-${request.patientId}`).emit('navigation:etaUpdate', payload);

    if (unit.driverId) {
      io.to(`user-${unit.driverId}`).emit('navigation:etaUpdate', payload);
    }
  }
}
