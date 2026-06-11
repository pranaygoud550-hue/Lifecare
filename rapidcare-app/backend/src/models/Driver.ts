import mongoose, { Schema, Document } from 'mongoose';

export interface IDriver extends Document {
  name: string;
  phone: string;
  passwordHash: string;
  vehicleNumber: string;
  vehicleType: 'BLS' | 'ALS' | 'PTV' | 'MORTUARY';
  isAvailable: boolean;
  currentCoords?: { lat: number; lng: number };
  rating: number;
  totalTrips: number;
  earnings: number;
  createdAt: Date;
  updatedAt: Date;
}

const driverSchema = new Schema<IDriver>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    vehicleType: { type: String, enum: ['BLS', 'ALS', 'PTV', 'MORTUARY'], required: true },
    isAvailable: { type: Boolean, default: true },
    currentCoords: { lat: Number, lng: Number },
    rating: { type: Number, default: 4.8 },
    totalTrips: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Driver = mongoose.model<IDriver>('Driver', driverSchema);
