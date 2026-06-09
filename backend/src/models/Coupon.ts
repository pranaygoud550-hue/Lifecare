import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrderValue?: number;
  applicableOn: string;
  validFrom: Date;
  validTill: Date;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const couponSchema = new Schema<ICoupon>({
  code: { type: String, required: true, unique: true, uppercase: true, index: true },
  description: String,
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  maxDiscount: Number,
  minOrderValue: Number,
  applicableOn: { type: String, default: 'all' },
  validFrom: Date,
  validTill: Date,
  usageLimit: Number,
  usedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

export const Coupon = mongoose.model<ICoupon>('Coupon', couponSchema);
