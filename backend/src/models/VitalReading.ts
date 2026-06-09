import mongoose, { Schema, Document, Types } from 'mongoose';

export type VitalType = 'blood_pressure' | 'blood_sugar' | 'weight' | 'heart_rate' | 'oxygen';
export type GlucoseMealContext = 'fasting' | 'post_meal';

export interface IVitalReading extends Document {
  patientId: Types.ObjectId;
  type: VitalType;
  recordedAt: Date;
  systolic?: number;
  diastolic?: number;
  glucose?: number;
  glucoseMeal?: GlucoseMealContext;
  value?: number;
  unit?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const vitalReadingSchema = new Schema<IVitalReading>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['blood_pressure', 'blood_sugar', 'weight', 'heart_rate', 'oxygen'],
      required: true,
    },
    recordedAt: { type: Date, required: true, index: true },
    systolic: Number,
    diastolic: Number,
    glucose: Number,
    glucoseMeal: { type: String, enum: ['fasting', 'post_meal'] },
    value: Number,
    unit: String,
    notes: String,
  },
  { timestamps: true }
);

vitalReadingSchema.index({ patientId: 1, type: 1, recordedAt: -1 });

export const VitalReading = mongoose.model<IVitalReading>('VitalReading', vitalReadingSchema);
