import mongoose, { Schema, Document, Types } from 'mongoose';

export type ServiceType = 'emergency' | 'scheduled' | 'diagnostic';
export type VehicleType = 'BLS' | 'ALS' | 'PTV' | 'MORTUARY';
export type BookingStatus =
  | 'pending'
  | 'searching'
  | 'accepted'
  | 'en-route'
  | 'arrived'
  | 'in-transit'
  | 'completed'
  | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'pay_on_arrival' | 'refunded';

export interface IBooking extends Document {
  bookingId: string;
  serviceType: ServiceType;
  patientName: string;
  age: number;
  phone: string;
  emergencyContact: string;
  condition: string;
  isConscious: boolean;
  allergies?: string;
  pickupLocation: { address: string; coords: { lat: number; lng: number } };
  destinationLocation: { address: string; coords: { lat: number; lng: number }; name?: string };
  nearestHospital: boolean;
  vehicleType: VehicleType;
  driverId?: Types.ObjectId;
  status: BookingStatus;
  fare: number;
  distanceKm: number;
  paymentStatus: PaymentStatus;
  paymentIntentId?: string;
  otp: string;
  otpVerified: boolean;
  dispatchTime?: Date;
  arrivalTime?: Date;
  completedAt?: Date;
  lifecarePatientId?: string;
  lifecareSynced: boolean;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const coordsSchema = new Schema({ lat: Number, lng: Number }, { _id: false });

const bookingSchema = new Schema<IBooking>(
  {
    bookingId: { type: String, required: true, unique: true, index: true },
    serviceType: { type: String, enum: ['emergency', 'scheduled', 'diagnostic'], required: true },
    patientName: { type: String, required: true },
    age: { type: Number, required: true },
    phone: { type: String, required: true },
    emergencyContact: { type: String, required: true },
    condition: { type: String, required: true },
    isConscious: { type: Boolean, default: true },
    allergies: String,
    pickupLocation: {
      address: { type: String, required: true },
      coords: { type: coordsSchema, required: true },
    },
    destinationLocation: {
      address: { type: String, required: true },
      coords: { type: coordsSchema, required: true },
      name: String,
    },
    nearestHospital: { type: Boolean, default: false },
    vehicleType: { type: String, enum: ['BLS', 'ALS', 'PTV', 'MORTUARY'], required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
    status: {
      type: String,
      enum: ['pending', 'searching', 'accepted', 'en-route', 'arrived', 'in-transit', 'completed', 'cancelled'],
      default: 'pending',
    },
    fare: { type: Number, default: 0 },
    distanceKm: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'pay_on_arrival', 'refunded'], default: 'pending' },
    paymentIntentId: String,
    otp: { type: String, required: true },
    otpVerified: { type: Boolean, default: false },
    dispatchTime: Date,
    arrivalTime: Date,
    completedAt: Date,
    lifecarePatientId: String,
    lifecareSynced: { type: Boolean, default: false },
    scheduledAt: Date,
  },
  { timestamps: true }
);

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
