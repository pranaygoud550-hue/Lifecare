import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/validate.js';
import type { IScanReport } from '../models/ScanReport.js';
import {
  createPendingScanReport,
  getPatientReports,
  getReportById,
  shareReportWithDoctor,
  doctorReviewReport,
  getDoctorPendingScans,
  getDoctorScans,
  getDoctorScanAnalytics,
  scanReportToJSON,
} from '../services/scanService.js';
import type { ScanType } from '../types/scan.js';

type RequestWithScan = Request & { scanReport?: IScanReport };

export const uploadScan = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;

  if (!file?.cloudinaryUrl) {
    res.status(503).json({
      success: false,
      message: 'Image upload is temporarily unavailable. Please try again in a few moments.',
      code: 'CLOUDINARY_UNAVAILABLE',
    });
    return;
  }

  const scanType = req.body.scanType as ScanType;
  if (!['chest_xray', 'skin_lesion', 'retina'].includes(scanType)) {
    res.status(400).json({
      success: false,
      message: 'scanType must be chest_xray, skin_lesion, or retina',
    });
    return;
  }

  const report = await createPendingScanReport({
    patientId: req.user!.userId,
    scanType,
    cloudinaryUrl: file.cloudinaryUrl,
    cloudinaryPublicId: file.cloudinaryPublicId,
    appointmentId: req.body.appointmentId,
    doctorId: req.body.doctorId,
    isDicom: file.isDicom,
    dicomPythonConversion: file.dicomPythonConversion,
  });

  res.status(202).json({
    success: true,
    message:
      'Scan uploaded successfully. AI analysis is running in the background — you will be notified when results are ready.',
    data: {
      ...scanReportToJSON(report),
      analysisStatus: 'queued',
    },
  });
});

export const getMyScanReports = asyncHandler(async (req: Request, res: Response) => {
  const reports = await getPatientReports(req.user!.userId);
  res.json({ success: true, data: reports });
});

export const getScanReportById = asyncHandler(async (req: Request, res: Response) => {
  const scanId = String(req.params.id);
  const cached = (req as RequestWithScan).scanReport;
  const report = cached ?? (await getReportById(scanId));

  if (!report) {
    res.status(404).json({ success: false, message: 'Scan report not found' });
    return;
  }

  res.json({ success: true, data: scanReportToJSON(report) });
});

export const shareScanReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await shareReportWithDoctor(
    String(req.params.id),
    req.user!.userId,
    req.body.doctorId
  );

  if (!report) {
    res.status(404).json({ success: false, message: 'Scan report not found' });
    return;
  }

  res.json({
    success: true,
    message: 'Scan shared with doctor',
    data: scanReportToJSON(report),
  });
});

export const reviewScanReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await doctorReviewReport(String(req.params.id), req.user!.userId, {
    doctorNote: req.body.doctorNote,
    doctorOverride: req.body.doctorOverride,
    markFinal: req.body.markFinal,
    aiConfirmed: req.body.aiConfirmed,
    requestMoreTests: req.body.requestMoreTests,
    reviewDurationSeconds: req.body.reviewDurationSeconds,
  });

  if (!report) {
    res.status(404).json({
      success: false,
      message: 'Scan not found or not available for your review',
    });
    return;
  }

  res.json({
    success: true,
    message: 'Scan review saved',
    data: scanReportToJSON(report),
  });
});

export const getDoctorPendingScanReports = asyncHandler(async (req: Request, res: Response) => {
  const reports = await getDoctorPendingScans(req.user!.userId);
  res.json({ success: true, data: reports });
});

export const getDoctorScanList = asyncHandler(async (req: Request, res: Response) => {
  const { status, scanType } = req.query;
  const reports = await getDoctorScans(req.user!.userId, {
    status: status as string | undefined,
    scanType: scanType as string | undefined,
  });
  res.json({ success: true, data: reports });
});

export const getDoctorScanAnalyticsHandler = asyncHandler(async (req: Request, res: Response) => {
  const analytics = await getDoctorScanAnalytics(req.user!.userId);
  res.json({ success: true, data: analytics });
});
