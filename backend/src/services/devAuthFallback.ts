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
  '000000000000000000000004': '9876543215',
  '000000000000000000000005': '9876543216',
};

/** Demo accounts when MongoDB is unavailable (development only). */
export const DEV_DEMO_PHONES = [
  '9876543210',
  '9876543211',
  '9876543215',
  '9876543216',
  '9999999999',
] as const;

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
  '9876543215': {
    _id: '000000000000000000000004',
    userType: 'pharmacy',
    email: '9876543215@phone.lifecare.local',
    phone: '9876543215',
    isPhoneVerified: true,
    profile: { firstName: 'LifeCare', lastName: 'Pharmacy' },
    pharmacyDetails: {
      pharmacyName: 'LifeCare Pharmacy',
      licenseNumber: 'PH-12345',
      verified: true,
      rating: 4.5,
      deliveryRadius: 20,
    },
  },
  '9876543216': {
    _id: '000000000000000000000005',
    userType: 'ambulance',
    email: '9876543216@phone.lifecare.local',
    phone: '9876543216',
    isPhoneVerified: true,
    profile: { firstName: 'Ravi', lastName: 'Driver' },
    ambulanceDetails: {
      driverName: 'Ravi Driver',
      licenseNumber: 'DL-98765',
      vehicleNumber: 'MH-01-AB-1234',
      vehicleType: 'BLS',
      availability: true,
      rating: 4.7,
    },
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

const ROLE_DETAIL_FIELDS = [
  'ambulanceDetails',
  'doctorDetails',
  'pharmacyDetails',
  'hospitalAdminDetails',
] as const;

/** Remove invalid ambulance geo subdocs that break the 2dsphere index on non-driver accounts. */
export async function repairInvalidAmbulanceGeoOnUsers(): Promise<void> {
  if (!isDbReady()) return;

  await User.updateMany(
    { userType: { $ne: 'ambulance' }, ambulanceDetails: { $exists: true } },
    { $unset: { ambulanceDetails: '' } }
  );

  await User.updateMany(
    {
      userType: 'ambulance',
      $or: [
        { 'ambulanceDetails.location.coordinates': { $exists: false } },
        { 'ambulanceDetails.location.coordinates': { $size: 0 } },
        { 'ambulanceDetails.location.coordinates.1': { $exists: false } },
      ],
    },
    { $unset: { 'ambulanceDetails.location': '' } }
  );
}

/** Persist demo account in MongoDB so profile / medical-history APIs work after demo login. */
export async function ensureDevDemoUserInDb(phone: string) {
  const template = getDevUser(phone);
  if (!template || !isDbReady()) return null;

  await repairInvalidAmbulanceGeoOnUsers();

  const normalizedPhone = normalizePhone(phone);
  const hashedPassword = await bcrypt.hash('Password@123', 10);
  const userType = template.userType as string;

  const setFields: Record<string, unknown> = {
    userType: template.userType,
    email: template.email,
    isPhoneVerified: true,
    isEmailVerified: true,
    profile: template.profile,
  };
  if (template.medicalHistory) setFields.medicalHistory = template.medicalHistory;
  if (template.doctorDetails) setFields.doctorDetails = template.doctorDetails;
  if (template.pharmacyDetails) setFields.pharmacyDetails = template.pharmacyDetails;
  if (template.ambulanceDetails) setFields.ambulanceDetails = template.ambulanceDetails;

  const unsetFields: Record<string, string> = {};
  for (const field of ROLE_DETAIL_FIELDS) {
    if (!(field in template)) unsetFields[field] = '';
  }
  if (userType === 'ambulance' && !template.ambulanceDetails) {
    unsetFields['ambulanceDetails.location'] = '';
  }

  const update: Record<string, unknown> = {
    $set: setFields,
    $setOnInsert: { password: hashedPassword, phone: normalizedPhone },
  };
  if (Object.keys(unsetFields).length > 0) update.$unset = unsetFields;

  return User.findOneAndUpdate({ phone: normalizedPhone }, update, {
    upsert: true,
    new: true,
    runValidators: true,
    setDefaultsOnInsert: false,
  });
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
