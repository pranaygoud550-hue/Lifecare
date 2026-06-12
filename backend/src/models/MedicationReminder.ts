import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMedicationReminder extends Document {
  patientId: Types.ObjectId;
  prescriptionId?: Types.ObjectId;
  medicineName: string;
  dosage: string;
  /** HH:mm 24h format */
  times: string[];
  instructions?: string;
  beforeAfterFood?: string;
  isActive: boolean;
  lastNotifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const medicationReminderSchema = new Schema<IMedicationReminder>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' },
    medicineName: { type: String, required: true },
    dosage: { type: String, required: true },
    times: [{ type: String, match: /^\d{2}:\d{2}$/ }],
    instructions: String,
    beforeAfterFood: String,
    isActive: { type: Boolean, default: true },
    lastNotifiedAt: Date,
  },
  { timestamps: true }
);

medicationReminderSchema.index({ patientId: 1, isActive: 1 });

export const MedicationReminder = mongoose.model<IMedicationReminder>(
  'MedicationReminder',
  medicationReminderSchema
);
