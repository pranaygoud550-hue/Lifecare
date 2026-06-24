import type { ScanReport } from '@/types/mediscan';

/** Normalize populated scanReportId from appointment API */
export function scanFromAppointment(
  scanReportId: ScanReport | string | undefined | null
): ScanReport | null {
  if (!scanReportId || typeof scanReportId === 'string') return null;
  return scanReportId as ScanReport;
}
