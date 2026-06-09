import type { ScanReport, ScanType } from '@/types/mediscan';
import { scanTypeLabel } from '@/lib/mediscan';

export type ScanSortKey = 'date' | 'confidence' | 'scanType';
export type ScanSortDir = 'asc' | 'desc';

export const LOW_CONFIDENCE_THRESHOLD = 60;

export const OVERRIDE_DIAGNOSES: Record<ScanType, string[]> = {
  chest_xray: ['Normal', 'Pneumonia', 'COVID-19', 'Lung opacity', 'Pleural effusion', 'Cardiomegaly'],
  skin_lesion: ['Benign nevus', 'Melanoma', 'Basal cell carcinoma', 'Dermatitis', 'Psoriasis', 'Requires biopsy'],
  retina: ['Normal retina', 'Diabetic retinopathy', 'Glaucoma', 'Macular degeneration', 'Cataract', 'Hypertensive retinopathy'],
};

export function getPatientFromScan(scan: ScanReport): ScanReport['patient'] | null {
  if (scan.patient) return scan.patient;
  if (typeof scan.patientId === 'object' && scan.patientId !== null) {
    return scan.patientId as ScanReport['patient'];
  }
  return null;
}

export function patientDisplayName(scan: ScanReport): string {
  const p = getPatientFromScan(scan);
  if (p?.profile?.firstName) {
    return `${p.profile.firstName} ${p.profile.lastName ?? ''}`.trim();
  }
  return 'Patient';
}

export function patientAge(scan: ScanReport): string {
  const dob = getPatientFromScan(scan)?.profile?.dateOfBirth;
  if (!dob) return '—';
  const birth = new Date(dob);
  const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return age >= 0 ? `${age} yrs` : '—';
}

export function medicalHistorySummary(scan: ScanReport): string {
  const mh = getPatientFromScan(scan)?.medicalHistory;
  if (!mh) return 'No medical history on file.';
  const parts: string[] = [];
  if (mh.bloodGroup) parts.push(`Blood group: ${mh.bloodGroup}`);
  if (mh.allergies?.length) parts.push(`Allergies: ${mh.allergies.join(', ')}`);
  if (mh.chronicConditions?.length) parts.push(`Conditions: ${mh.chronicConditions.join(', ')}`);
  if (mh.currentMedications?.length) parts.push(`Medications: ${mh.currentMedications.join(', ')}`);
  return parts.length ? parts.join(' · ') : 'No significant history recorded.';
}

export function isUrgentReview(scan: ScanReport): boolean {
  return (scan.confidence ?? 100) < LOW_CONFIDENCE_THRESHOLD;
}

export function sortScans(
  scans: ScanReport[],
  sortBy: ScanSortKey,
  dir: ScanSortDir
): ScanReport[] {
  const mult = dir === 'asc' ? 1 : -1;
  return [...scans].sort((a, b) => {
    if (sortBy === 'date') {
      return mult * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    if (sortBy === 'confidence') {
      return mult * ((a.confidence ?? 0) - (b.confidence ?? 0));
    }
    return mult * scanTypeLabel(a.scanType).localeCompare(scanTypeLabel(b.scanType));
  });
}

export function filterScans(
  scans: ScanReport[],
  status: string,
  scanType: string
): ScanReport[] {
  return scans.filter((s) => {
    if (status && status !== 'all' && s.status !== status) return false;
    if (scanType && scanType !== 'all' && s.scanType !== scanType) return false;
    return true;
  });
}

export function diagnosisOptionsForScan(scan: ScanReport): string[] {
  const fromProbs = scan.probabilities ? Object.keys(scan.probabilities) : [];
  const defaults = OVERRIDE_DIAGNOSES[scan.scanType] ?? [];
  return Array.from(new Set([...fromProbs, ...defaults, scan.prediction].filter(Boolean) as string[]));
}
