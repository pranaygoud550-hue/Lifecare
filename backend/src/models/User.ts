import mongoose, { Schema, Document } from 'mongoose';

export type UserType = 'patient' | 'doctor' | 'pharmacy' | 'ambulance' | 'admin';

export interface IUser extends Document {
  userType: UserType;
  email: string;
  phone: string;
  password: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  twoFactorEnabled: boolean;
  profile: {
    firstName: string;
    lastName: string;
    dateOfBirth?: Date;
    gender?: string;
    profilePhoto?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      pincode?: string;
      coordinates?: { lat: number; lng: number };
    };
    emergencyContacts?: Array<{
      name: string;
      relation: string;
      phone: string;
    }>;
  };
  medicalHistory?: {
    bloodGroup?: string;
    heightCm?: number;
    weightKg?: number;
    organDonor?: boolean;
    smokingStatus?: string;
    alcoholUse?: string;
    allergies?: string[];
    chronicConditions?: string[];
    currentMedications?: string[];
    pastSurgeries?: Array<{ surgery: string; date: Date; hospital: string }>;
    familyHistory?: string[];
    lastHealthCheckup?: Date;
    insuranceProvider?: string;
    insuranceNumber?: string;
    profileCompleted?: boolean;
  };
  doctorDetails?: {
    registrationNumber?: string;
    qualifications?: string[];
    specializations?: string[];
    experience?: number;
    languages?: string[];
    bio?: string;
    consultationFees?: {
      video?: number;
      audio?: number;
      chat?: number;
      homeVisit?: number;
    };
    availability?: Array<{
      day: string;
      slots: Array<{ startTime: string; endTime: string }>;
    }>;
    hospitalAffiliations?: string[];
    clinic?: {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      coordinates?: { lat: number; lng: number };
    };
    education?: Array<{
      degree: string;
      institution: string;
      year?: number;
    }>;
    awards?: string[];
    verified?: boolean;
    verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
    verificationDocuments?: {
      medicalLicenseNumber?: string;
      medicalLicenseFile?: string;
      degreeCertificateFile?: string;
      identityProofFile?: string;
      submittedAt?: Date;
    };
    rejectionReason?: string;
    verifiedAt?: Date;
    verifiedBy?: mongoose.Types.ObjectId;
    rating?: number;
    reviewCount?: number;
    consultationTypes?: string[];
  };
  pharmacyDetails?: {
    pharmacyName?: string;
    licenseNumber?: string;
    gstNumber?: string;
    operatingHours?: string;
    deliveryRadius?: number;
    verified?: boolean;
    rating?: number;
  };
  ambulanceDetails?: {
    driverName?: string;
    licenseNumber?: string;
    vehicleNumber?: string;
    vehicleType?: string;
    availability?: boolean;
    currentLocation?: { lat: number; lng: number; timestamp: Date };
    location?: { type: 'Point'; coordinates: [number, number] };
    certifications?: string[];
    totalTrips?: number;
    policeVerified?: boolean;
    policeVerifiedAt?: Date;
    rating?: number;
  };
  wallet?: {
    balance: number;
    transactions: Array<{
      _id?: mongoose.Types.ObjectId;
      type: 'credit' | 'debit';
      amount: number;
      description: string;
      timestamp: Date;
      balanceAfter?: number;
      category?: 'topup' | 'appointment' | 'pharmacy' | 'refund' | 'other';
      appointmentId?: string;
      paymentIntentId?: string;
      refundStatus?: 'none' | 'requested' | 'approved' | 'rejected' | 'completed';
    }>;
  };
  healthDataSharing?: {
    shareVitalsWithDoctors: boolean;
    shareWellnessWithDoctors: boolean;
    updatedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  isBlocked: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: Date;
  unlockToken?: string;
  unlockTokenExpires?: Date;
}

