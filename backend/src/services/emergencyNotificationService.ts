import { User } from '../models/index.js';
import { createNotification } from './notificationService.js';

export type EmergencyNotifyResult = {
  inAppNotified: boolean;
};

/** In-app notification when SOS is created (no automatic SMS). */
export async function notifyEmergencySosCreated(params: {
  patientId: string;
  requestId: string;
  lat: number;
  lng: number;
  etaMinutes: number;
  trackLink: string;
  hospitalName?: string;
}): Promise<EmergencyNotifyResult> {
  const user = await User.findById(params.patientId).select('_id');
  if (!user) return { inAppNotified: false };

  await createNotification({
    userId: params.patientId,
    type: 'ambulance',
    title: 'Emergency SOS dispatched',
    message: `Ambulance assigned — ETA ${params.etaMinutes} min. Track live from your dashboard.`,
    data: {
      requestId: params.requestId,
      trackLink: params.trackLink,
      lat: params.lat,
      lng: params.lng,
      hospitalName: params.hospitalName,
    },
  });

  return { inAppNotified: true };
}
