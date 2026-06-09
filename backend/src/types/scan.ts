export type ScanType = 'chest_xray' | 'skin_lesion' | 'retina';

export type ScanReportStatus =
  | 'pending'
  | 'ai_analyzed'
  | 'ai_unavailable'
  | 'doctor_reviewed'
  | 'final';

export type ScanFlag = 'low_confidence' | 'manual_review';

/** Response shape from MediScan FastAPI POST /api/analyze */
export interface MediScanAnalyzeResponse {
  prediction: string;
  confidence: number;
  probabilities: Record<string, number>;
  gradcam_url?: string;
  gradcamUrl?: string;
}

export interface ScanCompleteSocketPayload {
  scanId: string;
  scanType: ScanType;
  prediction: string;
  confidence: number;
  status: ScanReportStatus;
  flags: ScanFlag[];
  imageUrl: string;
  gradcamUrl?: string;
}
