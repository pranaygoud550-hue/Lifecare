import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Driver } from '../models/Driver.js';
import { Booking } from '../models/Booking.js';
import { env } from '../config/env.js';

const loginSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(4),
});

function signToken(id: string, role: 'driver' | 'admin') {
  return jwt.sign({ id, role }, env.jwtSecret, { expiresIn: '7d' });
}

export async function driverLogin(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid input' });

  const driver = await Driver.findOne({ phone: parsed.data.phone });
  if (!driver) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const ok = await bcrypt.compare(parsed.data.password, driver.passwordHash);
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  return res.json({
    success: true,
    data: {
      token: signToken(driver._id.toString(), 'driver'),
      driver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        vehicleNumber: driver.vehicleNumber,
        vehicleType: driver.vehicleType,
        rating: driver.rating,
        totalTrips: driver.totalTrips,
        earnings: driver.earnings,
      },
    },
  });
}

export async function getDriverRequests(req: Request, res: Response) {
  const pending = await Booking.find({ status: 'searching' }).sort({ createdAt: -1 }).limit(20);
  const mine = await Booking.find({ driverId: req.auth!.id }).sort({ createdAt: -1 }).limit(10);
  return res.json({ success: true, data: { pending, mine } });
}

export async function getDriverEarnings(req: Request, res: Response) {
  const driver = await Driver.findById(req.auth!.id);
  if (!driver) return res.status(404).json({ success: false, message: 'Not found' });
  const trips = await Booking.find({ driverId: driver._id, status: 'completed' })
    .sort({ completedAt: -1 })
    .limit(30);
  return res.json({
    success: true,
    data: { earnings: driver.earnings, totalTrips: driver.totalTrips, trips },
  });
}
