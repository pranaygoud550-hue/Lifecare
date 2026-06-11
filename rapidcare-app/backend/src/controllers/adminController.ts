import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Admin } from '../models/Admin.js';
import { Booking } from '../models/Booking.js';
import { Driver } from '../models/Driver.js';
import { Vehicle } from '../models/Vehicle.js';
import { env } from '../config/env.js';

export async function adminLogin(req: Request, res: Response) {
  const schema = z.object({ email: z.string().email(), password: z.string().min(4) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid input' });

  const admin = await Admin.findOne({ email: parsed.data.email });
  if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  const ok = await bcrypt.compare(parsed.data.password, admin.passwordHash);
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const token = jwt.sign({ id: admin._id.toString(), role: 'admin' }, env.jwtSecret, { expiresIn: '1d' });
  return res.json({ success: true, data: { token, admin: { name: admin.name, email: admin.email } } });
}

export async function getDashboardAnalytics(_req: Request, res: Response) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

  const [totalBookings, todayBookings, completed, revenueAgg, drivers, vehicles, heatmap] = await Promise.all([
    Booking.countDocuments(),
    Booking.countDocuments({ createdAt: { $gte: startOfDay } }),
    Booking.find({ status: 'completed', completedAt: { $gte: startOfMonth } }),
    Booking.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$fare' } } },
    ]),
    Driver.find().select('name phone vehicleNumber isAvailable rating totalTrips'),
    Vehicle.find(),
    Booking.find({ createdAt: { $gte: startOfMonth } }).select('pickupLocation status'),
  ]);

  const responseTimes = completed
    .filter((b) => b.dispatchTime && b.arrivalTime)
    .map((b) => (b.arrivalTime!.getTime() - b.dispatchTime!.getTime()) / 60000);
  const avgResponse =
    responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 8;

  return res.json({
    success: true,
    data: {
      totalBookings,
      todayBookings,
      monthlyRevenue: revenueAgg[0]?.total || 0,
      avgResponseMinutes: avgResponse,
      drivers,
      vehicles,
      heatmap: heatmap.map((b) => ({
        lat: b.pickupLocation.coords.lat,
        lng: b.pickupLocation.coords.lng,
        status: b.status,
      })),
    },
  });
}

export async function createVehicle(req: Request, res: Response) {
  const vehicle = await Vehicle.create(req.body);
  return res.status(201).json({ success: true, data: vehicle });
}

export async function createDriver(req: Request, res: Response) {
  const schema = z.object({
    name: z.string(),
    phone: z.string(),
    password: z.string(),
    vehicleNumber: z.string(),
    vehicleType: z.enum(['BLS', 'ALS', 'PTV', 'MORTUARY']),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid input' });
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const driver = await Driver.create({ ...parsed.data, passwordHash });
  return res.status(201).json({ success: true, data: driver });
}
