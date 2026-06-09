import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAmbulanceRequest extends Document {
  requestId: string;
  patientId: Types.ObjectId;
  emergencyType: string;
  severity: 'critical' | 'urgent' | 'non-urgent';
  pickupLocation: {
    address: string;
    coordinates: { lat: number; lng: number };
    landmark?: string;
  };
  patientDetails: {
    name: string;
    age: number;
    gender: string;
    condition: string;
    contactNumber: string;
  };
  ambulanceType: string;
  assignedAmbulanceId?: Types.ObjectId;
  status: string;
  statusHistory: Array<{
    status: string;
    timestamp: Date;
    location?: { lat: number; lng: number };
  }>;
  estimatedArrival?: Date;
  actualArrival?: Date;
  destinationHospital?: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
  };
  distance?: number;
  duration?: number;
  charges?: {
    baseFare: number;
    distanceCharges: number;
    waitingCharges: number;
    total: number;
  };
  payment?: {
    method: string;
    status: string;
    transactionId?: string;
    timestamp?: Date;
  };
  rating?: { score: number; review?: string; timestamp: Date };
  tripSummaryPdf?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ambulanceRequestSchema = new Schema<IAmbulanceRequest>(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    emergencyType: { type: String, required: true },
    severity: { type: String, enum: ['critical', 'urgent', 'non-urgent'], required: true },
    pickupLocation: {
      address: String,
      coordinates: { lat: Number, lng: Number },
      landmark: String,
    },
    patientDetails: {
      name: String,
      age: Number,
      gender: String,
      condition: String,
      contactNumber: String,
    },
    ambulanceType: { type: String, required: true },
    assignedAmbulanceId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, default: 'requested' },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        location: { lat: Number, lng: Number },
      },
    ],
    estimatedArrival: Date,
    actualArrival: Date,
    destinationHospital: {
      name: String,
      address: String,
      coordinates: { lat: Number, lng: Number },
    },
    distance: Number,
    duration: Number,
    charges: {
      baseFare: Number,
      distanceCharges: Number,
      waitingCharges: Number,
      total: Number,
    },
    payment: {
      method: String,
      status: String,
      transactionId: String,
      timestamp: Date,
    },
    rating: { score: Number, review: String, timestamp: Date },
    tripSummaryPdf: String,
  },
  { timestamps: true }
);

export const AmbulanceRequest = mongoose.model<IAmbulanceRequest>(
  'AmbulanceRequest',
  ambulanceRequestSchema
);
