import { Types } from 'mongoose';
import { ScanReport, Appointment, User } from '../models/index.js';
import type { IScanReport } from '../models/ScanReport.js';
import type {
  MediScanAnalyzeResponse,
  ScanCompleteSocketPayload,
  ScanFlag,
  ScanType,
} from '../types/scan.js';
import { emitToUser } from './socketService.js';
import {
  createNotification,
  notifyScanAnalysisComplete,
  notifyScanLowConfidenceDoctor,
  notifyScanReviewedByDoctor,
  notifyScanUrgentWithBooking,
} from './notificationService.js';
import {
  formatPatientName,
  isUrgentScanPrediction,
  scanTypeLabelForNotification,
} from '../utils/scanNotifications.js';
import { buildSkinCareAdvice } from '../utils/skinCareAdvice.js';
import { resolveScanAssetUrl } from './localScanStorage.js';
import { analyzeMedicalScan } from './mlScanAnalyzer.js';
import { enqueueScanAnalysis } from './scanAnalysisQueue.js';
import { syncScanToHealthVault } from './scanHistoryService.js';

const LOW_CONFIDENCE_THRESHOLD = 60;

export interface CreatePendingScanInput {
  patientId: string;
  scanType: ScanType;
  cloudinaryUrl: string;
  cloudinaryPublicId?: string;
  appointmentId?: string;
  doctorId?: string;
  isDicom?: boolean;
  dicomPythonConversion?: boolean;
}

function mapProbabilities(probs: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(probs));
}

function probabilitiesToObject(map?: Map<string, number>): Record<string, number> {
  if (!map) return {};
  return Object.fromEntries(map.entries());
}

export function scanReportToJSON(report: IScanReport) {
  const obj = report.toObject();
  return {
    ...obj,
    probabilities: probabilitiesToObject(report.probabilities),
  };
}

function isAiServiceUnavailable(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    if (/ECONNREFUSED|fetch failed|network/i.test(err.message)) return true;
    const match = err.message.match(/MediScan API error \((\d+)\)/);
    if (match && ['502', '503', '504'].includes(match[1])) return true;
  }
  return false;
}

async function callMediScanAnalyze(input: {
  cloudinaryUrl: string;
  scanType: ScanType;
  isDicom?: boolean;
  originalFilename?: string;
}): Promise<MediScanAnalyzeResponse> {
  const imageRes = await fetch(resolveScanAssetUrl(input.cloudinaryUrl));
  if (!imageRes.ok) {
    throw new Error(`Failed to fetch scan image from storage (${imageRes.status})`);
  }

  const buffer = Buffer.from(await imageRes.arrayBuffer());
  const mime = input.isDicom
    ? 'application/dicom'
    : imageRes.headers.get('content-type') ?? 'image/jpeg';
  const filename =
    input.originalFilename ?? (input.isDicom ? 'scan.dcm' : input.scanType === 'chest_xray' ? 'chest.jpg' : 'scan.jpg');

  const unified = await analyzeMedicalScan({
    buffer,
    mimetype: mime,
    originalname: filename,
    scanType: input.scanType,
  });

  return {
    prediction: unified.prediction,
    confidence: unified.confidence,
    probabilities: unified.probabilities,
    gradcam_url: unified.gradcamUrl,
  };
}

async function resolveDoctorId(
  appointmentId?: string,
  explicitDoctorId?: string
): Promise<Types.ObjectId | undefined> {
  if (explicitDoctorId) {
    return new Types.ObjectId(explicitDoctorId);
  }
  if (!appointmentId) return undefined;

  const appointment = await Appointment.findById(appointmentId).select('doctorId');
  return appointment?.doctorId;
}

async function loadPatientProfile(patientId: Types.ObjectId) {
  const user = await User.findById(patientId).select('profile.firstName profile.lastName');
  return user?.profile;
}

