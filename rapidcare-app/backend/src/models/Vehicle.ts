import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVehicle extends Document {
  number: string;
  type: 'BLS' | 'ALS' | 'PTV' | 'MORTUARY';
  driverId?: Types.ObjectId;
  isActive: boolean;
  lastServiceDate?: Date;
  documents?: { registration?: string; insurance?: string };
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new Schema<IVehicle>(
  {
    number: { type: String, required: true, unique: true },
    type: { type: String, enum: ['BLS', 'ALS', 'PTV', 'MORTUARY'], required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
    isActive: { type: Boolean, default: true },
    lastServiceDate: Date,
    documents: { registration: String, insurance: String },
  },
  { timestamps: true }
);

export const Vehicle = mongoose.model<IVehicle>('Vehicle', vehicleSchema);
