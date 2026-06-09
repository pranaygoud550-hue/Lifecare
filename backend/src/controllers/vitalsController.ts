import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { VitalReading } from '../models/index.js';
import { asyncHandler } from '../middleware/validate.js';

export const logVital = asyncHandler(async (req: Request, res: Response) => {
  const { type, recordedAt, systolic, diastolic, glucose, glucoseMeal, value, unit, notes } = req.body;

  const reading = await VitalReading.create({
    patientId: req.user!.userId,
    type,
    recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    systolic,
    diastolic,
    glucose,
    glucoseMeal,
    value,
    unit,
    notes,
  });

  res.status(201).json({ success: true, data: reading });
});

export const getVitals = asyncHandler(async (req: Request, res: Response) => {
  const { type, days = '30' } = req.query;
  const daysNum = Math.min(90, Math.max(1, parseInt(days as string, 10) || 30));
  const since = new Date();
  since.setDate(since.getDate() - daysNum);

  const filter: Record<string, unknown> = {
    patientId: new Types.ObjectId(req.user!.userId),
    recordedAt: { $gte: since },
  };
  if (type) filter.type = type;

  const readings = await VitalReading.find(filter).sort({ recordedAt: 1 });

  const latestByType = await VitalReading.aggregate([
    { $match: { patientId: new Types.ObjectId(req.user!.userId) } },
    { $sort: { recordedAt: -1 } },
    {
      $group: {
        _id: '$type',
        latest: { $first: '$$ROOT' },
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      readings,
      latest: latestByType.map((g) => g.latest),
      periodDays: daysNum,
    },
  });
});

export const deleteVital = asyncHandler(async (req: Request, res: Response) => {
  const reading = await VitalReading.findOneAndDelete({
    _id: req.params.id,
    patientId: req.user!.userId,
  });

  if (!reading) {
    res.status(404).json({ success: false, message: 'Reading not found' });
    return;
  }

  res.json({ success: true, message: 'Deleted' });
});
