import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAppointment extends Document {
  appointmentId: string;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  consultationType: 'video' | 'audio' | 'chat' | 'homeVisit';
  scheduledDate: Date;
  scheduledTime: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  chiefComplaint?: string;
  patientNotes?: string;
  attachments?: string[];
  homeVisitAddress?: {
    street?: string;
    city?: string;
    pincode?: string;
    coordinates?: { lat: number; lng: number };
  };
  payment: {
    amount: number;
    status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';
    transactionId?: string;
    paymentIntentId?: string;
    method?: string;
    timestamp?: Date;
    failureReason?: string;
  };
  prescription?: Types.ObjectId;
  scanReportId?: Types.ObjectId;
  rating?: { score: number; review?: string; timestamp: Date };
  cancellation?: { cancelledBy: string; reason: string; timestamp: Date };
  videoCallDetails?: {
    roomId?: string;
    startTime?: Date;
    endTime?: Date;
    recordingUrl?: string;
  };
  doctorResponse?: 'pending' | 'accepted' | 'rejected';
  doctorResponseAt?: Date;
  doctorRejectionReason?: string;
  reminders?: {
    email24h?: boolean;
    email24hSentAt?: Date;
    sms1h?: boolean;
    sms1hSentAt?: Date;
    socket30m?: boolean;
    socket30mSentAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    appointmentId: { type: String, required: true, unique: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    consultationType: {
      type: String,
      enum: ['video', 'audio', 'chat', 'homeVisit'],
      required: true,
    },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, required: true },
    duration: { type: Number, default: 30 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
      default: 'pending',
    },
    chiefComplaint: String,
    patientNotes: String,
    attachments: [String],
    homeVisitAddress: {
      street: String,
      city: String,
      pincode: String,
      coordinates: { lat: Number, lng: Number },
    },
    payment: {
      amount: { type: Number, required: true },
      status: {
        type: String,
        enum: ['pending', 'processing', 'paid', 'failed', 'refunded'],
        default: 'pending',
      },
      transactionId: String,
      paymentIntentId: String,
      method: String,
      timestamp: Date,
      failureReason: String,
    },
    prescription: { type: Schema.Types.ObjectId, ref: 'Prescription' },
    scanReportId: { type: Schema.Types.ObjectId, ref: 'ScanReport' },
    rating: { score: Number, review: String, timestamp: Date },
    cancellation: { cancelledBy: String, reason: String, timestamp: Date },
    videoCallDetails: {
      roomId: String,
      startTime: Date,
      endTime: Date,
      recordingUrl: String,
    },
    doctorResponse: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    doctorResponseAt: Date,
    doctorRejectionReason: String,
    reminders: {
      email24h: { type: Boolean, default: false },
      email24hSentAt: Date,
      sms1h: { type: Boolean, default: false },
      sms1hSentAt: Date,
      socket30m: { type: Boolean, default: false },
      socket30mSentAt: Date,
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ patientId: 1, scheduledDate: -1 });
appointmentSchema.index({ doctorId: 1, scheduledDate: -1 });

export const Appointment = mongoose.model<IAppointment>('Appointment', appointmentSchema);
