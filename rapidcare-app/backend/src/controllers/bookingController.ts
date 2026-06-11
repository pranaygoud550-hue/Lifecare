import type { Request, Response } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { Booking } from '../models/Booking.js';
import { Driver } from '../models/Driver.js';
import { env } from '../config/env.js';
import { estimateFare, generateBookingId, generateOtp, haversineKm } from '../utils/fare.js';
import { sendBookingConfirmation } from '../services/notificationService.js';
import { syncBookingToLifecare } from '../services/lifecareSyncService.js';
import {
  emitBookingAccepted,
  emitBookingCompleted,
  emitBookingCreated,
  emitDriverLocation,
} from '../services/socketService.js';

const stripe = env.stripeSecret ? new Stripe(env.stripeSecret) : null;

const createSchema = z.object({
  serviceType: z.enum(['emergency', 'scheduled', 'diagnostic']),
  patientName: z.string().min(2),
  age: z.number().min(0).max(120),
  phone: z.string().min(10),
  emergencyContact: z.string().min(10),
  condition: z.string().min(3),
  isConscious: z.boolean(),
  allergies: z.string().optional(),
  pickup: z.object({
    address: z.string(),
    coords: z.object({ lat: z.number(), lng: z.number() }),
  }),
  destination: z.object({
    address: z.string(),
    coords: z.object({ lat: z.number(), lng: z.number() }),
    name: z.string().optional(),
  }),
  nearestHospital: z.boolean().optional(),
  vehicleType: z.enum(['BLS', 'ALS', 'PTV', 'MORTUARY']),
  paymentMethod: z.enum(['stripe', 'pay_on_arrival']),
  lifecarePatientId: z.string().optional(),
  scheduledAt: z.string().optional(),
});

export async function createBooking(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.flatten() });
  }
  const data = parsed.data;
  const distanceKm = haversineKm(data.pickup.coords, data.destination.coords);
  const fare = estimateFare(data.vehicleType, distanceKm);
  const bookingId = generateBookingId();
  const otp = generateOtp();

  let paymentIntentId: string | undefined;
  let paymentStatus: 'pending' | 'paid' | 'pay_on_arrival' = data.paymentMethod === 'pay_on_arrival' ? 'pay_on_arrival' : 'pending';

  if (data.paymentMethod === 'stripe' && stripe) {
    const intent = await stripe.paymentIntents.create({
      amount: fare * 100,
      currency: 'inr',
      metadata: { bookingId },
    });
    paymentIntentId = intent.id;
    paymentStatus = intent.status === 'succeeded' ? 'paid' : 'pending';
  }

  const booking = await Booking.create({
    bookingId,
    ...data,
    pickupLocation: data.pickup,
    destinationLocation: data.destination,
    distanceKm: Math.round(distanceKm * 10) / 10,
    fare,
    otp,
    paymentIntentId,
    paymentStatus,
    status: 'searching',
    dispatchTime: new Date(),
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
  });

  emitBookingCreated({
    bookingId: booking.bookingId,
    pickupLocation: booking.pickupLocation,
    vehicleType: booking.vehicleType,
  });

  await sendBookingConfirmation(booking);

  return res.status(201).json({
    success: true,
    data: {
      booking,
      clientSecret: paymentIntentId && stripe ? (await stripe.paymentIntents.retrieve(paymentIntentId)).client_secret : null,
      trackUrl: `/track/${booking.bookingId}`,
    },
  });
}

export async function getBooking(req: Request, res: Response) {
  const booking = await Booking.findOne({ bookingId: req.params.id }).populate('driverId', 'name phone vehicleNumber currentCoords rating');
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  return res.json({ success: true, data: booking });
}

export async function getLiveBookings(_req: Request, res: Response) {
  const bookings = await Booking.find({
    status: { $in: ['searching', 'accepted', 'en-route', 'arrived', 'in-transit'] },
  })
    .sort({ createdAt: -1 })
    .populate('driverId', 'name phone vehicleNumber');
  return res.json({ success: true, data: bookings });
}

