import type { Express } from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { User } from '../../src/models/index.js';
import { hashPassword } from '../../src/services/authService.js';
import { issueTokenPair } from '../../src/services/tokenService.js';
import type { UserType } from '../../src/types/index.js';

export const TEST_PASSWORD = 'Password123!';

export async function requestRegisterOtp(
  app: Express,
  phone: string
): Promise<{ otp: string }> {
  const response = await request(app).post('/api/auth/send-otp').send({
    phone,
    purpose: 'register',
  });

  expect(response.status).toBe(200);
  expect(response.body.data.otp).toBeDefined();
  return { otp: response.body.data.otp as string };
}

export async function registerPatient(
  app: Express,
  overrides?: Partial<{
    phone: string;
    firstName: string;
    lastName: string;
    otp: string;
  }>
) {
  const phone = overrides?.phone ?? '9111111111';
  let otp = overrides?.otp;

  if (!otp) {
    ({ otp } = await requestRegisterOtp(app, phone));
  }

  const response = await request(app)
    .post('/api/auth/register')
    .send({
      userType: 'patient',
      phone,
      firstName: overrides?.firstName ?? 'Alice',
      lastName: overrides?.lastName ?? 'Patient',
      otp,
    });

  return { response, phone, otp: otp! };
}

export async function createUserWithPassword(params: {
  email: string;
  phone: string;
  password?: string;
  userType?: UserType;
  firstName?: string;
  lastName?: string;
  walletBalance?: number;
}) {
  const password = params.password ?? TEST_PASSWORD;
  const userType = params.userType ?? 'patient';

  const doc: Record<string, unknown> = {
    userType,
    email: params.email.toLowerCase(),
    phone: params.phone,
    password: await hashPassword(password),
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    isBlocked: false,
    failedLoginAttempts: 0,
    profile: {
      firstName: params.firstName ?? 'Test',
      lastName: params.lastName ?? 'User',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (userType === 'patient') {
    doc.wallet = {
      balance: params.walletBalance ?? 0,
      transactions: [],
    };
  }

  if (userType === 'doctor') {
    doc.doctorDetails = {
      registrationNumber: `REG-${params.phone}`,
      specializations: ['General Physician'],
      experience: 5,
      consultationFees: { video: 500, audio: 300, chat: 200, homeVisit: 1000 },
      consultationTypes: ['video'],
      verified: true,
      verificationStatus: 'approved',
      rating: 4,
      reviewCount: 1,
    };
  }

  const result = await User.collection.insertOne(doc);
  const user = await User.findById(result.insertedId);
  if (!user) throw new Error('Failed to create test user');

  const tokens = await issueTokenPair({
    userId: String(user._id),
    userType: user.userType,
    email: user.email,
  });

  return {
    user,
    password,
    accessToken: tokens.accessToken,
  };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export async function loginWithPassword(
  app: Express,
  email: string,
  password: string
) {
  return request(app).post('/api/auth/login').send({ email, password });
}

/** Direct insert to avoid invalid geo defaults on non-ambulance users. */
export async function insertPatientRecord(params: {
  email: string;
  phone: string;
  password?: string;
  walletBalance?: number;
}) {
  const password = params.password ?? TEST_PASSWORD;
  const doc = {
    userType: 'patient',
    email: params.email.toLowerCase(),
    phone: params.phone,
    password: await bcrypt.hash(password, 4),
    isEmailVerified: true,
    isPhoneVerified: true,
    profile: { firstName: 'Seed', lastName: 'Patient' },
    wallet: { balance: params.walletBalance ?? 1500, transactions: [] },
    isActive: true,
    isBlocked: false,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await User.collection.insertOne(doc);
  const user = await User.findById(result.insertedId);
  return { user, password };
}
