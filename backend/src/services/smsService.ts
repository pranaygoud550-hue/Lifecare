import twilio from 'twilio';
import { config } from '../config/index.js';

const client =
  config.twilio.accountSid && config.twilio.authToken
    ? twilio(config.twilio.accountSid, config.twilio.authToken)
    : null;

export async function sendSms(to: string, body: string) {
  if (!client || !config.twilio.phoneNumber) {
    console.log(`[LifeCare+ SMS] To: ${to}\n${body}`);
    return { sent: false, demo: true };
  }

  await client.messages.create({
    body,
    from: config.twilio.phoneNumber,
    to: to.startsWith('+') ? to : `+91${to.replace(/\D/g, '')}`,
  });
  return { sent: true, demo: false };
}

export async function sendAppointmentReminderSms(params: {
  to: string;
  doctorName: string;
  scheduledTime: string;
  consultationType: string;
  joinLink?: string;
}) {
  const isOnline = ['video', 'audio', 'chat'].includes(params.consultationType);
  const joinPart =
    isOnline && params.joinLink
      ? ` Join: ${params.joinLink}`
      : isOnline
        ? ' Open LifeCare+ Live Checkup to join.'
        : '';

  const body = `LifeCare+ Reminder: ${params.doctorName} at ${params.scheduledTime} (1 hr).${joinPart}`;
  return sendSms(params.to, body);
}

export async function sendEmergencyDispatchSms(params: {
  to: string;
  etaMinutes: number;
  driverName: string;
  vehicleNumber: string;
  trackLink: string;
  isDelayed?: boolean;
}) {
  const delayNote = params.isDelayed ? ' Heavy traffic — ' : ' ';
  const body =
    `Ambulance dispatched.${delayNote}ETA: ${params.etaMinutes} minutes. ` +
    `Driver: ${params.driverName}. Vehicle: ${params.vehicleNumber}. Track: ${params.trackLink}`;
  return sendSms(params.to, body);
}

export async function sendBloodAlertSms(params: {
  to: string;
  bloodGroup: string;
  hospitalName: string;
}) {
  const body = `URGENT: ${params.bloodGroup} blood needed at ${params.hospitalName}. Open LifeCare+ for directions.`;
  return sendSms(params.to, body);
}