export async function updateBookingStatus(req: Request, res: Response) {
  const { status } = req.body as { status: string };
  const booking = await Booking.findOne({ bookingId: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Not found' });

  booking.status = status as typeof booking.status;
  if (status === 'arrived') booking.arrivalTime = new Date();
  if (status === 'completed') {
    booking.completedAt = new Date();
    if (booking.driverId) {
      await Driver.findByIdAndUpdate(booking.driverId, {
        $inc: { totalTrips: 1, earnings: booking.fare },
        isAvailable: true,
      });
    }
    const synced = await syncBookingToLifecare(booking);
    if (synced) booking.lifecareSynced = true;
    emitBookingCompleted(booking.bookingId);
  }
  await booking.save();
  return res.json({ success: true, data: booking });
}

export async function acceptBooking(req: Request, res: Response) {
  const driver = await Driver.findById(req.auth!.id);
  if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

  const booking = await Booking.findOne({ bookingId: req.params.id, status: 'searching' });
  if (!booking) return res.status(409).json({ success: false, message: 'Booking unavailable' });

  booking.driverId = driver._id;
  booking.status = 'accepted';
  driver.isAvailable = false;
  await Promise.all([booking.save(), driver.save()]);

  emitBookingAccepted(booking.bookingId, {
    name: driver.name,
    phone: driver.phone,
    vehicleNumber: driver.vehicleNumber,
  });

  return res.json({ success: true, data: booking });
}

export async function verifyOtp(req: Request, res: Response) {
  const { otp } = req.body as { otp: string };
  const booking = await Booking.findOne({ bookingId: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Not found' });
  if (booking.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });
  booking.otpVerified = true;
  booking.status = 'in-transit';
  await booking.save();
  return res.json({ success: true, data: booking });
}

export async function cancelBooking(req: Request, res: Response) {
  const booking = await Booking.findOne({ bookingId: req.params.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Not found' });
  if (['completed', 'cancelled'].includes(booking.status)) {
    return res.status(400).json({ success: false, message: 'Cannot cancel' });
  }
  booking.status = 'cancelled';
  if (booking.driverId) {
    await Driver.findByIdAndUpdate(booking.driverId, { isAvailable: true });
  }
  await booking.save();
  return res.json({ success: true, data: booking });
}

export async function updateDriverLocation(req: Request, res: Response) {
  const { lat, lng } = req.body as { lat: number; lng: number };
  const driver = await Driver.findById(req.auth!.id);
  if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

  driver.currentCoords = { lat, lng };
  await driver.save();

  const active = await Booking.findOne({
    driverId: driver._id,
    status: { $in: ['accepted', 'en-route', 'arrived', 'in-transit'] },
  });

  if (active) {
    const etaMinutes = Math.max(2, Math.round(haversineKm({ lat, lng }, active.pickupLocation.coords) * 3));
    emitDriverLocation(active.bookingId, { lat, lng, etaMinutes });
  }

  return res.json({ success: true });
}

export async function getAvailableDrivers(req: Request, res: Response) {
  const { lat, lng, vehicleType } = req.query;
  const filter: Record<string, unknown> = { isAvailable: true };
  if (vehicleType) filter.vehicleType = vehicleType;

  let drivers = await Driver.find(filter).limit(20);
  if (lat && lng) {
    const origin = { lat: Number(lat), lng: Number(lng) };
    drivers = drivers
      .map((d) => ({
        driver: d,
        dist: d.currentCoords ? haversineKm(origin, d.currentCoords) : 999,
      }))
      .sort((a, b) => a.dist - b.dist)
      .map((x) => x.driver);
  }
  return res.json({ success: true, data: drivers });
}

export async function getPublicStats(_req: Request, res: Response) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [available, bookingsToday] = await Promise.all([
    Driver.countDocuments({ isAvailable: true }),
    Booking.countDocuments({ createdAt: { $gte: startOfDay } }),
  ]);
  return res.json({
    success: true,
    data: {
      ambulancesAvailable: available,
      averageResponseMinutes: 8,
      bookingsToday,
    },
  });
}
