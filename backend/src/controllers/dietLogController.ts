import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/validate.js';
import { logDietEntry, getDietLogsForPatient, getTodayDietLogs } from '../services/dietLogService.js';

export const postDietLog = asyncHandler(async (req: Request, res: Response) => {
  const log = await logDietEntry(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: log });
});

export const getDietLogs = asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(parseInt(String(req.query.days || '7'), 10) || 7, 30);
  const logs = await getDietLogsForPatient(req.user!.userId, days);
  res.json({ success: true, data: logs });
});

export const getTodayDietLog = asyncHandler(async (req: Request, res: Response) => {
  const logs = await getTodayDietLogs(req.user!.userId);
  res.json({ success: true, data: logs });
});
