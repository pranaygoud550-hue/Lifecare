import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { EmergencyRecord } from '../models/EmergencyRecord.js';
import { User } from '../models/User.js';

export async function getPatientEmergencyHistory(req: Request, res: Response) {
  const patientId = new mongoose.Types.ObjectId(req.user!.userId);
  const user = await User.findById(patientId).select('phone');

  const records = await EmergencyRecord.find({ patientId }).sort({ createdAt: -1 }).limit(50);
  const byPhone =
    user?.phone
      ? await EmergencyRecord.find({
          guestPhone: user.phone,
          $or: [{ patientId: { $exists: false } }, { patientId: null }],
        }).sort({ createdAt: -1 })
      : [];

  const merged = [...records, ...byPhone].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return res.json({ success: true, data: merged });
}

export async function getEmergencyRecordById(req: Request, res: Response) {
  const patientId = new mongoose.Types.ObjectId(req.user!.userId);
  const user = await User.findById(patientId).select('phone');
  const record = await EmergencyRecord.findOne({
    bookingId: req.params.id,
    $or: [{ patientId }, ...(user?.phone ? [{ guestPhone: user.phone }] : [])],
  });
  if (!record) return res.status(404).json({ success: false, message: 'Not found' });
  return res.json({ success: true, data: record });
}
