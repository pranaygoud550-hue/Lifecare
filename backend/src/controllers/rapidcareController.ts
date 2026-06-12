import type { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { EmergencyRecord, type RapidCareEventType } from '../models/EmergencyRecord.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { Appointment } from '../models/Appointment.js';
import { emitToUser } from '../services/socketService.js';
import { sendRapidCareDoctorAlertEmail } from '../services/emailService.js';

const eventTypes = ['BOOKING_CREATED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'COMPLETED'] as const;

const syncSchema = z.object({
  eventType: z.enum(eventTypes),
  bookingId: z.string().min(3),
  patientPhone: z.string().min(10),
  lifecarePatientId: z.string().nullable().optional(),
  patientName: z.string().min(2),
  condition: z.string(),
  pickupAddress: z.string(),
  destinationHospital: z.string(),
  vehicleType: z.string(),
  driverName: z.string().nullable().optional(),
  vehicleNumber: z.string().nullable().optional(),
  fare: z.number(),
  paymentStatus: z.string(),
  dispatchTime: z.string().nullable().optional(),
  arrivalTime: z.string().nullable().optional(),
  completedTime: z.string().nullable().optional(),
  responseTimeMinutes: z.number().optional(),
});

type SyncData = z.infer<typeof syncSchema>;

function verifyWebhook(req: Request, res: Response): boolean {
  const secret = req.headers['x-webhook-secret'];
  if (!process.env.RAPIDCARE_WEBHOOK_SECRET || secret !== process.env.RAPIDCARE_WEBHOOK_SECRET) {
    res.status(401).json({ success: false, message: 'Invalid webhook secret' });
    return false;
  }
  return true;
}

async function resolvePatient(data: SyncData) {
  if (data.lifecarePatientId && mongoose.Types.ObjectId.isValid(data.lifecarePatientId)) {
    const byId = await User.findById(data.lifecarePatientId);
    if (byId?.userType === 'patient') return byId;
  }
  return User.findOne({ phone: data.patientPhone, userType: 'patient' });
}

function notificationCopy(eventType: RapidCareEventType, data: SyncData) {
  switch (eventType) {
    case 'BOOKING_CREATED':
      return {
        title: 'Ambulance booked',
        message: 'Ambulance booked. Driver being assigned.',
      };
    case 'DRIVER_ASSIGNED':
      return {
        title: 'Driver assigned',
        message: `Driver ${data.driverName || 'assigned'} assigned. Vehicle ${data.vehicleNumber || 'N/A'}.`,
      };
    case 'DRIVER_ARRIVING':
      return {
        title: 'Driver arriving',
        message: 'Driver is arriving. Get ready.',
      };
    case 'COMPLETED':
      return {
        title: 'Trip completed',
        message: 'Trip completed. View your report.',
      };
    default:
      return { title: 'RapidCare update', message: 'Your ambulance booking was updated.' };
  }
}

async function notifyPatient(
  patientId: string,
  eventType: RapidCareEventType,
  data: SyncData
): Promise<void> {
  const { title, message } = notificationCopy(eventType, data);
  const urgent = eventType === 'BOOKING_CREATED';

  const notification = await Notification.create({
    userId: patientId,
    type: 'RAPIDCARE_UPDATE',
    title,
    message,
    data: {
      icon: '🚑',
      bookingId: data.bookingId,
      eventType,
      urgent,
      link: '/dashboard/emergency-history',
    },
    isRead: false,
    sentAt: new Date(),
  });

  const payload = {
    _id: notification._id,
    type: 'RAPIDCARE_UPDATE',
    icon: '🚑',
    title,
    message,
    bookingId: data.bookingId,
    urgent,
    link: '/dashboard/emergency-history',
    eventType,
    sentAt: notification.sentAt,
    isRead: false,
  };

  emitToUser(patientId, 'notification:new', payload);
  emitToUser(patientId, 'notification', payload);
}

async function notifyDoctorOfEmergency(
  patientId: mongoose.Types.ObjectId,
  data: SyncData
): Promise<void> {
  const appointment = await Appointment.findOne({
    patientId,
    status: { $in: ['confirmed', 'completed', 'in-progress'] },
  })
    .sort({ scheduledDate: -1, createdAt: -1 })
    .lean();

  if (!appointment?.doctorId) return;

  const doctor = await User.findById(appointment.doctorId);
  if (!doctor || doctor.userType !== 'doctor') return;

  const doctorId = doctor._id.toString();
  const doctorName = doctor.profile?.firstName
    ? `Dr. ${doctor.profile.firstName} ${doctor.profile.lastName || ''}`.trim()
    : 'Doctor';

  const title = '🚨 Patient emergency transport';
  const message = `Your patient ${data.patientName} has requested emergency transport. Condition: ${data.condition}. Going to: ${data.destinationHospital}.`;

  const notification = await Notification.create({
    userId: doctorId,
    type: 'RAPIDCARE_UPDATE',
    title,
    message,
    data: {
      icon: '🚑',
      bookingId: data.bookingId,
      patientId: patientId.toString(),
      urgent: true,
      link: '/dashboard',
    },
    isRead: false,
    sentAt: new Date(),
  });

  const payload = {
    _id: notification._id,
    type: 'RAPIDCARE_UPDATE',
    icon: '🚑',
    title,
    message,
    bookingId: data.bookingId,
    urgent: true,
    sentAt: notification.sentAt,
    isRead: false,
  };

  emitToUser(doctorId, 'notification:new', payload);
  emitToUser(doctorId, 'notification', payload);

  if (doctor.email) {
    await sendRapidCareDoctorAlertEmail({
      to: doctor.email,
      doctorName,
      patientName: data.patientName,
      condition: data.condition,
      hospital: data.destinationHospital,
    }).catch((err) => console.error('Doctor alert email failed:', err));
  }
}

export async function syncRapidCare(req: Request, res: Response) {
  if (!verifyWebhook(req, res)) return;

  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.flatten() });
  }

  const data = parsed.data;
  const patient = await resolvePatient(data);
  const now = new Date();

  const record = await EmergencyRecord.findOneAndUpdate(
    { bookingId: data.bookingId },
    {
      $set: {
        eventType: data.eventType,
        patientName: data.patientName,
        patientPhone: data.patientPhone,
        condition: data.condition,
        pickupAddress: data.pickupAddress,
        destinationHospital: data.destinationHospital,
        vehicleType: data.vehicleType,
        driverName: data.driverName || undefined,
        vehicleNumber: data.vehicleNumber || undefined,
        fare: data.fare,
        paymentStatus: data.paymentStatus,
        dispatchTime: data.dispatchTime ? new Date(data.dispatchTime) : undefined,
        arrivalTime: data.arrivalTime ? new Date(data.arrivalTime) : undefined,
        completedTime: data.completedTime ? new Date(data.completedTime) : undefined,
        responseTimeMinutes: data.responseTimeMinutes,
        source: 'rapidcare',
        ...(patient
          ? { patientId: patient._id, guestPhone: undefined, guestName: undefined }
          : { guestPhone: data.patientPhone, guestName: data.patientName, patientId: undefined }),
      },
      $setOnInsert: { sharedWithDoctor: false, createdAt: now },
    },
    { upsert: true, new: true }
  );

  if (patient) {
    await notifyPatient(patient._id.toString(), data.eventType, data);
    if (data.eventType === 'BOOKING_CREATED') {
      await notifyDoctorOfEmergency(patient._id, data);
    }
  }

  return res.json({ success: true, data: record, eventType: data.eventType });
}

