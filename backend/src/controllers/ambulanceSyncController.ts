import type { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { EmergencyRecord } from '../models/EmergencyRecord.js';
import { User } from '../models/User.js';
import { HealthRecord } from '../models/HealthRecord.js';
import { createNotification } from '../services/notificationService.js';

const syncSchema = z.object({
  rapidcareBookingId: z.string().min(3),
  patientName: z.string().min(2),
  patientPhone: z.string().min(10),
  lifecarePatientId: z.string().optional(),
  pickupLocation: z.string(),
  hospital: z.string(),
  vehicleType: z.string(),
  condition: z.string(),
  dispatchTime: z.string(),
  arrivalTime: z.string(),
  responseTimeMinutes: z.number(),
  driverName: z.string(),
  vehicleNumber: z.string(),
  fare: z.number(),
  paymentStatus: z.string(),
});

export async function syncRapidCareBooking(req: Request, res: Response) {
  const secret = req.headers['x-rapidcare-secret'];
  if (!process.env.LIFECARE_WEBHOOK_SECRET || secret !== process.env.LIFECARE_WEBHOOK_SECRET) {
    return res.status(401).json({ success: false, message: 'Invalid webhook secret' });
  }

  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.flatten() });
  }

  const data = parsed.data;
  const existing = await EmergencyRecord.findOne({ rapidcareBookingId: data.rapidcareBookingId });
  if (existing) {
    return res.json({ success: true, data: existing, message: 'Already synced' });
  }

  let patientId: mongoose.Types.ObjectId | undefined;
  if (data.lifecarePatientId && mongoose.Types.ObjectId.isValid(data.lifecarePatientId)) {
    patientId = new mongoose.Types.ObjectId(data.lifecarePatientId);
  } else {
    const user = await User.findOne({ phone: data.patientPhone, role: 'patient' });
    if (user) patientId = user._id;
  }

  const record = await EmergencyRecord.create({
    rapidcareBookingId: data.rapidcareBookingId,
    patientId,
    guestPhone: patientId ? undefined : data.patientPhone,
    guestName: patientId ? undefined : data.patientName,
    patientName: data.patientName,
    patientPhone: data.patientPhone,
    pickupLocation: data.pickupLocation,
    hospital: data.hospital,
    vehicleType: data.vehicleType,
    condition: data.condition,
    dispatchTime: new Date(data.dispatchTime),
    arrivalTime: new Date(data.arrivalTime),
    responseTimeMinutes: data.responseTimeMinutes,
    driverName: data.driverName,
    vehicleNumber: data.vehicleNumber,
    fare: data.fare,
    paymentStatus: data.paymentStatus,
    source: 'rapidcare',
  });

  if (patientId) {
    await HealthRecord.create({
      patientId,
      recordType: 'other',
      title: `RapidCare ${data.vehicleType} — ${data.hospital}`,
      description: `${data.condition}. Response: ${data.responseTimeMinutes} min. Driver: ${data.driverName} (${data.vehicleNumber}).`,
      date: new Date(data.dispatchTime),
      tags: ['rapidcare', 'emergency_transport'],
      files: [],
    });

    await createNotification({
      userId: patientId.toString(),
      type: 'emergency_sync',
      title: 'Emergency trip recorded',
      message: `Your RapidCare booking ${data.rapidcareBookingId} was added to your medical history.`,
      data: { rapidcareBookingId: data.rapidcareBookingId, tab: 'emergency' },
    });
  }

  return res.status(201).json({ success: true, data: record });
}

export async function getPatientEmergencyHistory(req: Request, res: Response) {
  const patientId = new mongoose.Types.ObjectId(req.user!.userId);
  const user = await User.findById(patientId).select('phone');
  const records = await EmergencyRecord.find({ patientId }).sort({ dispatchTime: -1 }).limit(50);
  const byPhone =
    user?.phone
      ? await EmergencyRecord.find({
          guestPhone: user.phone,
          patientId: { $exists: false },
        }).sort({ dispatchTime: -1 })
      : [];

  const merged = [...records, ...byPhone].sort(
    (a, b) => b.dispatchTime.getTime() - a.dispatchTime.getTime()
  );

  return res.json({ success: true, data: merged });
}

export async function getEmergencyRecordById(req: Request, res: Response) {
  const patientId = new mongoose.Types.ObjectId(req.user!.userId);
  const user = await User.findById(patientId).select('phone');
  const record = await EmergencyRecord.findOne({
    rapidcareBookingId: req.params.id,
    $or: [{ patientId }, ...(user?.phone ? [{ guestPhone: user.phone }] : [])],
  });
  if (!record) return res.status(404).json({ success: false, message: 'Not found' });
  return res.json({ success: true, data: record });
}
