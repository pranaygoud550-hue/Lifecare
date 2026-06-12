import type { ChestScanClass } from '@/types/chestScan';

export const CHEST_SCAN_CLASSES: ChestScanClass[] = [
  'Normal',
  'Pneumonia',
  'Tuberculosis',
  'COVID',
];

export const CHEST_SCAN_DISCLAIMER =
  'This is an AI screening tool, not a medical diagnosis.';

export const MAX_CHEST_SCAN_BYTES = 10 * 1024 * 1024;
export const ALLOWED_CHEST_SCAN_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];

export type ChestScanBadgeVariant = 'success' | 'warning' | 'danger' | 'default';

export function validateChestScanFile(file: File): string | null {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
  if (!ALLOWED_CHEST_SCAN_EXTENSIONS.includes(ext)) {
    return 'Only JPG, PNG, and WebP images are allowed.';
  }
  if (file.size > MAX_CHEST_SCAN_BYTES) {
    return 'Image must be 10MB or smaller.';
  }
  return null;
}

export function chestScanBadgeVariant(prediction: string): ChestScanBadgeVariant {
  const normalized = prediction.trim().toLowerCase();
  if (normalized === 'normal') return 'success';
  if (normalized === 'pneumonia') return 'warning';
  if (normalized === 'tuberculosis') return 'warning';
  if (normalized === 'covid') return 'danger';
  return 'default';
}

export function chestScanBadgeColor(prediction: string): string {
  const normalized = prediction.trim().toLowerCase();
  if (normalized === 'normal') return 'bg-green-500';
  if (normalized === 'pneumonia') return 'bg-yellow-500';
  if (normalized === 'tuberculosis') return 'bg-orange-500';
  if (normalized === 'covid') return 'bg-red-500';
  return 'bg-primary';
}

export function formatChestScanDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function resolveChestScanImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base =
    import.meta.env.VITE_SOCKET_URL ||
    window.location.origin.replace(':5173', ':5001').replace(':5174', ':5001');
  return `${base.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}
