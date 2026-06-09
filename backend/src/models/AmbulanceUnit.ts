import mongoose, { Schema, Document, Types } from 'mongoose';

export type AmbulanceUnitStatus = 'idle' | 'dispatched' | 'returning';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IAmbulanceUnit extends Document {
  driverId: Types.ObjectId;
  currentLocation: GeoPoint;
  isAvailable: boolean;
  vehicleNumber: string;
  status: AmbulanceUnitStatus;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ambulanceUnitSchema = new Schema<IAmbulanceUnit>(
  {
    driverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (coords: number[]) =>
            coords.length === 2 &&
            coords[0] >= -180 &&
            coords[0] <= 180 &&
            coords[1] >= -90 &&
            coords[1] <= 90,
          message: 'coordinates must be [longitude, latitude]',
        },
      },
    },
    isAvailable: { type: Boolean, default: true, index: true },
    vehicleNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['idle', 'dispatched', 'returning'],
      default: 'idle',
      index: true,
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ambulanceUnitSchema.index({ currentLocation: '2dsphere' });
ambulanceUnitSchema.index({ isAvailable: 1, status: 1 });

export const AmbulanceUnit = mongoose.model<IAmbulanceUnit>('AmbulanceUnit', ambulanceUnitSchema);
