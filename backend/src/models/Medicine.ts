import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMedicine extends Document {
  name: string;
  genericName?: string;
  brand?: string;
  manufacturer?: string;
  category?: string;
  form?: string;
  strength?: string;
  packSize?: string;
  composition?: string;
  uses?: string;
  sideEffects?: string;
  precautions?: string;
  storage?: string;
  prescriptionRequired: boolean;
  images?: string[];
  pricing: {
    mrp: number;
    sellingPrice: number;
    discount?: number;
  };
  stock: number;
  pharmacyId: Types.ObjectId;
  substitutes?: Types.ObjectId[];
  rating?: number;
  reviewCount?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const medicineSchema = new Schema<IMedicine>(
  {
    name: { type: String, required: true, index: true },
    genericName: String,
    brand: String,
    manufacturer: String,
    category: String,
    form: String,
    strength: String,
    packSize: String,
    composition: String,
    uses: String,
    sideEffects: String,
    precautions: String,
    storage: String,
    prescriptionRequired: { type: Boolean, default: false },
    images: [String],
    pricing: {
      mrp: { type: Number, required: true },
      sellingPrice: { type: Number, required: true },
      discount: Number,
    },
    stock: { type: Number, default: 0 },
    pharmacyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    substitutes: [{ type: Schema.Types.ObjectId, ref: 'Medicine' }],
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

medicineSchema.index({ name: 'text', genericName: 'text', brand: 'text' });

export const Medicine = mongoose.model<IMedicine>('Medicine', medicineSchema);
