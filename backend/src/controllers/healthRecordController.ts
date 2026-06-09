import { Request, Response } from 'express';
import { HealthRecord } from '../models/index.js';
import { asyncHandler } from '../middleware/validate.js';
import { getFileUrl } from '../services/uploadService.js';

export const getHealthRecords = asyncHandler(async (req: Request, res: Response) => {
  const { recordType, search, tag } = req.query;
  const filter: Record<string, unknown> = { patientId: req.user!.userId };

  if (recordType) filter.recordType = recordType;
  if (tag) filter.tags = tag;
  if (search) filter.$text = { $search: search as string };

  const records = await HealthRecord.find(filter).sort({ date: -1 });
  res.json({ success: true, data: records });
});

export const getHealthRecordById = asyncHandler(async (req: Request, res: Response) => {
  const record = await HealthRecord.findById(req.params.id);
  if (!record) {
    res.status(404).json({ success: false, message: 'Record not found' });
    return;
  }

  if (record.patientId.toString() !== req.user!.userId && req.user!.userType !== 'admin') {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  res.json({ success: true, data: record });
});

export const createHealthRecord = asyncHandler(async (req: Request, res: Response) => {
  const { recordType, title, description, date, tags } = req.body;
  const files = (req.files as Express.Multer.File[] | undefined)?.map((f) => ({
    fileName: f.originalname,
    fileUrl: getFileUrl(f.filename),
    fileType: f.mimetype,
    uploadedAt: new Date(),
  })) || [];

  const record = await HealthRecord.create({
    patientId: req.user!.userId,
    recordType,
    title,
    description,
    date: date ? new Date(date) : new Date(),
    tags: tags ? (typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()) : tags) : [],
    files,
  });

  res.status(201).json({ success: true, data: record });
});

export const updateHealthRecord = asyncHandler(async (req: Request, res: Response) => {
  const record = await HealthRecord.findById(req.params.id);
  if (!record) {
    res.status(404).json({ success: false, message: 'Record not found' });
    return;
  }

  if (record.patientId.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  const { title, description, recordType, tags } = req.body;
  if (title) record.title = title;
  if (description !== undefined) record.description = description;
  if (recordType) record.recordType = recordType;
  if (tags) record.tags = typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()) : tags;

  await record.save();
  res.json({ success: true, data: record });
});

export const deleteHealthRecord = asyncHandler(async (req: Request, res: Response) => {
  const record = await HealthRecord.findById(req.params.id);
  if (!record) {
    res.status(404).json({ success: false, message: 'Record not found' });
    return;
  }

  if (record.patientId.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  await record.deleteOne();
  res.json({ success: true, message: 'Record deleted' });
});

export const shareHealthRecord = asyncHandler(async (req: Request, res: Response) => {
  const { doctorId, expiresAt } = req.body;
  const record = await HealthRecord.findById(req.params.id);

  if (!record) {
    res.status(404).json({ success: false, message: 'Record not found' });
    return;
  }

  if (record.patientId.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  record.sharedWith = record.sharedWith || [];
  record.sharedWith.push({
    doctorId,
    sharedAt: new Date(),
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
  });
  await record.save();

  res.json({ success: true, data: record });
});
