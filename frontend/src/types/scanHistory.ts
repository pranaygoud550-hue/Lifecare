export type UnifiedScanSource = 'mediscan_report' | 'chest_analyze';

export type UnifiedScanType = 'chest_xray' | 'skin_lesion' | 'retina';

export interface UnifiedScanHistoryItem {
  id: string;
  source: UnifiedScanSource;
  scanType: UnifiedScanType;
  imageUrl: string;
  prediction?: string;
  confidence?: number;
  status?: string;
  sharedWithDoctor?: boolean;
  explanation?: string;
  createdAt: string;
  healthRecordId?: string;
}
