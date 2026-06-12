import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { isDbReady } from '../config/dbStatus.js';
import { User } from '../models/index.js';
import type { UserType } from '../types/index.js';
import { normalizePhone } from '../utils/phone.js';

const DEV_ID_TO_PHONE: Record<string, string> = {
  '000000000000000000000001': '9876543210',
  '000000000000000000000002': '9876543211',
  '000000000000000000000003': '9999999999',
};

/** Demo accounts when MongoDB is unavailable (development only). */
export const DEV_DEMO_PHONES = ['9876543210', '9876543211', '9999999999'] as const;

const devUsers: Record<string, Record<string, unknown>> = {
  '9876543210': {
    _id: '000000000000000000000001',
    userType: 'patient',
    email: '9876543210@phone.lifecare.local',
    phone: '9876543210',
    isPhoneVerified: true,
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      gender: 'Male',
      address: { city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400001' },
    },
    medicalHistory: {
      bloodGroup: 'O+',
      heightCm: 170,
      weightKg: 68,
      profileCompleted: true,
      allergies: ['Penicillin'],
      chronicConditions: [],
    },
  },
  '9876543211': {
    _id: '000000000000000000000002',
    userType: 'doctor',
    email: '9876543211@phone.lifecare.local',
    phone: '9876543211',
    isPhoneVerified: true,
    profile: { firstName: 'Rajesh', lastName: 'Sharma' },
    doctorDetails: {
      specializations: ['Cardiology'],
      experience: 15,
      verified: true,
      rating: 4.8,
      reviewCount: 120,
      consultationTypes: ['video', 'audio', 'chat'],
    },
  },
  '9999999999': {
    _id: '000000000000000000000003',
    userType: 'admin',
    email: '9999999999@phone.lifecare.local',
    phone: '9999999999',
    isPhoneVerified: true,
    profile: { firstName: 'Admin', lastName: 'User' },
  },
};

export const isDevDemoPhone = (phone: string) =>
  DEV_DEMO_PHONES.includes(normalizePhone(phone) as (typeof DEV_DEMO_PHONES)[number]);

export const getDevUser = (phone: string) => {
  const user = devUsers[normalizePhone(phone)];
  if (!user) return null;
  return user;
};

export const isDevDemoUserId = (userId: string) => userId in DEV_ID_TO_PHONE;

export const devUserIdToPhone = (userId: string) => DEV_ID_TO_PHONE[userId] ?? null;

/** Persist demo account in MongoDB so profile / medical-history APIs work after demo login. */
export async function ensureDevDemoUserInDb(phone: string) {
  const template = getDevUser(phone);
  if (!template || !isDbReady()) return null;

  const normalizedPhone = normalizePhone(phone);
  const hashedPassword = await bcrypt.hash('Password@123', 10);

  const setFields: Record<string, unknown> = {
    userType: template.userType,
    email: template.email,
    isPhoneVerified: true,
    isEmailVerified: true,
    profile: template.profile,
  };
  if (template.medicalHistory) setFields.medicalHistory = template.medicalHistory;
  if (template.doctorDetails) setFields.doctorDetails = template.doctorDetails;

  return User.findOneAndUpdate(
    { phone: normalizedPhone },
    {
      $set: setFields,
      $setOnInsert: { password: hashedPassword, phone: normalizedPhone },
    },
    { upsert: true, new: true, runValidators: true }
  );
}

export const devLoginTokens = (phone: string) => {
  const user = getDevUser(phone);
  if (!user) return null;

  const tokenPayload = {
    userId: String(user._id),
    userType: user.userType as UserType,
    email: String(user.email),
  };

  const accessJti = uuidv4();
  const refreshJti = uuidv4();

  return {
    user,
    accessToken: jwt.sign(
      { ...tokenPayload, jti: accessJti },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    ),
    refreshToken: jwt.sign(
      { ...tokenPayload, jti: refreshJti, familyId: 'dev' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions
    ),
  };
};
