import cron from 'node-cron';
import { Appointment, User } from '../models/index.js';
import { getAppointmentDateTime, formatDoctorName } from '../utils/appointmentTime.js';
import { config } from '../config/index.js';
import { notifyAppointmentReminder30m } from './notificationService.js';
import { sendAppointmentReminderEmail24h } from './emailService.js';
import { sendAppointmentReminderSms } from './smsService.js';

const MS_MINUTE = 60 * 1000;
const MS_HOUR = 60 * MS_MINUTE;

function inWindow(targetMs: number, nowMs: number, windowMs: number): boolean {
  return targetMs >= nowMs && targetMs <= nowMs + windowMs;
}

function preparationTips(consultationType: string): string[] {
  if (consultationType === 'video') {
    return [
      'Test your camera and microphone 10 minutes early',
      'Use a quiet, well-lit space with stable internet',
      'Keep your reports and medication list handy',
      'Join from Appointments → Live Checkup when prompted',
    ];
  }
  if (consultationType === 'homeVisit') {
    return [
      'Arrive 15 minutes before your scheduled time',
      'Carry a valid ID and previous medical reports',
      'Note your appointment ID at the clinic reception',
    ];
  }
  return [
    'Join the consultation room a few minutes before your slot',
    'Keep your symptoms list and current medications ready',
  ];
}

export async function processAppointmentReminders() {
  const now = Date.now();
  const appointments = await Appointment.find({
    status: { $in: ['pending', 'confirmed'] },
    doctorResponse: { $ne: 'rejected' },
  })
    .populate('patientId', 'profile email phone')
    .populate('doctorId', 'profile doctorDetails');

  for (const appt of appointments) {
    const startAt = getAppointmentDateTime(appt.scheduledDate, appt.scheduledTime).getTime();
    if (startAt <= now) continue;

    const patient = appt.patientId as {
      _id: { toString: () => string };
      email?: string;
      phone?: string;
      profile?: { firstName?: string; lastName?: string };
    };
    const doctor = appt.doctorId as {
      _id: { toString: () => string };
      profile?: { firstName?: string; lastName?: string };
    };

    if (!patient?.email) continue;

    const doctorName = formatDoctorName(doctor?.profile);
    const patientName =
      `${patient.profile?.firstName || ''} ${patient.profile?.lastName || ''}`.trim() || 'Patient';
    const dateStr = new Date(appt.scheduledDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!appt.reminders) appt.reminders = {};

    // 24 hours before — email
    if (
      !appt.reminders.email24h &&
      inWindow(startAt, now + 23 * MS_HOUR, 2 * MS_HOUR)
    ) {
      await sendAppointmentReminderEmail24h({
        to: patient.email,
        patientName,
        doctorName,
        appointmentId: appt.appointmentId,
        scheduledDate: dateStr,
        scheduledTime: appt.scheduledTime,
        consultationType: appt.consultationType,
        preparationTips: preparationTips(appt.consultationType),
        rescheduleUrl: `${config.frontendUrl}/appointments?reschedule=${appt._id}`,
      });
      appt.reminders.email24h = true;
      appt.reminders.email24hSentAt = new Date();
      await appt.save();
    }

    // 1 hour before — SMS
    if (!appt.reminders.sms1h && inWindow(startAt, now + 55 * MS_MINUTE, 10 * MS_MINUTE)) {
      const isOnline = ['video', 'audio', 'chat'].includes(appt.consultationType);
      const joinLink = isOnline ? `${config.frontendUrl}/live-checkup` : undefined;
      const phone = patient.phone || (await User.findById(patient._id).select('phone'))?.phone;
      if (phone) {
        await sendAppointmentReminderSms({
          to: phone,
          doctorName,
          scheduledTime: appt.scheduledTime,
          consultationType: appt.consultationType,
          joinLink,
        });
        appt.reminders.sms1h = true;
        appt.reminders.sms1hSentAt = new Date();
        await appt.save();
      }
    }

    // 30 minutes before — socket notification
    if (
      !appt.reminders.socket30m &&
      inWindow(startAt, now + 25 * MS_MINUTE, 10 * MS_MINUTE)
    ) {
      await notifyAppointmentReminder30m(patient._id.toString(), {
        appointmentId: appt._id.toString(),
        doctorName,
        scheduledTime: appt.scheduledTime,
        consultationType: appt.consultationType,
      });
      appt.reminders.socket30m = true;
      appt.reminders.socket30mSentAt = new Date();
      await appt.save();
    }
  }
}

export function startCronJobs() {
  cron.schedule('* * * * *', () => {
    processAppointmentReminders().catch((err) => {
      console.error('[Cron] Appointment reminders error:', err instanceof Error ? err.message : err);
    });
  });
  console.log('⏰ Cron jobs started (appointment reminders every minute)');
}
