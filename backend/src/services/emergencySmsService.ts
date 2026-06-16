import { config } from '../config/index.js';
import { sendSms } from './smsService.js';

export function isSmsConfigured(): boolean {
  return !!(
    config.twilio.accountSid &&
    config.twilio.authToken &&
    config.twilio.phoneNumber
  );
}

export async function sendEmergencySosPatientSms(params: {
  to: string;
  requestId: string;
  etaMinutes: number;
  trackLink: string;
  hospitalName?: string;
}) {
  const hospitalPart = params.hospitalName ? ` Hospital: ${params.hospitalName}.` : '';
  const body =
    `LifeCare+ SOS received. Ambulance assigned — ETA ${params.etaMinutes} min.${hospitalPart} ` +
    `Track live: ${params.trackLink} Ref: ${params.requestId}`;
  return sendSms(params.to, body);
}

export async function sendEmergencyContactAlertSms(params: {
  to: string;
  patientName: string;
  trackLink: string;
  etaMinutes: number;
}) {
  const body =
    `EMERGENCY: ${params.patientName} triggered LifeCare+ SOS. ` +
    `Ambulance ETA ~${params.etaMinutes} min. Live track: ${params.trackLink}`;
  return sendSms(params.to, body);
}
