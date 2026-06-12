import mongoose, { Schema, Document, Types } from 'mongoose';

export type RapidCareEventType =
  | 'BOOKING_CREATED'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ARRIVING'
  | 'COMPLETED';

export interface IEmergencyRecord extends Document {
  patientId?: Types.ObjectId;
  guestPhone?: string;
  guestName?: string;
  bookingId: string;
  source: 'rapidcare';
  eventType: RapidCareEventType;
  patientName: string;
  patientPhone: string;
  condition: string;
  pickupAddress: string;
  destinationHospital: string;
  vehicleType: string;
  driverName?: string;
  vehicleNumber?: string;
  fare: number;
  paymentStatus: string;
  dispatchTime?: Date;
  arrivalTime?: Date;
  completedTime?: Date;
  responseTimeMinutes?: number;
  sharedWithDoctor: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const emergencyRecordSchema = new Schema<IEmergencyRecord>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    guestPhone: { type: String, index: true },
    guestName: String,
    bookingId: { type: String, required: true, unique: true, index: true },
    source: { type: String, enum: ['rapidcare'], default: 'rapidcare' },
    eventType: {
      type: String,
      enum: ['BOOKING_CREATED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'COMPLETED'],
      required: true,
    },
    patientName: { type: String, required: true },
    patientPhone: { type: String, required: true },
    condition: { type: String, required: true },
    pickupAddress: { type: String, required: true },
    destinationHospital: { type: String, required: true },
    vehicleType: { type: String, required: true },
    driverName: String,
    vehicleNumber: String,
    fare: { type: Number, default: 0 },
    paymentStatus: { type: String, default: 'pending' },
    dispatchTime: Date,
    arrivalTime: Date,
    completedTime: Date,
    responseTimeMinutes: Number,
    sharedWithDoctor: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const EmergencyRecord = mongoose.model<IEmergencyRecord>('EmergencyRecord', emergencyRecordSchema);
