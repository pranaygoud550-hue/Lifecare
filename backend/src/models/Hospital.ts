import mongoose, { Schema, Document } from 'mongoose';
import type { GeoPoint } from './AmbulanceUnit.js';

export interface IHospital extends Document {
  name: string;
  slug: string;
  city: string;
  state: string;
  address: string;
  pincode?: string;
  phone?: string;
  email?: string;
  coordinates?: { lat: number; lng: number };
  location?: GeoPoint;
  type: 'multi-specialty' | 'super-specialty' | 'clinic' | 'government' | 'trauma-center';
  specialties: string[];
  emergencyAvailable: boolean;
  beds?: number;
  rating: number;
  reviewCount: number;
  image?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hospitalSchema = new Schema<IHospital>(
  {
    name: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true },
    city: { type: String, required: true, index: true },
    state: { type: String, required: true, index: true },
    address: { type: String, required: true },
    pincode: String,
    phone: String,
    email: String,
    coordinates: { lat: Number, lng: Number },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: (coords: number[]) =>
            !coords ||
            coords.length === 0 ||
            (coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 &&
              coords[1] >= -90 &&
              coords[1] <= 90),
          message: 'location coordinates must be [longitude, latitude]',
        },
      },
    },
    type: {
      type: String,
      enum: ['multi-specialty', 'super-specialty', 'clinic', 'government', 'trauma-center'],
      default: 'multi-specialty',
    },
    specialties: [String],
    emergencyAvailable: { type: Boolean, default: true },
    beds: Number,
    rating: { type: Number, default: 4.0 },
    reviewCount: { type: Number, default: 0 },
    image: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

hospitalSchema.index({ name: 'text', city: 'text', address: 'text' });
hospitalSchema.index({ city: 1, name: 1 });
hospitalSchema.index({ location: '2dsphere' });

hospitalSchema.pre('save', function syncGeoLocation(next) {
  if (
    this.coordinates?.lat != null &&
    this.coordinates?.lng != null &&
    (!this.location?.coordinates || this.location.coordinates.length !== 2)
  ) {
    this.location = {
      type: 'Point',
      coordinates: [this.coordinates.lng, this.coordinates.lat],
    };
  }
  next();
});

export const Hospital = mongoose.model<IHospital>('Hospital', hospitalSchema);
