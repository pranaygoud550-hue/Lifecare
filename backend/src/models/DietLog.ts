import mongoose, { Schema, Document, Types } from 'mongoose';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type DietAdherenceStatus = 'followed' | 'missed' | 'off_plan';
export type OffPlanCategory =
  | 'fried'
  | 'sweets'
  | 'salty'
  | 'fast_food'
  | 'large_portion'
  | 'skipped_meal'
  | 'other';

export interface IDietLog extends Document {
  patientId: Types.ObjectId;
  mealSlot: MealSlot;
  status: DietAdherenceStatus;
  /** What the patient actually ate */
  actualFood?: string;
  offPlanDescription?: string;
  offPlanCategory?: OffPlanCategory;
  dayKey: string;
  loggedAt: Date;
}

const dietLogSchema = new Schema<IDietLog>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mealSlot: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
      required: true,
    },
    status: {
      type: String,
      enum: ['followed', 'missed', 'off_plan'],
      required: true,
    },
    actualFood: { type: String, maxlength: 500 },
    offPlanDescription: { type: String, maxlength: 500 },
    offPlanCategory: {
      type: String,
      enum: ['fried', 'sweets', 'salty', 'fast_food', 'large_portion', 'skipped_meal', 'other'],
    },
    dayKey: { type: String, required: true, index: true },
    loggedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

dietLogSchema.index({ patientId: 1, dayKey: 1, mealSlot: 1 }, { unique: true });

export const DietLog = mongoose.model<IDietLog>('DietLog', dietLogSchema);
