import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOrder extends Document {
  orderId: string;
  patientId: Types.ObjectId;
  pharmacyId: Types.ObjectId;
  items: Array<{
    medicineId: Types.ObjectId;
    medicineName: string;
    quantity: number;
    price: number;
    discount?: number;
  }>;
  prescription: {
    required: boolean;
    uploaded?: boolean;
    prescriptionUrl?: string;
    verifiedBy?: Types.ObjectId;
    verificationStatus?: 'pending' | 'verified' | 'rejected';
  };
  deliveryAddress: {
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: { lat: number; lng: number };
  };
  pricing: {
    subtotal: number;
    discount: number;
    deliveryCharges: number;
    tax: number;
    total: number;
  };
  payment: {
    method: string;
    status: string;
    transactionId?: string;
    timestamp?: Date;
  };
  delivery: {
    type: string;
    estimatedDate?: Date;
    deliveryPartnerId?: string;
    trackingId?: string;
    currentStatus: string;
    statusHistory?: Array<{ status: string; timestamp: Date; location?: string }>;
  };
  invoiceUrl?: string;
  rating?: { score: number; review?: string; timestamp: Date };
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pharmacyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine' },
        medicineName: String,
        quantity: Number,
        price: Number,
        discount: Number,
      },
    ],
    prescription: {
      required: Boolean,
      uploaded: Boolean,
      prescriptionUrl: String,
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'] },
    },
    deliveryAddress: {
      name: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      pincode: String,
      coordinates: { lat: Number, lng: Number },
    },
    pricing: {
      subtotal: Number,
      discount: Number,
      deliveryCharges: Number,
      tax: Number,
      total: Number,
    },
    payment: {
      method: String,
      status: String,
      transactionId: String,
      timestamp: Date,
    },
    delivery: {
      type: String,
      estimatedDate: Date,
      deliveryPartnerId: String,
      trackingId: String,
      currentStatus: { type: String, default: 'pending' },
      statusHistory: [{ status: String, timestamp: Date, location: String }],
    },
    invoiceUrl: String,
    rating: { score: Number, review: String, timestamp: Date },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>('Order', orderSchema);
