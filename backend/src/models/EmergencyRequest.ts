import mongoose, { Schema, Document, Types } from 'mongoose';
import type { GeoPoint } from './AmbulanceUnit.js';

export type EmergencyType = 'cardiac' | 'accident' | 'breathing' | 'other';

export type EmergencyRequestStatus =
  | 'searching'
  | 'dispatched'
  | 'arrived'
  | 'pickedUp'
  | 'atHospital'
  | 'completed'
  | 'cancelled';

export interface IEmergencyRequest extends Document {
  requestId: string;
  patientId: Types.ObjectId;
  patientLocation: GeoPoint;
  assignedAmbulanceId?: Types.ObjectId;
  hospitalId?: Types.ObjectId;
  status: EmergencyRequestStatus;
  requestedAt: Date;
  dispatchedAt?: Date;
  arrivedAt?: Date;
  completedAt?: Date;
  calculatedETA?: number;
  actualArrivalTime?: Date;
  emergencyType: EmergencyType;
  isDelayed: boolean;
  candidateAmbulanceIds: Types.ObjectId[];
  distanceToAmbulanceKm?: number;
  distanceToHospitalKm?: number;
  pickupOtp?: string;
  otpVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const emergencyRequestSchema = new Schema<IEmergencyRequest>(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patientLocation: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    assignedAmbulanceId: { type: Schema.Types.ObjectId, ref: 'AmbulanceUnit' },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital' },
    status: {
      type: String,
      enum: ['searching', 'dispatched', 'arrived', 'pickedUp', 'atHospital', 'completed', 'cancelled'],
      default: 'searching',
      index: true,
    },
    requestedAt: { type: Date, default: Date.now, index: true },
    dispatchedAt: Date,
    arrivedAt: Date,
    completedAt: Date,
    calculatedETA: Number,
    actualArrivalTime: Date,
    emergencyType: {
      type: String,
      enum: ['cardiac', 'accident', 'breathing', 'other'],
      required: true,
    },
    isDelayed: { type: Boolean, default: false },
    candidateAmbulanceIds: [{ type: Schema.Types.ObjectId, ref: 'AmbulanceUnit' }],
    distanceToAmbulanceKm: Number,
    distanceToHospitalKm: Number,
    pickupOtp: { type: String },
    otpVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

emergencyRequestSchema.index({ patientLocation: '2dsphere' });
emergencyRequestSchema.index({ patientId: 1, status: 1, requestedAt: -1 });

export const EmergencyRequest = mongoose.model<IEmergencyRequest>(
  'EmergencyRequest',
  emergencyRequestSchema
);
