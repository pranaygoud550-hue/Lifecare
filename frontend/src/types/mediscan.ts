export type ScanType = 'chest_xray' | 'skin_lesion' | 'retina';

export type ScanReportStatus =
  | 'pending'
  | 'ai_analyzed'
  | 'ai_unavailable'
  | 'doctor_reviewed'
  | 'final';

export type ScanFlag = 'low_confidence' | 'manual_review';

export interface SkinCareMedicineSuggestion {
  name: string;
  form: string;
  purpose: string;
  howToUse: string;
  whenToUse: string;
  caution: string;
}

export interface SkinCareRoutineBlock {
  period: 'morning' | 'evening';
  steps: string[];
}

export type SkinConcernKey =
  | 'acne'
  | 'pigmentation'
  | 'dryness'
  | 'eczema'
  | 'inflammation'
  | 'sun_damage'
  | 'suspicious_lesion'
  | 'healthy';

export interface SkinCareAdvice {
  primaryConcern: string;
  concernKey: SkinConcernKey;
  summary: string;
  scanFindings: string[];
  whatYourSkinNeeds: string[];
  dailyRoutine: SkinCareRoutineBlock[];
  suggestedMedicines: SkinCareMedicineSuggestion[];
  foodsToEat: string[];
  foodsToAvoid: string[];
  lifestyleTips: string[];
  severity: 'mild' | 'moderate' | 'urgent';
  skinFoodDisclaimer: string;
}

export interface ScanPatientSummary {
  _id: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
  };
  medicalHistory?: {
    bloodGroup?: string;
    allergies?: string[];
    chronicConditions?: string[];
    currentMedications?: string[];
  };
}

export interface ScanReport {
  _id: string;
  patientId: string | ScanPatientSummary;
  doctorId?: string;
  scanType: ScanType;
  imageUrl: string;
  cloudinaryPublicId?: string;
  isDicom?: boolean;
  prediction?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
  gradcamUrl?: string;
  status: ScanReportStatus;
  flags?: ScanFlag[];
  aiAnalyzedAt?: string;
  doctorNote?: string;
  doctorOverride?: string;
  aiConfirmed?: boolean;
  requestMoreTests?: boolean;
  reviewedAt?: string;
  reviewDurationSeconds?: number;
  isSharedWithDoctor?: boolean;
  patient?: ScanPatientSummary;
  appointmentId?: string;
  skinCareAdvice?: SkinCareAdvice;
  createdAt: string;
  updatedAt: string;
  analysisStatus?: string;
}

export interface DoctorScanAnalytics {
  totalScansThisMonth: number;
  aiAccuracyRate: number;
  mostCommonCondition: string;
  averageReviewTimeMinutes: number;
  pendingCount: number;
}

export interface ScanReviewPayload {
  doctorNote?: string;
  doctorOverride?: string;
  markFinal?: boolean;
  aiConfirmed?: boolean;
  requestMoreTests?: boolean;
  reviewDurationSeconds?: number;
}

export interface ScanCompletePayload {
  scanId: string;
  scanType: ScanType;
  prediction: string;
  confidence: number;
  status: ScanReportStatus;
  flags: ScanFlag[];
  imageUrl: string;
  gradcamUrl?: string;
}
