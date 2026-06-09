import type { ScanReport, ScanType } from '@/types/mediscan';

export const MAX_SCAN_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_SCAN_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.dcm'];

export const SCAN_TYPE_OPTIONS: {
  id: ScanType;
  emoji: string;
  label: string;
  detects: string[];
}[] = [
  {
    id: 'chest_xray',
    emoji: '🫁',
    label: 'Chest X-Ray',
    detects: ['Pneumonia', 'Lung opacity', 'COVID-19 patterns', 'Normal chest'],
  },
  {
    id: 'skin_lesion',
    emoji: '✨',
    label: 'Skin Check',
    detects: ['Pimples & acne', 'Pigmentation', 'Dryness', 'Rash & irritation'],
  },
  {
    id: 'retina',
    emoji: '👁',
    label: 'Eye Scan',
    detects: ['Diabetic retinopathy', 'Glaucoma signs', 'Macular changes', 'Normal retina'],
  },
];

export const SCAN_STATUS_LABELS: Record<ScanReport['status'], string> = {
  pending: 'Pending',
  ai_analyzed: 'AI Analyzed',
  ai_unavailable: 'AI Unavailable',
  doctor_reviewed: 'Doctor Reviewed',
  final: 'Final',
};

export type PredictionTier = 'normal' | 'attention' | 'urgent';

export function validateScanFile(file: File): string | null {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
  if (!ALLOWED_SCAN_EXTENSIONS.includes(ext)) {
    return 'Only JPG, PNG, and DICOM (.dcm) files are allowed.';
  }
  if (file.size > MAX_SCAN_FILE_BYTES) {
    return 'File must be 10MB or smaller.';
  }
  return null;
}

export function getPredictionTier(prediction?: string, confidence?: number): PredictionTier {
  const p = (prediction ?? '').toLowerCase();
  if (
    /\b(normal|healthy|negative|benign|no finding|clear)\b/.test(p) &&
    (confidence ?? 100) >= 60
  ) {
    return 'normal';
  }
  if (/\b(urgent|critical|malignant|severe|emergency|positive|pneumonia|cancer)\b/.test(p)) {
    return 'urgent';
  }
  if ((confidence ?? 0) >= 75) return 'normal';
  if ((confidence ?? 0) >= 50) return 'attention';
  return 'urgent';
}

export function predictionBadgeVariant(tier: PredictionTier): 'success' | 'warning' | 'danger' {
  if (tier === 'normal') return 'success';
  if (tier === 'attention') return 'warning';
  return 'danger';
}

export function predictionLabel(tier: PredictionTier): string {
  if (tier === 'normal') return 'Normal';
  if (tier === 'attention') return 'Needs attention';
  return 'Urgent';
}

export function scanTypeLabel(type: ScanType): string {
  return SCAN_TYPE_OPTIONS.find((o) => o.id === type)?.label ?? type;
}

export function resolveScanImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base =
    import.meta.env.VITE_SOCKET_URL ||
    window.location.origin
      .replace(':5173', ':5001')
      .replace(':5174', ':5001');
  return `${base.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

export function formatScanDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