export async function getRapidCareHistory(req: Request, res: Response) {
  const patientId = String(req.params.patientId);
  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    return res.status(400).json({ success: false, message: 'Invalid patient ID' });
  }
  if (req.user!.userId !== patientId && req.user!.userType !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const pid = new mongoose.Types.ObjectId(patientId);
  const user = await User.findById(pid).select('phone');

  const byPatient = await EmergencyRecord.find({ patientId: pid }).sort({ createdAt: -1 }).limit(50);
  const byPhone =
    user?.phone
      ? await EmergencyRecord.find({
          guestPhone: user.phone,
          $or: [{ patientId: { $exists: false } }, { patientId: null }],
        })
          .sort({ createdAt: -1 })
          .limit(50)
      : [];

  const merged = [...byPatient, ...byPhone].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return res.json({ success: true, data: merged });
}

export async function shareRapidCareWithDoctor(req: Request, res: Response) {
  const bookingId = String(req.params.bookingId);
  const record = await EmergencyRecord.findOne({ bookingId });
  if (!record) {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  const patientId = req.user!.userId;
  const user = await User.findById(patientId).select('phone');
  const ownsRecord =
    (record.patientId && record.patientId.toString() === patientId) ||
    (user?.phone && record.guestPhone === user.phone);
  if (!ownsRecord) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  record.sharedWithDoctor = true;
  await record.save();

  const pid = record.patientId || new mongoose.Types.ObjectId(patientId);
  const appointment = await Appointment.findOne({
    patientId: pid,
    status: { $in: ['confirmed', 'completed', 'in-progress'] },
  })
    .sort({ scheduledDate: -1, createdAt: -1 });

  if (appointment?.doctorId) {
    const doctorId = appointment.doctorId.toString();
    const title = 'Patient shared emergency report';
    const message = `${record.patientName} shared a RapidCare trip report (${record.bookingId}).`;

    const notification = await Notification.create({
      userId: doctorId,
      type: 'RAPIDCARE_UPDATE',
      title,
      message,
      data: { bookingId: record.bookingId, icon: '🚑', shared: true },
      isRead: false,
      sentAt: new Date(),
    });

    emitToUser(doctorId, 'notification:new', {
      _id: notification._id,
      type: 'RAPIDCARE_UPDATE',
      icon: '🚑',
      title,
      message,
      bookingId: record.bookingId,
      sentAt: notification.sentAt,
      isRead: false,
    });
  }

  return res.json({ success: true, data: record });
}
