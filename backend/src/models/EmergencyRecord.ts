import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEmergencyRecord extends Document {
  rapidcareBookingId: string;
  patientId?: Types.ObjectId;
  guestPhone?: string;
  guestName?: string;
  patientName: string;
  patientPhone: string;
  pickupLocation: string;
  hospital: string;
  vehicleType: string;
  condition: string;
  dispatchTime: Date;
  arrivalTime: Date;
  responseTimeMinutes: number;
  driverName: string;
  vehicleNumber: string;
  fare: number;
  paymentStatus: string;
  source: 'rapidcare' | 'lifecare_sos';
  createdAt: Date;
  updatedAt: Date;
}

const emergencyRecordSchema = new Schema<IEmergencyRecord>(
  {
    rapidcareBookingId: { type: String, required: true, unique: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    guestPhone: String,
    guestName: String,
    patientName: { type: String, required: true },
    patientPhone: { type: String, required: true },
    pickupLocation: { type: String, required: true },
    hospital: { type: String, required: true },
    vehicleType: { type: String, required: true },
    condition: { type: String, required: true },
    dispatchTime: { type: Date, required: true },
    arrivalTime: { type: Date, required: true },
    responseTimeMinutes: { type: Number, required: true },
    driverName: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    fare: { type: Number, required: true },
    paymentStatus: { type: String, required: true },
    source: { type: String, enum: ['rapidcare', 'lifecare_sos'], default: 'rapidcare' },
  },
  { timestamps: true }
);

export const EmergencyRecord = mongoose.model<IEmergencyRecord>('EmergencyRecord', emergencyRecordSchema);
