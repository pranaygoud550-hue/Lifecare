export type ChestScanClass = 'Normal' | 'Pneumonia' | 'Tuberculosis' | 'COVID';

export interface ChestScanPatientSummary {
  _id: string;
  profile?: {
    firstName?: string;
    lastName?: string;
  };
  email?: string;
  phone?: string;
}

export interface ChestScan {
  _id: string;
  patientId: string | ChestScanPatientSummary;
  patient?: ChestScanPatientSummary;
  doctorId?: string;
  imageUrl: string;
  prediction: string;
  confidence: number;
  allPredictions: Record<string, number>;
  explanation: string;
  disclaimer: string;
  sharedWithDoctor: boolean;
  doctorNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChestScanAnalyzeResponse {
  class_name: string;
  confidence: number;
  all_predictions: Record<string, number>;
  explanation: string;
  disclaimer: string;
}
