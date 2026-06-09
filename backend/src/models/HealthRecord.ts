import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHealthRecord extends Document {
  patientId: Types.ObjectId;
  recordType: 'lab-report' | 'prescription' | 'image' | 'vaccination' | 'other';
  title: string;
  description?: string;
  date: Date;
  tags?: string[];
  files: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    uploadedAt: Date;
  }>;
  sharedWith?: Array<{
    doctorId: Types.ObjectId;
    sharedAt: Date;
    expiresAt?: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const healthRecordSchema = new Schema<IHealthRecord>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recordType: {
      type: String,
      enum: ['lab-report', 'prescription', 'image', 'vaccination', 'other'],
      required: true,
    },
    title: { type: String, required: true },
    description: String,
    date: { type: Date, default: Date.now },
    tags: [String],
    files: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    sharedWith: [
      {
        doctorId: { type: Schema.Types.ObjectId, ref: 'User' },
        sharedAt: { type: Date, default: Date.now },
        expiresAt: Date,
      },
    ],
  },
  { timestamps: true }
);

healthRecordSchema.index({ patientId: 1, date: -1 });
healthRecordSchema.index({ title: 'text', description: 'text' });

export const HealthRecord = mongoose.model<IHealthRecord>('HealthRecord', healthRecordSchema);
