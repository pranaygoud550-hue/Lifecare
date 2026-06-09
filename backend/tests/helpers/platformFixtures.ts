import bcrypt from 'bcryptjs';
import type { Types } from 'mongoose';
import { User } from '../../src/models/index.js';
import { issueTokenPair } from '../../src/services/tokenService.js';

export interface SeededDoctor {
  _id: Types.ObjectId;
  email: string;
  specialty: string;
  city: string;
  videoFee: number;
}

export interface PlatformSeed {
  doctors: SeededDoctor[];
  cardiologistHyderabad: SeededDoctor;
  pediatricianMumbai: SeededDoctor;
}

async function insertDoctor(params: {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  specialty: string;
  city: string;
  videoFee: number;
  experience: number;
}) {
  const result = await User.collection.insertOne({
    userType: 'doctor',
    email: params.email.toLowerCase(),
    phone: params.phone,
    password: await bcrypt.hash('DoctorPass123!', 4),
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    isBlocked: false,
    failedLoginAttempts: 0,
    profile: {
      firstName: params.firstName,
      lastName: params.lastName,
      address: { city: params.city, state: params.city === 'Mumbai' ? 'Maharashtra' : 'Telangana' },
    },
    doctorDetails: {
      registrationNumber: `REG-${params.phone}`,
      specializations: [params.specialty],
      experience: params.experience,
      consultationFees: {
        video: params.videoFee,
        audio: 300,
        chat: 200,
        homeVisit: 1200,
      },
      consultationTypes: ['video', 'audio', 'chat', 'homeVisit'],
      availability: [
        { day: 'Monday', slots: [{ startTime: '09:00', endTime: '17:00' }] },
        { day: 'Tuesday', slots: [{ startTime: '09:00', endTime: '17:00' }] },
      ],
      verified: true,
      verificationStatus: 'approved',
      rating: 4.5,
      reviewCount: 10,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const user = await User.findById(result.insertedId);
  if (!user) throw new Error('Failed to seed doctor');

  return {
    _id: user._id as Types.ObjectId,
    email: user.email,
    specialty: params.specialty,
    city: params.city,
    videoFee: params.videoFee,
  };
}

export async function seedDoctors(): Promise<PlatformSeed> {
  const cardiologistHyderabad = await insertDoctor({
    email: 'cardio.hyd@test.com',
    phone: '9222222201',
    firstName: 'Arjun',
    lastName: 'Reddy',
    specialty: 'Cardiology',
    city: 'Hyderabad',
    videoFee: 600,
    experience: 12,
  });

  const cardiologistHyderabadTwo = await insertDoctor({
    email: 'cardio2.hyd@test.com',
    phone: '9222222202',
    firstName: 'Meera',
    lastName: 'Iyer',
    specialty: 'Cardiology',
    city: 'Hyderabad',
    videoFee: 800,
    experience: 8,
  });

  const pediatricianMumbai = await insertDoctor({
    email: 'ped.mumbai@test.com',
    phone: '9222222203',
    firstName: 'Rahul',
    lastName: 'Shah',
    specialty: 'Pediatrics',
    city: 'Mumbai',
    videoFee: 500,
    experience: 6,
  });

  return {
    doctors: [cardiologistHyderabad, cardiologistHyderabadTwo, pediatricianMumbai],
    cardiologistHyderabad,
    pediatricianMumbai,
  };
}

export async function createPatientToken(params?: {
  email?: string;
  phone?: string;
  walletBalance?: number;
}) {
  const email = params?.email ?? 'patient.wallet@test.com';
  const phone = params?.phone ?? '9333333301';

  const result = await User.collection.insertOne({
    userType: 'patient',
    email,
    phone,
    password: await bcrypt.hash('Password123!', 4),
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    isBlocked: false,
    failedLoginAttempts: 0,
    profile: { firstName: 'Wallet', lastName: 'Patient' },
    wallet: { balance: params?.walletBalance ?? 2500, transactions: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const user = await User.findById(result.insertedId);
  if (!user) throw new Error('Failed to seed patient');

  const tokens = await issueTokenPair({
    userId: String(user._id),
    userType: 'patient',
    email: user.email,
  });

  return { user, accessToken: tokens.accessToken };
}
