import { User } from '../models/index.js';
import { createNotification } from './notificationService.js';
import {
  isSmsConfigured,
  sendEmergencyContactAlertSms,
  sendEmergencySosPatientSms,
} from './emergencySmsService.js';

export type EmergencyNotifyResult = {
  smsConfigured: boolean;
  patientSmsSent: boolean;
  contactsSmsSent: number;
  contactsNotified: string[];
};

function uniquePhones(phones: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of phones) {
    if (!raw) continue;
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10 || seen.has(digits)) continue;
    seen.add(digits);
    out.push(raw);
  }
  return out;
}

/** Notify patient + emergency contacts when SOS is created. */
export async function notifyEmergencySosCreated(params: {
  patientId: string;
  requestId: string;
  lat: number;
  lng: number;
  etaMinutes: number;
  trackLink: string;
  hospitalName?: string;
}): Promise<EmergencyNotifyResult> {
  const smsConfigured = isSmsConfigured();
  const result: EmergencyNotifyResult = {
    smsConfigured,
    patientSmsSent: false,
    contactsSmsSent: 0,
    contactsNotified: [],
  };

  const user = await User.findById(params.patientId).select('profile phone');
  if (!user) return result;

  const patientName =
    `${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim() || 'Your contact';

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
    },
  });

  if (user.phone) {
    const sms = await sendEmergencySosPatientSms({
      to: user.phone,
      requestId: params.requestId,
      etaMinutes: params.etaMinutes,
      trackLink: params.trackLink,
      hospitalName: params.hospitalName,
    });
    result.patientSmsSent = sms.sent;
  }

  const contactPhones = uniquePhones(
    (user.profile?.emergencyContacts ?? []).map((c) => c.phone)
  );

  for (const phone of contactPhones) {
    const sms = await sendEmergencyContactAlertSms({
      to: phone,
      patientName,
      trackLink: params.trackLink,
      etaMinutes: params.etaMinutes,
    });
    if (sms.sent) {
      result.contactsSmsSent += 1;
      result.contactsNotified.push(phone);
    }
  }

  if (!smsConfigured) {
    console.warn(
      '[LifeCare+ SOS] Twilio not configured — SMS logged only. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER on Render.'
    );
  }

  return result;
}
