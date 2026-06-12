import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/index.js';
import { config } from '../config/index.js';
import { issueTokenPair, type TokenPair } from './tokenService.js';
import { sendAccountUnlockEmail } from './emailService.js';
import type { UserType } from '../types/index.js';
import { isDbReady } from '../config/dbStatus.js';
import { devLoginTokens, isDevDemoPhone } from './devAuthFallback.js';
import { normalizePhone } from '../utils/phone.js';

const MAX_FAILED_ATTEMPTS = 10;

type OtpPurpose = 'login' | 'register';

interface OtpEntry {
  otp: string;
  expiresAt: Date;
  purpose: OtpPurpose;
}

const otpStore = new Map<string, OtpEntry>();

const otpKey = (phone: string, purpose: OtpPurpose) => `${purpose}:${normalizePhone(phone)}`;

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const phoneToPlaceholderEmail = (phone: string) =>
  `${normalizePhone(phone)}@phone.lifecare.local`;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export interface MedicalHistoryInput {
  bloodGroup?: string;
  heightCm?: number;
  weightKg?: number;
  organDonor?: boolean;
  smokingStatus?: string;
  alcoholUse?: string;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  familyHistory?: string[];
  insuranceProvider?: string;
  insuranceNumber?: string;
  profileCompleted?: boolean;
}

interface RegisterData {
  userType: UserType;
  phone: string;
  firstName: string;
  lastName: string;
  otp: string;
  email?: string;
  password?: string;
  dateOfBirth?: string;
  gender?: string;
  medicalHistory?: MedicalHistoryInput;
  registrationNumber?: string;
  specializations?: string[];
  experience?: number;
  pharmacyName?: string;
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: string;
}

export interface AuthResult {
  user: ReturnType<typeof sanitizeUser>;
  tokens: TokenPair;
}

const storeAndReturnOtp = (normalizedPhone: string, purpose: OtpPurpose) => {
  const otp = generateOtp();
  otpStore.set(otpKey(normalizedPhone, purpose), {
    otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    purpose,
  });
  console.log(`[LifeCare+ OTP] ${purpose} for +91${normalizedPhone}: ${otp}`);
  const isDev = process.env.NODE_ENV !== 'production';
  return {
    message: isDev ? 'Your sign-in code is ready below' : `OTP sent to +91 ${normalizedPhone}`,
    expiresInMinutes: 10,
    otp: isDev ? otp : undefined,
  };
};

async function assertAccountNotLocked(user: {
  lockedUntil?: Date;
  email: string;
  profile?: { firstName?: string };
}) {
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw Object.assign(
      new Error(
        'Account locked due to too many failed sign-in attempts. Use the unlock link sent to your registered contact.'
      ),
      { statusCode: 423, code: 'ACCOUNT_LOCKED' }
    );
  }
}

async function recordFailedLogin(user: InstanceType<typeof User>) {
  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

  if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    const unlockToken = crypto.randomBytes(32).toString('hex');
    user.unlockToken = unlockToken;
    user.unlockTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.lockedUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const unlockUrl = `${config.frontendUrl}/unlock-account?token=${unlockToken}`;
    if (user.email && !user.email.endsWith('@phone.lifecare.local')) {
      await sendAccountUnlockEmail({
        to: user.email,
        unlockUrl,
        firstName: user.profile?.firstName,
      });
    }

    await user.save();
    throw Object.assign(
      new Error(
        'Account locked after too many failed attempts. Contact support or use your unlock link if you have one.'
      ),
      { statusCode: 423, code: 'ACCOUNT_LOCKED' }
    );
  }

  await user.save();
}

async function clearLoginFailures(user: InstanceType<typeof User>) {
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.unlockToken = undefined;
  user.unlockTokenExpires = undefined;
  user.lastLogin = new Date();
  await user.save();
}

async function buildAuthResult(user: InstanceType<typeof User>): Promise<AuthResult> {
  const tokens = await issueTokenPair({
    userId: user._id.toString(),
    userType: user.userType,
    email: user.email,
  });
  return { user: sanitizeUser(user), tokens };
}

