import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDoctorCarePlan extends Document {
  doctorId: Types.ObjectId;
  patientId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  title: string;
  summary: string;
  dos: string[];
  donts: string[];
  dietInstructions: string;
  lifestyleNotes?: string;
  bpSugarNotes?: string;
  publishedToPatient: boolean;
  patientAcknowledgedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const doctorCarePlanSchema = new Schema<IDoctorCarePlan>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    title: { type: String, required: true, default: 'Personalized care plan' },
    summary: { type: String, default: '' },
    dos: { type: [String], default: [] },
    donts: { type: [String], default: [] },
    dietInstructions: { type: String, default: '' },
    lifestyleNotes: String,
    bpSugarNotes: String,
    publishedToPatient: { type: Boolean, default: false, index: true },
    patientAcknowledgedAt: Date,
  },
  { timestamps: true }
);

doctorCarePlanSchema.index({ patientId: 1, publishedToPatient: 1, createdAt: -1 });
doctorCarePlanSchema.index({ doctorId: 1, patientId: 1, createdAt: -1 });

export const DoctorCarePlan = mongoose.model<IDoctorCarePlan>(
  'DoctorCarePlan',
  doctorCarePlanSchema
);