const userSchema = new Schema<IUser>(
  {
    userType: {
      type: String,
      enum: ['patient', 'doctor', 'pharmacy', 'ambulance', 'admin'],
      required: true,
    },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    phone: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true, select: false },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    profile: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      dateOfBirth: Date,
      gender: String,
      profilePhoto: String,
      address: {
        street: String,
        city: String,
        state: String,
        country: String,
        pincode: String,
        coordinates: { lat: Number, lng: Number },
      },
      emergencyContacts: [
        { name: String, relation: String, phone: String },
      ],
    },
    medicalHistory: {
      bloodGroup: String,
      heightCm: Number,
      weightKg: Number,
      organDonor: Boolean,
      smokingStatus: String,
      alcoholUse: String,
      allergies: [String],
      chronicConditions: [String],
      currentMedications: [String],
      pastSurgeries: [{ surgery: String, date: Date, hospital: String }],
      familyHistory: [String],
      lastHealthCheckup: Date,
      insuranceProvider: String,
      insuranceNumber: String,
      profileCompleted: { type: Boolean, default: false },
    },
    doctorDetails: {
      registrationNumber: String,
      qualifications: [String],
      specializations: [String],
      experience: Number,
      languages: [String],
      bio: String,
      consultationFees: {
        video: Number,
        audio: Number,
        chat: Number,
        homeVisit: Number,
      },
      availability: [
        {
          day: String,
          slots: [{ startTime: String, endTime: String }],
        },
      ],
      hospitalAffiliations: [String],
      clinic: {
        name: String,
        address: String,
        city: String,
        state: String,
        pincode: String,
        coordinates: { lat: Number, lng: Number },
      },
      education: [
        {
          degree: String,
          institution: String,
          year: Number,
        },
      ],
      awards: [String],
      verified: { type: Boolean, default: false },
      verificationStatus: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none',
      },
      verificationDocuments: {
        medicalLicenseNumber: String,
        medicalLicenseFile: String,
        degreeCertificateFile: String,
        identityProofFile: String,
        submittedAt: Date,
      },
      rejectionReason: String,
      verifiedAt: Date,
      verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      rating: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
      consultationTypes: [String],
    },
    pharmacyDetails: {
      pharmacyName: String,
      licenseNumber: String,
      gstNumber: String,
      operatingHours: String,
      deliveryRadius: Number,
      verified: { type: Boolean, default: false },
      rating: { type: Number, default: 0 },
    },
    ambulanceDetails: {
      driverName: String,
      licenseNumber: String,
      vehicleNumber: String,
      vehicleType: String,
      availability: { type: Boolean, default: true },
      currentLocation: { lat: Number, lng: Number, timestamp: Date },
      location: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] },
      },
      certifications: [String],
      totalTrips: { type: Number, default: 0 },
      policeVerified: { type: Boolean, default: false },
      policeVerifiedAt: Date,
      rating: { type: Number, default: 0 },
    },
    wallet: {
      balance: { type: Number, default: 0 },
      transactions: [
        {
          type: { type: String, enum: ['credit', 'debit'], required: true },
          amount: { type: Number, required: true },
          description: { type: String, required: true },
          timestamp: { type: Date, default: Date.now },
          balanceAfter: Number,
          category: {
            type: String,
            enum: ['topup', 'appointment', 'pharmacy', 'refund', 'other'],
            default: 'other',
          },
          appointmentId: String,
          paymentIntentId: { type: String, index: true, sparse: true },
          refundStatus: {
            type: String,
            enum: ['none', 'requested', 'approved', 'rejected', 'completed'],
            default: 'none',
          },
        },
      ],
    },
    lastLogin: Date,
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    unlockToken: String,
    unlockTokenExpires: Date,
    healthDataSharing: {
      shareVitalsWithDoctors: { type: Boolean, default: false },
      shareWellnessWithDoctors: { type: Boolean, default: false },
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

userSchema.index({ 'doctorDetails.specializations': 1 });
userSchema.index({ 'doctorDetails.rating': -1 });
userSchema.index({ 'ambulanceDetails.location': '2dsphere' });

userSchema.pre('save', function stripInvalidAmbulanceGeo(next) {
  const loc = this.ambulanceDetails?.location;
  if (loc && (!loc.coordinates || loc.coordinates.length !== 2)) {
    this.set('ambulanceDetails.location', undefined);
  }
  next();
});

export const User = mongoose.model<IUser>('User', userSchema);