async function notifyDoctorAiUnavailable(
  doctorId: Types.ObjectId,
  report: IScanReport
): Promise<void> {
  const profile = await loadPatientProfile(report.patientId as Types.ObjectId);
  const patientName = formatPatientName(profile);
  await createNotification({
    userId: doctorId,
    type: 'scan',
    title: 'MediScan — manual review required',
    message: `AI analysis unavailable for ${patientName}'s scan. Please review manually.`,
    data: { scanId: report._id, scanType: report.scanType, status: 'ai_unavailable' },
    socketEvent: 'scan:ai_unavailable',
  });
}

/**
 * Create a pending ScanReport after Cloudinary upload; enqueue background AI job.
 */
export async function createPendingScanReport(input: CreatePendingScanInput): Promise<IScanReport> {
  const doctorId = await resolveDoctorId(input.appointmentId, input.doctorId);

  const report = await ScanReport.create({
    patientId: input.patientId,
    doctorId,
    scanType: input.scanType,
    imageUrl: input.cloudinaryUrl,
    cloudinaryPublicId: input.cloudinaryPublicId,
    status: 'pending',
    appointmentId: input.appointmentId,
    isSharedWithDoctor: false,
    flags: [],
    isDicom: input.isDicom ?? false,
    dicomPythonConversion: input.dicomPythonConversion ?? false,
  });

  enqueueScanAnalysis(report._id.toString());
  return report;
}

/**
 * Background job: call Python MediScan API, update report, emit Socket.io events.
 */
export async function runScanAnalysisJob(reportId: string): Promise<void> {
  const report = await ScanReport.findById(reportId);
  if (!report || report.status !== 'pending') {
    return;
  }

  try {
    const aiResult = await callMediScanAnalyze({
      cloudinaryUrl: report.imageUrl,
      scanType: report.scanType,
      isDicom: report.isDicom,
    });

    const confidence =
      typeof aiResult.confidence === 'number'
        ? aiResult.confidence <= 1
          ? aiResult.confidence * 100
          : aiResult.confidence
        : 0;

    const flags: ScanFlag[] = [];
    if (confidence < LOW_CONFIDENCE_THRESHOLD) {
      flags.push('low_confidence');
    }

    report.prediction = aiResult.prediction;
    report.confidence = confidence;
    report.probabilities = mapProbabilities(aiResult.probabilities ?? {});
    report.gradcamUrl = aiResult.gradcam_url ?? aiResult.gradcamUrl;
    report.analysisSource = 'integrated';
    report.mlEngine = 'lifecare-integrated';
    report.status = 'ai_analyzed';
    report.flags = flags;
    report.aiAnalyzedAt = new Date();
    if (report.scanType === 'skin_lesion') {
      report.skinCareAdvice =
        buildSkinCareAdvice(
          report.prediction,
          report.confidence,
          probabilitiesToObject(report.probabilities)
        ) ?? undefined;
    }
    await report.save();

    if (report.prediction && report.confidence != null) {
      await syncScanToHealthVault({
        patientId: report.patientId.toString(),
        scanId: report._id.toString(),
        scanType: report.scanType,
        prediction: report.prediction,
        confidence: report.confidence,
        imageUrl: report.imageUrl,
        createdAt: report.aiAnalyzedAt ?? new Date(),
      }).catch(() => undefined);
    }

    const payload: ScanCompleteSocketPayload = {
      scanId: report._id.toString(),
      scanType: report.scanType,
      prediction: report.prediction!,
      confidence: report.confidence!,
      status: report.status,
      flags: report.flags,
      imageUrl: report.imageUrl,
      gradcamUrl: report.gradcamUrl,
    };

    emitToUser(report.patientId.toString(), 'scan:complete', payload);

    const typeLabel = scanTypeLabelForNotification(report.scanType);
    const patientProfile = await loadPatientProfile(report.patientId as Types.ObjectId);

    if (isUrgentScanPrediction(report.prediction, report.confidence)) {
      await notifyScanUrgentWithBooking(report.patientId.toString(), {
        scanId: report._id.toString(),
        condition: report.prediction!,
        scanType: report.scanType,
      });
    } else {
      await notifyScanAnalysisComplete(report.patientId.toString(), {
        scanId: report._id.toString(),
        scanTypeLabel: typeLabel,
      });
    }

    if (flags.includes('low_confidence') && report.doctorId) {
      await notifyScanLowConfidenceDoctor(report.doctorId.toString(), {
        scanId: report._id.toString(),
        patientName: formatPatientName(patientProfile),
      });
    }
  } catch (err) {
    if (!isAiServiceUnavailable(err)) {
      console.error(`[MediScan] Unexpected analysis error for ${reportId}:`, err);
    }

    report.status = 'ai_unavailable';
    if (!report.flags.includes('manual_review')) {
      report.flags = [...report.flags, 'manual_review'];
    }
    await report.save();

    emitToUser(report.patientId.toString(), 'scan:ai_unavailable', {
      scanId: report._id.toString(),
      scanType: report.scanType,
      status: report.status,
      imageUrl: report.imageUrl,
      message: 'AI analysis is temporarily unavailable. A doctor will review your scan.',
    });

    if (report.doctorId) {
      await notifyDoctorAiUnavailable(report.doctorId, report);
    }
  }
}

