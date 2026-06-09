import mongoose, { Schema, Document } from 'mongoose';

export interface ITokenBlacklist extends Document {
  jti: string;
  tokenType: 'access' | 'refresh';
  userId?: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const tokenBlacklistSchema = new Schema<ITokenBlacklist>(
  {
    jti: { type: String, required: true, unique: true, index: true },
    tokenType: { type: String, enum: ['access', 'refresh'], required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TokenBlacklist = mongoose.model<ITokenBlacklist>('TokenBlacklist', tokenBlacklistSchema);
