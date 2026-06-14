import { Types } from 'mongoose';
import { HealthRecord } from '../models/index.js';
import { getPatientScans, scanToJSON } from './chestScanService.js';
import { getPatientReports, scanReportToJSON } from './scanService.js';
import type { ScanType } from '../types/scan.js';

export type UnifiedScanSource = 'mediscan_report' | 'chest_analyze';

export interface UnifiedScanHistoryItem {
  id: string;
  source: UnifiedScanSource;
  scanType: ScanType;
  imageUrl: string;
  prediction?: string;
  confidence?: number;
  status?: string;
  sharedWithDoctor?: boolean;
  explanation?: string;
  createdAt: string;
  healthRecordId?: string;
}

const SCAN_TYPE_LABELS: Record<ScanType, string> = {
  chest_xray: 'Chest X-ray',
  skin_lesion: 'Skin scan',
  retina: 'Eye (retina) scan',
};

export function scanTypeLabel(type: ScanType): string {
  return SCAN_TYPE_LABELS[type] ?? type;
}

/** Persist AI scan in the patient health vault for long-term recall. */
export async function syncScanToHealthVault(input: {
  patientId: string;
  scanId: string;
  scanType: ScanType;
  prediction: string;
  confidence: number;
  imageUrl: string;
  explanation?: string;
  createdAt?: Date;
}) {
  const tag = `scan:${input.scanId}`;
  const existing = await HealthRecord.findOne({
    patientId: input.patientId,
    tags: tag,
  });
  if (existing) {
    return existing._id.toString();
  }

  const title = `${scanTypeLabel(input.scanType)} — ${input.prediction}`;
  const description =
    input.explanation?.trim() ||
    `AI screening: ${input.prediction} (${input.confidence.toFixed(1)}% confidence). Not a medical diagnosis.`;

  const record = await HealthRecord.create({
    patientId: new Types.ObjectId(input.patientId),
    recordType: 'image',
    title,
    description,
    date: input.createdAt ?? new Date(),
    tags: ['mediscan', input.scanType, tag],
    files: [
      {
        fileName: `${input.scanType}-${input.scanId.slice(-6)}.jpg`,
        fileUrl: input.imageUrl,
        fileType: 'image/jpeg',
        uploadedAt: input.createdAt ?? new Date(),
      },
    ],
  });

  return record._id.toString();
}

/** All patient scans — MediScan studio (skin, retina, chest upload) + chest analyze API. */
export async function getUnifiedPatientScanHistory(patientId: string): Promise<UnifiedScanHistoryItem[]> {
  const [chestScans, reports] = await Promise.all([
    getPatientScans(patientId),
    getPatientReports(patientId),
  ]);

  const chestItems: UnifiedScanHistoryItem[] = chestScans.map((scan) => ({
    id: String(scan._id),
    source: 'chest_analyze' as const,
    scanType: 'chest_xray' as const,
    imageUrl: scan.imageUrl,
    prediction: scan.prediction,
    confidence: scan.confidence,
    status: 'ai_analyzed',
    sharedWithDoctor: scan.sharedWithDoctor,
    explanation: scan.explanation,
    createdAt: new Date(scan.createdAt).toISOString(),
  }));

  const reportItems: UnifiedScanHistoryItem[] = reports.map((raw) => {
    const report = raw as ReturnType<typeof scanReportToJSON> & {
      _id: { toString(): string } | string;
      createdAt: Date | string;
    };
    const id = typeof report._id === 'string' ? report._id : report._id.toString();
    return {
      id,
      source: 'mediscan_report' as const,
      scanType: report.scanType,
      imageUrl: report.imageUrl,
      prediction: report.prediction,
      confidence: report.confidence,
      status: report.status,
      sharedWithDoctor: report.isSharedWithDoctor,
      explanation: report.doctorNote,
      createdAt: new Date(report.createdAt).toISOString(),
    };
  });

  return [...chestItems, ...reportItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Backfill health vault entries for scans that pre-date sync (e.g. after deploy). */
export async function backfillScanHealthVault(patientId: string) {
  const history = await getUnifiedPatientScanHistory(patientId);
  for (const item of history) {
    if (!item.prediction || item.confidence == null) continue;
    if (item.status && !['ai_analyzed', 'final', 'doctor_reviewed'].includes(item.status)) continue;
    await syncScanToHealthVault({
      patientId,
      scanId: item.id,
      scanType: item.scanType,
      prediction: item.prediction,
      confidence: item.confidence,
      imageUrl: item.imageUrl,
      explanation: item.explanation,
      createdAt: new Date(item.createdAt),
    });
  }
}
