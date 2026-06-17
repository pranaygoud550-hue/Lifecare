import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/validate.js';
import {
  createHospitalAdminAccount,
  listHospitalAdmins,
  getHospitalAdminWithHospital,
  acknowledgeHospitalLegal,
  isHospitalLegalComplete,
} from '../services/hospitalAdminService.js';
import { listAllBloodAlertsAdmin } from '../services/bloodEmergencyService.js';
import {
  HOSPITAL_BLOOD_ALERT_LEGAL_FULL,
  HOSPITAL_BLOOD_ALERT_LEGAL_SUMMARY,
  HOSPITAL_LEGAL_TERMS_VERSION,
} from '../constants/hospitalLegalTerms.js';

export const createHospitalAdmin = asyncHandler(async (req: Request, res: Response) => {
  const user = await createHospitalAdminAccount(req.body);
  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      email: user.email,
      phone: user.phone,
      profile: user.profile,
      hospitalAdminDetails: user.hospitalAdminDetails,
    },
  });
});

export const getHospitalAdmins = asyncHandler(async (_req: Request, res: Response) => {
  const admins = await listHospitalAdmins();
  res.json({ success: true, data: admins });
});

export const getMyHospitalProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await getHospitalAdminWithHospital(req.user!.userId);
  res.json({
    success: true,
    data: {
      ...profile,
      legalComplete: isHospitalLegalComplete(profile.hospitalAdminDetails),
      legalTermsVersion: HOSPITAL_LEGAL_TERMS_VERSION,
      legalSummary: HOSPITAL_BLOOD_ALERT_LEGAL_SUMMARY,
      legalFullText: HOSPITAL_BLOOD_ALERT_LEGAL_FULL,
    },
  });
});

export const postHospitalLegalAcknowledgment = asyncHandler(async (req: Request, res: Response) => {
  const user = await acknowledgeHospitalLegal(req.user!.userId, req.body);
  res.json({
    success: true,
    data: {
      legalComplete: isHospitalLegalComplete(user.hospitalAdminDetails),
      hospitalAdminDetails: user.hospitalAdminDetails,
    },
  });
});

export const getAdminBloodAlerts = asyncHandler(async (_req: Request, res: Response) => {
  const alerts = await listAllBloodAlertsAdmin();
  res.json({ success: true, data: alerts });
});
