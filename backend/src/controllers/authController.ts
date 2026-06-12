import { Request, Response } from 'express';
import {
  registerUser,
  loginWithOtp,
  loginWithEmailPassword,
  sendOtp,
  verifyOTP,
  devQuickLogin,
  unlockAccount,
  sanitizeUser,
} from '../services/authService.js';
import { asyncHandler } from '../middleware/validate.js';
import {
  extractRefreshToken,
  extractTokenJti,
} from '../middleware/auth.js';
import {
  rotateRefreshToken,
  revokeTokenPair,
} from '../services/tokenService.js';
import { setAuthCookies, clearAuthCookies } from '../utils/cookies.js';
import { resolveUserById } from '../services/userResolver.js';

function respondWithAuth(res: Response, result: { user: unknown; tokens: { accessToken: string; refreshToken: string } }) {
  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
  res.json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    },
  });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await registerUser(req.body);
  respondWithAuth(res, result);
});

export const sendOtpCode = asyncHandler(async (req: Request, res: Response) => {
  const { phone, purpose } = req.body;
  const result = await sendOtp(phone, purpose);
  res.json({ success: true, data: result });
});

export const loginOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  const result = await loginWithOtp(phone, otp);
  respondWithAuth(res, result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await loginWithEmailPassword(email, password);
  respondWithAuth(res, result);
});

export const quickDemoLogin = asyncHandler(async (req: Request, res: Response) => {
  const phone = (req.body.phone as string) || '9876543210';
  const result = await devQuickLogin(phone);
  respondWithAuth(res, result);
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  const result = await verifyOTP(phone, otp);
  res.json({ success: true, data: result });
});

export const refreshTokenHandler = asyncHandler(async (req: Request, res: Response) => {
  const token = extractRefreshToken(req);
  if (!token) {
    res.status(401).json({ success: false, message: 'Refresh token required' });
    return;
  }

  const newPair = await rotateRefreshToken(token);
  if (!newPair) {
    clearAuthCookies(res);
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    return;
  }

  setAuthCookies(res, newPair.accessToken, newPair.refreshToken);
  res.json({
    success: true,
    data: {
      message: 'Token refreshed',
      accessToken: newPair.accessToken,
      refreshToken: newPair.refreshToken,
    },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const accessJti = extractTokenJti(
    (req.cookies?.accessToken as string) || req.headers.authorization?.split(' ')[1] || null
  );
  const refreshJti = extractTokenJti(extractRefreshToken(req));

  await revokeTokenPair(accessJti, refreshJti, req.user?.userId);
  clearAuthCookies(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

export const unlockAccountHandler = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  const result = await unlockAccount(token);
  res.json({ success: true, data: result });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await resolveUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.json({ success: true, data: sanitizeUser(user) });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { User } = await import('../models/index.js');
  const user = await User.findByIdAndUpdate(
    req.user!.userId,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.json({ success: true, data: sanitizeUser(user) });
});
