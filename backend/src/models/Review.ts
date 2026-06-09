import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReview extends Document {
  reviewType: 'doctor' | 'pharmacy' | 'ambulance' | 'medicine';
  reviewFor: Types.ObjectId;
  reviewedBy: Types.ObjectId;
  relatedTo?: Types.ObjectId;
  rating: number;
  review?: string;
  photos?: string[];
  helpful: number;
  response?: { by: Types.ObjectId; message: string; timestamp: Date };
  isVerified: boolean;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    reviewType: { type: String, enum: ['doctor', 'pharmacy', 'ambulance', 'medicine'], required: true },
    reviewFor: { type: Schema.Types.ObjectId, required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    relatedTo: Schema.Types.ObjectId,
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: String,
    photos: [String],
    helpful: { type: Number, default: 0 },
    response: { by: { type: Schema.Types.ObjectId, ref: 'User' }, message: String, timestamp: Date },
    isVerified: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  },
  { timestamps: true }
);

export const Review = mongoose.model<IReview>('Review', reviewSchema);
