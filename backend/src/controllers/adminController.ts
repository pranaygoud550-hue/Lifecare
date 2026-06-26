import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User, Appointment, Order, AmbulanceRequest, Review } from '../models/index.js';
import { asyncHandler } from '../middleware/validate.js';
import { MEDICAL_SPECIALTIES } from '../utils/helpers.js';
import {
  buildDailyRevenueLast30Days,
  buildDailyWalletTopupsLast30Days,
  buildAppointmentsBySpecialization,
  buildRecentActivity,
  sumWalletTopupsBetween,
  startOfWeekMonday,
} from '../utils/adminAnalytics.js';
import { isDatabaseConnected, usingInMemoryDatabase, ensureDatabaseConnection } from '../config/database.js';
import { getSocketConnectionCount } from '../services/socketService.js';
import { getAverageResponseTimeMs } from '../middleware/requestMetrics.js';
import { updateDoctorRating } from './reviewController.js';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
  const today = startOfToday();
  const weekStart = startOfWeekMonday();
  const monthStart = startOfMonth();
  const now = new Date();

  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'][
    mongoose.connection.readyState
  ] || 'unknown';

  const [
    totalPatients,
    totalDoctors,
    activeDoctors,
    totalPharmacies,
    totalAppointments,
    todayAppointments,
    weekAppointments,
    totalOrders,
    totalAmbulanceRequests,
    pendingDoctorVerifications,
    pendingPharmacyVerifications,
    dailyWalletTopups,
    dailyRevenue,
    appointmentsBySpecialization,
    walletTopupsThisMonth,
    recentActivity,
  ] = await Promise.all([
    User.countDocuments({ userType: 'patient' }),
    User.countDocuments({ userType: 'doctor' }),
    User.countDocuments({ userType: 'doctor', 'doctorDetails.verified': true, isActive: true }),
    User.countDocuments({ userType: 'pharmacy' }),
    Appointment.countDocuments(),
    Appointment.countDocuments({ createdAt: { $gte: today } }),
    Appointment.countDocuments({ createdAt: { $gte: weekStart } }),
    Order.countDocuments(),
    AmbulanceRequest.countDocuments(),
    User.countDocuments({
      userType: 'doctor',
      $or: [
        { 'doctorDetails.verificationStatus': 'pending' },
        {
          'doctorDetails.verificationStatus': { $in: ['none', null] },
          'doctorDetails.verified': false,
          'doctorDetails.verificationDocuments.submittedAt': { $exists: true },
        },
      ],
    }),
    User.countDocuments({ userType: 'pharmacy', 'pharmacyDetails.verified': false }),
    buildDailyWalletTopupsLast30Days(),
    buildDailyRevenueLast30Days(),
    buildAppointmentsBySpecialization(),
    sumWalletTopupsBetween(monthStart, now),
    buildRecentActivity(10),
  ]);

  const totalUsers = totalPatients + totalDoctors;

  res.json({
    success: true,
    data: {
      kpis: {
        totalUsers,
        totalPatients,
        totalDoctors,
        activeDoctors,
        todayAppointments,
        weekAppointments,
        revenueThisMonth: walletTopupsThisMonth,
        pendingVerifications: pendingDoctorVerifications + pendingPharmacyVerifications,
        pendingDoctorVerifications,
      },
      users: { patients: totalPatients, doctors: totalDoctors, pharmacies: totalPharmacies },
      services: {
        appointments: totalAppointments,
        orders: totalOrders,
        ambulanceRequests: totalAmbulanceRequests,
      },
      pendingVerifications: pendingDoctorVerifications + pendingPharmacyVerifications,
      recentActivity,
      platformHealth: {
        apiResponseTimeMs: getAverageResponseTimeMs(),
        database: {
          status: isDatabaseConnected ? 'connected' : 'disconnected',
          state: dbState,
          inMemory: usingInMemoryDatabase,
          name: mongoose.connection.name || null,
        },
        socketConnections: getSocketConnectionCount(),
        timestamp: new Date().toISOString(),
      },
      charts: {
        dailyWalletTopups,
        dailyRevenue,
        appointmentsBySpecialization,
      },
    },
  });
});

