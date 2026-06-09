import type { ScanType } from '../types/scan.js';

const SCAN_TYPE_LABELS: Record<ScanType, string> = {
  chest_xray: 'chest X-ray',
  skin_lesion: 'skin lesion scan',
  retina: 'eye scan',
};

export function scanTypeLabelForNotification(scanType: ScanType): string {
  return SCAN_TYPE_LABELS[scanType] ?? 'scan';
}

/** High-confidence serious findings — triggers urgent patient alert + booking suggestion */
export function isUrgentScanPrediction(prediction?: string, confidence?: number): boolean {
  if (!prediction || confidence == null || confidence < 60) return false;

  const p = prediction.toLowerCase();
  if (/\b(normal|healthy|benign|negative|no finding|clear)\b/.test(p)) {
    return false;
  }

  return /\b(urgent|critical|malignant|severe|emergency|pneumonia|cancer|melanoma|retinopathy|positive|opacity|effusion)\b/.test(
    p
  );
}

export function formatPatientName(profile?: { firstName?: string; lastName?: string }): string {
  if (!profile?.firstName) return 'Patient';
  return `${profile.firstName} ${profile.lastName ?? ''}`.trim();
}