export async function getPatientReports(patientId: string) {
  const reports = await ScanReport.find({ patientId }).sort({ createdAt: -1 });
  return reports.map(scanReportToJSON);
}

export async function getReportById(reportId: string): Promise<IScanReport | null> {
  return ScanReport.findById(reportId);
}

export async function shareReportWithDoctor(
  reportId: string,
  patientId: string,
  doctorId?: string
): Promise<IScanReport | null> {
  const report = await ScanReport.findOne({ _id: reportId, patientId });
  if (!report) return null;

  report.isSharedWithDoctor = true;
  if (doctorId) {
    report.doctorId = new Types.ObjectId(doctorId);
  }
  await report.save();
  return report;
}

export interface DoctorReviewInput {
  doctorNote?: string;
  doctorOverride?: string;
  markFinal?: boolean;
  aiConfirmed?: boolean;
  requestMoreTests?: boolean;
  reviewDurationSeconds?: number;
}

export interface DoctorScansFilter {
  status?: string;
  scanType?: string;
}

export interface DoctorScanAnalytics {
  totalScansThisMonth: number;
  aiAccuracyRate: number;
  mostCommonCondition: string;
  averageReviewTimeMinutes: number;
  pendingCount: number;
}

export async function doctorReviewReport(
  reportId: string,
  doctorId: string,
  input: DoctorReviewInput
): Promise<IScanReport | null> {
  const report = await ScanReport.findOne({
    _id: reportId,
    status: { $in: ['ai_analyzed', 'ai_unavailable', 'doctor_reviewed'] },
    $or: [{ doctorId }, { isSharedWithDoctor: true }],
  });

  if (!report) return null;

  if (report.doctorId && report.doctorId.toString() !== doctorId) {
    return null;
  }

  if (!report.doctorId) {
    report.doctorId = new Types.ObjectId(doctorId);
  }

  if (input.doctorNote !== undefined) report.doctorNote = input.doctorNote;
  if (input.doctorOverride !== undefined) report.doctorOverride = input.doctorOverride;
  if (input.aiConfirmed !== undefined) report.aiConfirmed = input.aiConfirmed;
  if (input.requestMoreTests !== undefined) report.requestMoreTests = input.requestMoreTests;
  if (input.reviewDurationSeconds !== undefined) {
    report.reviewDurationSeconds = input.reviewDurationSeconds;
  }
  report.reviewedAt = new Date();
  report.status = input.markFinal ? 'final' : 'doctor_reviewed';
  await report.save();

  const reviewPayload = {
    scanId: report._id.toString(),
    status: report.status,
    doctorNote: report.doctorNote,
    doctorOverride: report.doctorOverride,
    markFinal: input.markFinal ?? false,
  };

  emitToUser(report.patientId.toString(), 'scan:reviewed', reviewPayload);

  const doctor = await User.findById(doctorId).select('profile.firstName profile.lastName');
  const doctorName = formatPatientName(doctor?.profile);

  if (input.markFinal) {
    await notifyScanReviewedByDoctor(report.patientId.toString(), {
      scanId: report._id.toString(),
      doctorName,
    });
  }

  if (input.requestMoreTests) {
    await createNotification({
      userId: report.patientId,
      type: 'scan',
      title: 'Additional tests recommended',
      message: 'Your doctor recommends more tests based on your MediScan results.',
      data: { scanId: report._id },
    });
  }

  return report;
}

