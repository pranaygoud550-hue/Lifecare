import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export async function getPatientSummaryByToken(req: Request, res: Response) {
  const secret = process.env.LIFECARE_WEBHOOK_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ success: false, message: 'Server misconfigured' });
  }

  try {
    const tokenParam = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    const decoded = jwt.verify(tokenParam, secret) as unknown as { userId: string; purpose?: string };
    if (decoded.purpose && decoded.purpose !== 'rapidcare_prefill') {
      return res.status(403).json({ success: false, message: 'Invalid token purpose' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.userType !== 'patient') {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const mh = user.medicalHistory;
    const name = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') || 'Patient';
    let age: number | undefined;
    if (user.profile?.dateOfBirth) {
      const yrs = (Date.now() - new Date(user.profile.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000);
      age = Math.floor(yrs);
    }
    return res.json({
      success: true,
      data: {
        lifecarePatientId: user._id.toString(),
        name,
        phone: user.phone,
        age,
        bloodGroup: mh?.bloodGroup,
        allergies: mh?.allergies?.join(', ') || '',
        conditions: mh?.chronicConditions?.join(', ') || '',
        emergencyContact: user.profile?.emergencyContacts?.[0]?.phone || user.phone,
      },
    });
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export async function createRapidCarePrefillToken(req: Request, res: Response) {
  const secret = process.env.LIFECARE_WEBHOOK_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ success: false, message: 'Server misconfigured' });
  }

  const token = jwt.sign(
    { userId: req.user!.userId, purpose: 'rapidcare_prefill' },
    secret,
    { expiresIn: '15m' }
  );

  return res.json({ success: true, data: { token } });
}
