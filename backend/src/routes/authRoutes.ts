import { Router } from 'express';
import {
  register,
  verifyEmail,
  refreshTokenHandler,
  logout,
  getProfile,
  updateProfile,
  sendOtpCode,
  loginOtp,
  login,
  quickDemoLogin,
  unlockAccountHandler,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  registerWithOtpSchema,
  sendOtpSchema,
  loginSchema,
  loginOtpSchema,
  demoLoginSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  unlockAccountSchema,
  updateProfileSchema,
} from '../utils/schemas.js';

const router = Router();

router.post('/register', validate(registerWithOtpSchema), register);
router.post('/send-otp', validate(sendOtpSchema), sendOtpCode);
router.post('/login', validate(loginSchema), login);
router.post('/login-otp', validate(loginOtpSchema), loginOtp);
router.post('/demo-login', validate(demoLoginSchema), quickDemoLogin);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/refresh-token', validate(refreshTokenSchema), refreshTokenHandler);
router.post('/unlock-account', validate(unlockAccountSchema), unlockAccountHandler);
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);

export default router;
