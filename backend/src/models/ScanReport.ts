import mongoose, { Schema, Document, Types } from 'mongoose';
import type { ScanFlag, ScanReportStatus, ScanType } from '../types/scan.js';
import type { SkinCareAdvice } from '../utils/skinCareAdvice.js';

export interface IScanReport extends Document {
  patientId: Types.ObjectId;
  doctorId?: Types.ObjectId;
  scanType: ScanType;
  imageUrl: string;
  cloudinaryPublicId?: string;
  isDicom?: boolean;
  dicomPythonConversion?: boolean;
  prediction?: string;
  confidence?: number;
  probabilities?: Map<string, number>;
  gradcamUrl?: string;
  status: ScanReportStatus;
  flags: ScanFlag[];
  aiAnalyzedAt?: Date;
  doctorNote?: string;
  doctorOverride?: string;
  aiConfirmed?: boolean;
  requestMoreTests?: boolean;
  reviewedAt?: Date;
  reviewDurationSeconds?: number;
  isSharedWithDoctor: boolean;
  appointmentId?: Types.ObjectId;
  skinCareAdvice?: SkinCareAdvice;
  createdAt: Date;
  updatedAt: Date;
}

const scanReportSchema = new Schema<IScanReport>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    scanType: {
      type: String,
      enum: ['chest_xray', 'skin_lesion', 'retina'],
      required: true,
    },
    imageUrl: { type: String, required: true },
    cloudinaryPublicId: String,
    isDicom: { type: Boolean, default: false },
    dicomPythonConversion: { type: Boolean, default: false },
    prediction: String,
    confidence: { type: Number, min: 0, max: 100 },
    probabilities: {
      type: Map,
      of: Number,
    },
    gradcamUrl: String,
    status: {
      type: String,
      enum: ['pending', 'ai_analyzed', 'ai_unavailable', 'doctor_reviewed', 'final'],
      default: 'pending',
      index: true,
    },
    flags: {
      type: [String],
      default: [],
    },
    aiAnalyzedAt: Date,
    doctorNote: String,
    doctorOverride: String,
    aiConfirmed: Boolean,
    requestMoreTests: Boolean,
    reviewedAt: Date,
    reviewDurationSeconds: Number,
    isSharedWithDoctor: { type: Boolean, default: false },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    skinCareAdvice: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

scanReportSchema.index({ patientId: 1, createdAt: -1 });
scanReportSchema.index({ doctorId: 1, status: 1, isSharedWithDoctor: 1 });

export const ScanReport = mongoose.model<IScanReport>('ScanReport', scanReportSchema);
