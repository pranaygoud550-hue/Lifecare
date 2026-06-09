import mongoose, { Schema, Document, Types } from 'mongoose';

export type TransportStatus =
  | 'requested'
  | 'accepted'
  | 'en-route-to-patient'
  | 'patient-picked-up'
  | 'en-route-to-hospital'
  | 'completed'
  | 'cancelled';

export type TransportFlowType = 'emergency_sos' | 'escort' | 'teleconsult_first' | 'scheduled';

export interface ITransportBooking extends Document {
  bookingId: string;
  flowType: TransportFlowType;
  patientId?: Types.ObjectId;
  guestContact?: { name: string; phone: string };
  triage?: {
    lifeThreatening: string;
    canWalk: string;
    remoteDoctor: string;
  };
  vehicleType: string;
  pickupLocation: {
    address: string;
    coordinates: { lat: number; lng: number };
    landmark?: string;
  };
  destinationHospital?: {
    name: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  patientDetails?: {
    name: string;
    age?: number;
    gender?: string;
    condition?: string;
    contactNumber: string;
    bookedFor?: 'self' | 'other';
    otherPersonName?: string;
    otherPersonRelation?: string;
  };
  scheduledAt?: Date;
  conditionNotes?: string;
  assignedDriverId?: Types.ObjectId;
  status: TransportStatus;
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    location?: { lat: number; lng: number };
  }>;
  estimatedArrival?: Date;
  otp?: string;
  otpVerified?: boolean;
  trackingToken?: string;
  trackingExpiresAt?: Date;
  searchRadiusKm?: number;
  charges?: { baseFare: number; distanceCharges: number; total: number };
  driverLocation?: { lat: number; lng: number; timestamp: Date };
  safety?: {
    panicTriggered?: boolean;
    rideLoggedConsent?: boolean;
    postRideCheckSent?: boolean;
    postRideConfirmed?: boolean;
  };
  rating?: { score: number; review?: string; timestamp: Date };
  vitals?: { bp?: string; pulse?: number; oxygen?: number; recordedAt?: Date };
  handoverNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transportBookingSchema = new Schema<ITransportBooking>(
  {
    bookingId: { type: String, required: true, unique: true, index: true },
    flowType: {
      type: String,
      enum: ['emergency_sos', 'escort', 'teleconsult_first', 'scheduled'],
      required: true,
    },
    patientId: { type: Schema.Types.ObjectId, ref: 'User' },
    guestContact: { name: String, phone: String },
    triage: {
      lifeThreatening: String,
      canWalk: String,
      remoteDoctor: String,
    },
    vehicleType: { type: String, required: true },
    pickupLocation: {
      address: { type: String, required: true },
      coordinates: { lat: Number, lng: Number },
      landmark: String,
    },
    destinationHospital: {
      name: String,
      address: String,
      coordinates: { lat: Number, lng: Number },
    },
    patientDetails: {
      name: String,
      age: Number,
      gender: String,
      condition: String,
      contactNumber: String,
      bookedFor: String,
      otherPersonName: String,
      otherPersonRelation: String,
    },
    scheduledAt: Date,
    conditionNotes: String,
    assignedDriverId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: [
        'requested',
        'accepted',
        'en-route-to-patient',
        'patient-picked-up',
        'en-route-to-hospital',
        'completed',
        'cancelled',
      ],
      default: 'requested',
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        location: { lat: Number, lng: Number },
      },
    ],
    estimatedArrival: Date,
    otp: String,
    otpVerified: { type: Boolean, default: false },
    trackingToken: { type: String },
    trackingExpiresAt: Date,
    searchRadiusKm: { type: Number, default: 10 },
    charges: { baseFare: Number, distanceCharges: Number, total: Number },
    driverLocation: { lat: Number, lng: Number, timestamp: Date },
    safety: {
      panicTriggered: Boolean,
      rideLoggedConsent: { type: Boolean, default: true },
      postRideCheckSent: Boolean,
      postRideConfirmed: Boolean,
    },
    rating: { score: Number, review: String, timestamp: Date },
    vitals: { bp: String, pulse: Number, oxygen: Number, recordedAt: Date },
    handoverNote: String,
  },
  { timestamps: true }
);

transportBookingSchema.index({ trackingToken: 1 });
transportBookingSchema.index({ patientId: 1, createdAt: -1 });
transportBookingSchema.index({ assignedDriverId: 1, status: 1 });

export const TransportBooking = mongoose.model<ITransportBooking>(
  'TransportBooking',
  transportBookingSchema
);
