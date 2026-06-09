import type { Doctor } from '@/types';

const CACHE_KEY = 'lifecare-offline-doctors';
const CACHE_META_KEY = 'lifecare-offline-doctors-meta';

export function saveDoctorsForOffline(doctors: Doctor[], queryLabel?: string): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(doctors.slice(0, 40)));
    localStorage.setItem(
      CACHE_META_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), queryLabel: queryLabel || '' })
    );
  } catch {
    /* quota */
  }
}

export function getOfflineDoctors(): { doctors: Doctor[]; savedAt?: string; queryLabel?: string } {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const meta = localStorage.getItem(CACHE_META_KEY);
    if (!raw) return { doctors: [] };
    const doctors = JSON.parse(raw) as Doctor[];
    const parsedMeta = meta ? (JSON.parse(meta) as { savedAt?: string; queryLabel?: string }) : {};
    return { doctors, ...parsedMeta };
  } catch {
    return { doctors: [] };
  }
}