export const sendOtp = async (phone: string, purpose: OtpPurpose) => {
  const normalizedPhone = normalizePhone(phone);

  if (
    purpose === 'login' &&
    process.env.NODE_ENV !== 'production' &&
    isDevDemoPhone(normalizedPhone)
  ) {
    return storeAndReturnOtp(normalizedPhone, purpose);
  }

  if (!isDbReady()) {
    if (purpose === 'login') {
      if (!isDevDemoPhone(normalizedPhone)) {
        throw Object.assign(
          new Error('Database offline. Use demo number 9876543210 or start MongoDB (see README).'),
          { statusCode: 503 }
        );
      }
      return storeAndReturnOtp(normalizedPhone, purpose);
    }
    throw Object.assign(
      new Error('Registration needs MongoDB running. Use demo sign-in or start the database.'),
      { statusCode: 503 }
    );
  }

  const user = await User.findOne({ phone: normalizedPhone });

  if (purpose === 'login') {
    if (!user || user.isBlocked) {
      if (process.env.NODE_ENV !== 'production' && isDevDemoPhone(normalizedPhone)) {
        return storeAndReturnOtp(normalizedPhone, purpose);
      }
      throw Object.assign(new Error('No account found with this mobile number'), { statusCode: 404 });
    }
    await assertAccountNotLocked(user);
  } else if (purpose === 'register' && user) {
    throw Object.assign(new Error('An account with this mobile number already exists'), {
      statusCode: 409,
    });
  }

  return storeAndReturnOtp(normalizedPhone, purpose);
};

const verifyOtpForPurpose = (phone: string, otp: string, purpose: OtpPurpose) => {
  const key = otpKey(phone, purpose);
  const stored = otpStore.get(key);
  if (!stored || stored.otp !== otp || stored.expiresAt < new Date() || stored.purpose !== purpose) {
    throw Object.assign(new Error('Invalid or expired OTP'), { statusCode: 400 });
  }
  otpStore.delete(key);
};

export const registerUser = async (data: RegisterData): Promise<AuthResult> => {
  const normalizedPhone = normalizePhone(data.phone);
  verifyOtpForPurpose(normalizedPhone, data.otp, 'register');

  const existingUser = await User.findOne({ phone: normalizedPhone });

  if (existingUser) {
    throw Object.assign(new Error('User with this mobile number already exists'), {
      statusCode: 409,
    });
  }

  const hashedPassword = data.password
    ? await hashPassword(data.password)
    : await hashPassword(crypto.randomBytes(32).toString('hex'));

  const profile: Record<string, unknown> = {
    firstName: data.firstName,
    lastName: data.lastName,
  };
  if (data.dateOfBirth) profile.dateOfBirth = new Date(data.dateOfBirth);
  if (data.gender) profile.gender = data.gender;

  const userData: Record<string, unknown> = {
    userType: data.userType,
    email: data.email ?? phoneToPlaceholderEmail(normalizedPhone),
    phone: normalizedPhone,
    password: hashedPassword,
    profile,
    isEmailVerified: false,
    isPhoneVerified: true,
  };

  if (data.userType === 'patient' && data.medicalHistory) {
    userData.medicalHistory = {
      ...data.medicalHistory,
      profileCompleted: !!data.medicalHistory.bloodGroup,
    };
  }

  if (data.userType === 'doctor') {
    userData.doctorDetails = {
      registrationNumber: data.registrationNumber,
      specializations: data.specializations || ['General Physician'],
      experience: data.experience || 0,
      consultationFees: { video: 500, audio: 300, chat: 200, homeVisit: 1000 },
      consultationTypes: ['video', 'audio', 'chat', 'homeVisit'],
      availability: [
        { day: 'Monday', slots: [{ startTime: '09:00', endTime: '17:00' }] },
        { day: 'Tuesday', slots: [{ startTime: '09:00', endTime: '17:00' }] },
        { day: 'Wednesday', slots: [{ startTime: '09:00', endTime: '17:00' }] },
        { day: 'Thursday', slots: [{ startTime: '09:00', endTime: '17:00' }] },
        { day: 'Friday', slots: [{ startTime: '09:00', endTime: '17:00' }] },
      ],
      verified: false,
      verificationStatus: 'none',
      rating: 0,
      reviewCount: 0,
    };
  }

  if (data.userType === 'pharmacy') {
    userData.pharmacyDetails = {
      pharmacyName: data.pharmacyName,
      licenseNumber: data.licenseNumber,
      verified: false,
      rating: 0,
    };
  }

  if (data.userType === 'ambulance') {
    userData.ambulanceDetails = {
      driverName: `${data.firstName} ${data.lastName}`,
      vehicleNumber: data.vehicleNumber,
      vehicleType: data.vehicleType || 'BLS',
      availability: true,
      rating: 0,
    };
  }

  const user = await User.create(userData);
  return buildAuthResult(user);
};

