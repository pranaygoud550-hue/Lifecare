import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { User, Hospital } from '../models/index.js';
import type { IUser } from '../models/User.js';

export interface CreateHospitalAdminInput {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  hospitalId: string;
  designation?: string;
  bloodBankLicenseNumber: string;
  hospitalAuthorizationId?: string;
}

export function isHospitalLegalComplete(
  details?: IUser['hospitalAdminDetails']
): boolean {
  if (!details?.bloodBankLicenseNumber?.trim()) return false;
  if (!details.legalAcknowledgedAt) return false;
  return true;
}

export async function acknowledgeHospitalLegal(
  userId: string,
  input: {
    acknowledgedBy: string;
    bloodBankLicenseNumber: string;
    hospitalAuthorizationId?: string;
    acceptTerms: boolean;
  }
) {
  if (!input.acceptTerms) {
    throw Object.assign(new Error('You must accept the legal terms to use blood alerts'), {
      statusCode: 400,
    });
  }
  if (!input.bloodBankLicenseNumber?.trim()) {
    throw Object.assign(new Error('Blood bank license number is required'), { statusCode: 400 });
  }
  if (!input.acknowledgedBy?.trim()) {
    throw Object.assign(new Error('Authorized officer name is required'), { statusCode: 400 });
  }

  const user = await User.findById(userId);
  if (!user || user.userType !== 'hospital_admin') {
    throw Object.assign(new Error('Hospital admin account not found'), { statusCode: 404 });
  }

  user.hospitalAdminDetails = {
    ...user.hospitalAdminDetails,
    hospitalId: user.hospitalAdminDetails?.hospitalId,
    designation: user.hospitalAdminDetails?.designation,
    verified: user.hospitalAdminDetails?.verified ?? true,
    bloodBankLicenseNumber: input.bloodBankLicenseNumber.trim(),
    hospitalAuthorizationId: input.hospitalAuthorizationId?.trim(),
    legalAcknowledgedAt: new Date(),
    legalAcknowledgedBy: input.acknowledgedBy.trim(),
    legalTermsVersion: (await import('../constants/hospitalLegalTerms.js')).HOSPITAL_LEGAL_TERMS_VERSION,
  };
  await user.save();
  return user;
}

export async function createHospitalAdminAccount(
  input: CreateHospitalAdminInput
): Promise<IUser> {
  const hospital = await Hospital.findById(input.hospitalId);
  if (!hospital) {
    throw new Error('Hospital not found');
  }

  const existing = await User.findOne({
    $or: [{ email: input.email.toLowerCase() }, { phone: input.phone }],
  });
  if (existing) {
    throw new Error('Email or phone already registered');
  }

  const hashed = await bcrypt.hash(input.password, 10);
  return User.create({
    userType: 'hospital_admin',
    email: input.email.toLowerCase(),
    phone: input.phone,
    password: hashed,
    isEmailVerified: true,
    isPhoneVerified: true,
    profile: {
      firstName: input.firstName,
      lastName: input.lastName,
    },
    hospitalAdminDetails: {
      hospitalId: new Types.ObjectId(input.hospitalId),
      designation: input.designation || 'Blood bank coordinator',
      verified: true,
      bloodBankLicenseNumber: input.bloodBankLicenseNumber.trim(),
      hospitalAuthorizationId: input.hospitalAuthorizationId?.trim(),
    },
  });
}

export async function listHospitalAdmins() {
  return User.find({ userType: 'hospital_admin' })
    .select('profile email phone hospitalAdminDetails createdAt isActive')
    .populate('hospitalAdminDetails.hospitalId', 'name city address')
    .sort({ createdAt: -1 })
    .lean();
}

export async function getHospitalAdminWithHospital(userId: string) {
  const user = await User.findById(userId)
    .select('userType hospitalAdminDetails profile email phone')
    .populate('hospitalAdminDetails.hospitalId')
    .lean();
  if (!user || user.userType !== 'hospital_admin') {
    throw new Error('Hospital admin account not found');
  }
  if (!user.hospitalAdminDetails?.hospitalId) {
    throw new Error('Hospital admin is not linked to a hospital');
  }
  return user;
}
