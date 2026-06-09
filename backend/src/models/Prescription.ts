import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPrescription extends Document {
  appointmentId: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  date: Date;
  diagnosis?: string;
  medications: Array<{
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
    beforeAfterFood?: string;
  }>;
  labTests?: string[];
  advice?: string;
  followUpDate?: Date;
  digitalSignature?: string;
  pdfUrl?: string;
  createdAt: Date;
}

const prescriptionSchema = new Schema<IPrescription>(
  {
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    diagnosis: String,
    medications: [
      {
        medicineName: String,
        dosage: String,
        frequency: String,
        duration: String,
        instructions: String,
        beforeAfterFood: String,
      },
    ],
    labTests: [String],
    advice: String,
    followUpDate: Date,
    digitalSignature: String,
    pdfUrl: String,
  },
  { timestamps: true }
);

export const Prescription = mongoose.model<IPrescription>('Prescription', prescriptionSchema);