function doctorScanAccessFilter(doctorId: string) {
  const oid = new Types.ObjectId(doctorId);
  return {
    $or: [{ doctorId: oid }, { isSharedWithDoctor: true, doctorId: oid }],
  };
}

export async function getDoctorScans(doctorId: string, filters: DoctorScansFilter = {}) {
  const query: Record<string, unknown> = {
    ...doctorScanAccessFilter(doctorId),
  };
  if (filters.status) query.status = filters.status;
  if (filters.scanType) query.scanType = filters.scanType;

  const reports = await ScanReport.find(query)
    .sort({ createdAt: -1 })
    .populate(
      'patientId',
      'profile.firstName profile.lastName email phone profile.dateOfBirth medicalHistory'
    );

  return reports.map((r) => {
    const json = scanReportToJSON(r) as Record<string, unknown>;
    const patient = r.patientId as unknown as {
      _id: Types.ObjectId;
      profile?: { firstName?: string; lastName?: string; dateOfBirth?: Date };
      medicalHistory?: Record<string, unknown>;
    };
    if (patient && typeof patient === 'object' && patient._id) {
      json.patient = {
        _id: patient._id.toString(),
        profile: patient.profile,
        medicalHistory: patient.medicalHistory,
      };
    }
    return json;
  });
}

export async function getDoctorPendingScans(doctorId: string) {
  return getDoctorScans(doctorId, {
    status: undefined,
  }).then((all) =>
    all.filter((s) =>
      ['ai_analyzed', 'ai_unavailable'].includes((s as { status: string }).status)
    )
  );
}

export async function getDoctorScanAnalytics(doctorId: string): Promise<DoctorScanAnalytics> {
  const oid = new Types.ObjectId(doctorId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const access = doctorScanAccessFilter(doctorId);
  const monthScans = await ScanReport.find({
    ...access,
    createdAt: { $gte: monthStart },
  });

  const reviewed = await ScanReport.find({
    ...access,
    reviewedAt: { $exists: true },
    aiConfirmed: { $exists: true },
  });

  const confirmed = reviewed.filter((r) => r.aiConfirmed === true).length;
  const aiAccuracyRate =
    reviewed.length > 0 ? Math.round((confirmed / reviewed.length) * 100) : 0;

  const predictionCounts = new Map<string, number>();
  for (const s of monthScans) {
    if (s.prediction) {
      const key = s.prediction.trim();
      predictionCounts.set(key, (predictionCounts.get(key) ?? 0) + 1);
    }
  }
  let mostCommonCondition = '—';
  let max = 0;
  for (const [k, v] of predictionCounts) {
    if (v > max) {
      max = v;
      mostCommonCondition = k;
    }
  }

  const withDuration = reviewed.filter((r) => r.reviewDurationSeconds != null);
  const avgSeconds =
    withDuration.length > 0
      ? withDuration.reduce((sum, r) => sum + (r.reviewDurationSeconds ?? 0), 0) /
        withDuration.length
      : 0;

  const pendingCount = await ScanReport.countDocuments({
    ...access,
    status: { $in: ['ai_analyzed', 'ai_unavailable'] },
  });

  return {
    totalScansThisMonth: monthScans.length,
    aiAccuracyRate,
    mostCommonCondition,
    averageReviewTimeMinutes: Math.round((avgSeconds / 60) * 10) / 10,
    pendingCount,
  };
}
