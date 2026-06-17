import mongoose, { Schema, Document, Types } from 'mongoose';

export type BloodAlertStatus = 'active' | 'fulfilled' | 'cancelled' | 'expired';
export type BloodAlertUrgency = 'critical' | 'urgent' | 'normal';
export type BloodDonorResponseStatus = 'on_my_way' | 'cannot_donate';

export interface IBloodDonorResponse {
  userId: Types.ObjectId;
  status: BloodDonorResponseStatus;
  respondedAt: Date;
}

export interface IBloodEmergencyAlert extends Document {
  hospitalId: Types.ObjectId;
  hospitalName: string;
  address: string;
  coordinates: { lat: number; lng: number };
  bloodGroup: string;
  unitsNeeded?: number;
  urgency: BloodAlertUrgency;
  notes?: string;
  createdBy: Types.ObjectId;
  status: BloodAlertStatus;
  notifiedCount: number;
  responses: IBloodDonorResponse[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bloodEmergencyAlertSchema = new Schema<IBloodEmergencyAlert>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    hospitalName: { type: String, required: true },
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    bloodGroup: { type: String, required: true, index: true },
    unitsNeeded: Number,
    urgency: {
      type: String,
      enum: ['critical', 'urgent', 'normal'],
      default: 'urgent',
    },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['active', 'fulfilled', 'cancelled', 'expired'],
      default: 'active',
      index: true,
    },
    notifiedCount: { type: Number, default: 0 },
    responses: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        status: { type: String, enum: ['on_my_way', 'cannot_donate'], required: true },
        respondedAt: { type: Date, default: Date.now },
      },
    ],
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

bloodEmergencyAlertSchema.index({ status: 1, bloodGroup: 1, createdAt: -1 });
bloodEmergencyAlertSchema.index({ hospitalId: 1, status: 1, bloodGroup: 1 });

export const BloodEmergencyAlert = mongoose.model<IBloodEmergencyAlert>(
  'BloodEmergencyAlert',
  bloodEmergencyAlertSchema
);
