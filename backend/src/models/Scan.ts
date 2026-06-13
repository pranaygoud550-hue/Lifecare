import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IScan extends Document {
  patientId: Types.ObjectId;
  doctorId?: Types.ObjectId;
  imageUrl: string;
  cloudinaryPublicId?: string;
  prediction: string;
  confidence: number;
  allPredictions: Record<string, number>;
  explanation: string;
  disclaimer: string;
  sharedWithDoctor: boolean;
  doctorNote?: string;
  analysisSource?: 'external' | 'local_screening' | 'integrated';
  mlEngine?: string;
  createdAt: Date;
  updatedAt: Date;
}

const scanSchema = new Schema<IScan>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    imageUrl: { type: String, required: true },
    cloudinaryPublicId: String,
    prediction: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    allPredictions: {
      type: Map,
      of: Number,
      default: {},
    },
    explanation: { type: String, required: true },
    disclaimer: { type: String, required: true },
    sharedWithDoctor: { type: Boolean, default: false, index: true },
    doctorNote: String,
    analysisSource: {
      type: String,
      enum: ['external', 'local_screening', 'integrated'],
    },
    mlEngine: String,
  },
  { timestamps: true }
);

scanSchema.index({ patientId: 1, createdAt: -1 });
scanSchema.index({ doctorId: 1, sharedWithDoctor: 1, createdAt: -1 });

export const Scan = mongoose.model<IScan>('Scan', scanSchema);
