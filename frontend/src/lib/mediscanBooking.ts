import type { ScanReport, ScanType } from '@/types/mediscan';
import { scanTypeLabel } from '@/lib/mediscan';

/** Map MediScan type → doctor specialty filters (matches seed / platform specialties) */
export const SCAN_TYPE_SPECIALTIES: Record<ScanType, string[]> = {
  chest_xray: ['Pulmonology', 'Cardiology', 'General Physician'],
  skin_lesion: ['Dermatology'],
  retina: ['Ophthalmology', 'Neurology'],
};

export interface ScanBookingPrefill {
  scanReportId: string;
  scanType: ScanType;
  specialty: string;
  chiefComplaint: string;
  patientNotes: string;
  prediction?: string;
  confidence?: number;
}

export function buildScanBookingPrefill(report: ScanReport): ScanBookingPrefill {
  const confidence = report.confidence ?? 0;
  const prediction = report.prediction ?? 'Pending review';
  const notes = `AI Scan Result: ${prediction} (${confidence.toFixed(0)}% confidence). Scan ID: ${report._id}`;

  return {
    scanReportId: report._id,
    scanType: report.scanType,
    specialty: SCAN_TYPE_SPECIALTIES[report.scanType][0],
    chiefComplaint: notes,
    patientNotes: notes,
    prediction: report.prediction,
    confidence: report.confidence,
  };
}

export function doctorsPageSearchFromScan(report: ScanReport): Record<string, string> {
  const prefill = buildScanBookingPrefill(report);
  return {
    specialty: prefill.specialty,
    scanReportId: report._id,
    fromScan: '1',
  };
}

export function scanTypeLabelShort(type: ScanType): string {
  return scanTypeLabel(type);
}
