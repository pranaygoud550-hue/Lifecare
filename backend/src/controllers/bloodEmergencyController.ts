import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/validate.js';
import {
  createBloodAlert,
  getHospitalBloodAlerts,
  getBloodAlertDetailForHospital,
  updateBloodAlertStatus,
  getActiveBloodAlertsForPatients,
  respondToBloodAlert,
} from '../services/bloodEmergencyService.js';

export const postBloodAlert = asyncHandler(async (req: Request, res: Response) => {
  const alert = await createBloodAlert(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: alert });
});

export const getHospitalAlerts = asyncHandler(async (req: Request, res: Response) => {
  const alerts = await getHospitalBloodAlerts(req.user!.userId);
  res.json({ success: true, data: alerts });
});

export const getHospitalAlertById = asyncHandler(async (req: Request, res: Response) => {
  const alert = await getBloodAlertDetailForHospital(req.user!.userId, String(req.params.id));
  res.json({ success: true, data: alert });
});

export const patchHospitalAlert = asyncHandler(async (req: Request, res: Response) => {
  const alert = await updateBloodAlertStatus(req.user!.userId, String(req.params.id), req.body.status);
  res.json({ success: true, data: alert });
});

export const getActiveBloodAlerts = asyncHandler(async (_req: Request, res: Response) => {
  const alerts = await getActiveBloodAlertsForPatients();
  res.json({ success: true, data: alerts });
});

export const postBloodAlertResponse = asyncHandler(async (req: Request, res: Response) => {
  const alert = await respondToBloodAlert(req.user!.userId, String(req.params.id), req.body.status);
  res.json({ success: true, data: alert });
});