export const getPlatformHealth = asyncHandler(async (_req: Request, res: Response) => {
  if (!isDatabaseConnected && process.env.USE_MEMORY_DB !== 'true') {
    await ensureDatabaseConnection();
  }

  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'][
    mongoose.connection.readyState
  ] || 'unknown';

  res.json({
    success: true,
    data: {
      apiResponseTimeMs: getAverageResponseTimeMs(),
      database: {
        status: isDatabaseConnected ? 'connected' : 'disconnected',
        state: dbState,
        inMemory: usingInMemoryDatabase,
        name: mongoose.connection.name || null,
      },
      socketConnections: getSocketConnectionCount(),
      timestamp: new Date().toISOString(),
    },
  });
});

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const { userType, page = '1', limit = '20' } = req.query;
  const filter: Record<string, unknown> = {};
  if (userType) filter.userType = userType;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { users, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
});

export const verifyUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  if (user.userType === 'doctor') {
    const { approveDoctorById } = await import('../services/doctorVerificationService.js');
    const approved = await approveDoctorById(String(req.params.id), req.user!.userId);
    res.json({ success: true, data: approved });
    return;
  }

  if (user.userType === 'pharmacy' && user.pharmacyDetails) {
    user.pharmacyDetails.verified = true;
    await user.save();
    res.json({ success: true, data: user });
    return;
  }

  res.status(400).json({ success: false, message: 'User type cannot be verified' });
});

export const blockUser = asyncHandler(async (req: Request, res: Response) => {
  const { isBlocked } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { isBlocked }, { new: true }).select(
    '-password'
  );
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.json({ success: true, data: user });
});

export const getSpecialties = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: MEDICAL_SPECIALTIES });
});

export const getPlatformStats = asyncHandler(async (_req: Request, res: Response) => {
  const [doctors, appointments, patients] = await Promise.all([
    User.countDocuments({ userType: 'doctor', 'doctorDetails.verified': true }),
    Appointment.countDocuments({ status: 'completed' }),
    User.countDocuments({ userType: 'patient' }),
  ]);

  res.json({
    success: true,
    data: {
      activeDoctors: doctors,
      completedAppointments: appointments,
      happyPatients: patients,
      livesSaved: Math.floor(appointments * 0.3),
    },
  });
});

export const getRevenueReport = asyncHandler(async (_req: Request, res: Response) => {
  const [paidAppointments, paidOrders, ambulanceRequests] = await Promise.all([
    Appointment.find({ 'payment.status': 'paid' }).select('payment.amount createdAt consultationType'),
    Order.find({ 'payment.status': 'paid' }).select('pricing.total createdAt'),
    AmbulanceRequest.find({ 'payment.status': 'paid' }).select('charges.total createdAt'),
  ]);

  const consultationRevenue = paidAppointments.reduce((sum, a) => sum + (a.payment.amount || 0), 0);
  const pharmacyRevenue = paidOrders.reduce((sum, o) => sum + (o.pricing.total || 0), 0);
  const ambulanceRevenue = ambulanceRequests.reduce((sum, r) => sum + (r.charges?.total || 0), 0);

  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const recentAppointments = await Appointment.countDocuments({ createdAt: { $gte: last30Days } });
  const recentOrders = await Order.countDocuments({ createdAt: { $gte: last30Days } });
  const recentUsers = await User.countDocuments({ createdAt: { $gte: last30Days } });

  res.json({
    success: true,
    data: {
      revenue: {
        consultation: consultationRevenue,
        pharmacy: pharmacyRevenue,
        ambulance: ambulanceRevenue,
        total: consultationRevenue + pharmacyRevenue + ambulanceRevenue,
      },
      trends: {
        appointmentsLast30Days: recentAppointments,
        ordersLast30Days: recentOrders,
        newUsersLast30Days: recentUsers,
      },
      topDoctors: await User.find({ userType: 'doctor', 'doctorDetails.verified': true })
        .sort({ 'doctorDetails.rating': -1 })
        .limit(5)
        .select('profile doctorDetails.rating doctorDetails.reviewCount doctorDetails.specializations'),
    },
  });
});

export const getAllAppointments = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate('doctorId', 'profile doctorDetails')
      .populate('patientId', 'profile')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Appointment.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { appointments, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
  });
});

export const getPendingReviews = asyncHandler(async (_req: Request, res: Response) => {
  const reviews = await Review.find({ status: 'pending' })
    .populate('reviewedBy', 'profile.firstName profile.lastName profile.profilePhoto')
    .populate('reviewFor', 'profile.firstName profile.lastName userType')
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ success: true, data: reviews });
});

export const moderateReview = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404).json({ success: false, message: 'Review not found' });
    return;
  }

  review.status = status;
  await review.save();

  if (review.reviewType === 'doctor' && status === 'approved') {
    await updateDoctorRating(review.reviewFor.toString());
  }

  res.json({ success: true, data: review });
});