export const loginWithEmailPassword = async (email: string, password: string): Promise<AuthResult> => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user || user.isBlocked) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  await assertAccountNotLocked(user);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    await recordFailedLogin(user);
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  await clearLoginFailures(user);
  return buildAuthResult(user);
};

export const loginWithOtp = async (phone: string, otp: string): Promise<AuthResult> => {
  const normalizedPhone = normalizePhone(phone);
  verifyOtpForPurpose(normalizedPhone, otp, 'login');

  if (isDbReady()) {
    const user = await User.findOne({ phone: normalizedPhone });
    if (user && !user.isBlocked) {
      await assertAccountNotLocked(user);
      await clearLoginFailures(user);
      user.isPhoneVerified = true;
      await user.save();
      return buildAuthResult(user);
    }
  }

  if (process.env.NODE_ENV !== 'production' && isDevDemoPhone(normalizedPhone)) {
    if (isDbReady()) {
      let user = await User.findOne({ phone: normalizedPhone });
      if (!user) {
        const { runSeed } = await import('../utils/seed.js');
        await runSeed();
        user = await User.findOne({ phone: normalizedPhone });
      }
      if (user && !user.isBlocked) {
        await clearLoginFailures(user);
        user.isPhoneVerified = true;
        await user.save();
        return buildAuthResult(user);
      }
    }
    const result = devLoginTokens(normalizedPhone);
    if (result) {
      return {
        user: result.user as AuthResult['user'],
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          accessJti: uuidv4(),
          refreshJti: uuidv4(),
          familyId: 'dev',
        },
      };
    }
  }

  throw Object.assign(new Error('Account not found'), { statusCode: 404 });
};

export const unlockAccount = async (token: string) => {
  const user = await User.findOne({
    unlockToken: token,
    unlockTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    throw Object.assign(new Error('Invalid or expired unlock link'), { statusCode: 400 });
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.unlockToken = undefined;
  user.unlockTokenExpires = undefined;
  await user.save();

  return { message: 'Account unlocked. You can sign in now.' };
};

export const devQuickLogin = async (phone: string): Promise<AuthResult> => {
  const allowDemo =
    process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_LOGIN === 'true';
  if (!allowDemo) {
    throw Object.assign(new Error('Demo login disabled in production'), { statusCode: 403 });
  }
  const normalizedPhone = normalizePhone(phone);
  if (!isDevDemoPhone(normalizedPhone)) {
    throw Object.assign(new Error('Invalid demo account'), { statusCode: 400 });
  }

  if (isDbReady()) {
    const user = await User.findOne({ phone: normalizedPhone });
    if (user && !user.isBlocked) {
      user.isPhoneVerified = true;
      await user.save();
      return buildAuthResult(user);
    }
  }

  const result = devLoginTokens(normalizedPhone);
  if (!result) {
    throw Object.assign(new Error('Demo user not found'), { statusCode: 404 });
  }
  return {
    user: result.user as AuthResult['user'],
    tokens: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      accessJti: uuidv4(),
      refreshJti: uuidv4(),
      familyId: 'dev',
    },
  };
};

export const verifyOTP = async (phone: string, otp: string) => {
  const normalizedPhone = normalizePhone(phone);
  verifyOtpForPurpose(normalizedPhone, otp, 'register');
  await User.updateOne({ phone: normalizedPhone }, { isPhoneVerified: true });
  return { message: 'OTP verified successfully' };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sanitizeUser = (user: any) => {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  delete obj.unlockToken;
  delete obj.unlockTokenExpires;
  return obj;
};
