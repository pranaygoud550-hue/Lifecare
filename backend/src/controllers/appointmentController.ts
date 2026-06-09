import { Request, Response } from 'express';
import { Appointment, User, ScanReport } from '../models/index.js';
import { asyncHandler } from '../middleware/validate.js';
import { generateAppointmentId } from '../utils/helpers.js';
import {
  notifyAppointmentBooked,
  notifyAppointmentAccepted,
  notifyAppointmentRejected,
} from '../services/notificationService.js';
import { getFileUrl } from '../services/uploadService.js';
import { formatDoctorName } from '../utils/appointmentTime.js';
import { debitWallet } from '../services/walletService.js';
import { stripe } from '../services/stripeService.js';
import {
  fulfillAppointmentPayment,
  markAppointmentPaymentFailed,
} from '../services/paymentHandlers.js';
import { sendAppointmentConfirmationEmail } from '../services/emailService.js';

const APPOINTMENT_POPULATE = [
  { path: 'doctorId', select: 'profile doctorDetails' },
  { path: 'patientId', select: 'profile medicalHistory' },
  {
    path: 'scanReportId',
    select:
      'scanType prediction confidence gradcamUrl imageUrl status doctorNote doctorOverride flags aiAnalyzedAt',
  },
];

export const bookAppointment = asyncHandler(async (req: Request, res: Response) => {
  const {
    doctorId,
    consultationType,
    scheduledDate,
    scheduledTime,
    chiefComplaint,
    patientNotes,
    attachments,
    homeVisitAddress,
    scanReportId,
  } = req.body;

  const doctor = await User.findOne({ _id: doctorId, userType: 'doctor', isActive: true });
  if (!doctor) {
    res.status(404).json({ success: false, message: 'Doctor not found' });
    return;
  }

  const feeKey = consultationType === 'homeVisit' ? 'homeVisit' : consultationType;
  const amount =
    doctor.doctorDetails?.consultationFees?.[
      feeKey as keyof typeof doctor.doctorDetails.consultationFees
    ] || 500;

  if (scanReportId) {
    const scan = await ScanReport.findOne({
      _id: scanReportId,
      patientId: req.user!.userId,
    });
    if (!scan) {
      res.status(400).json({ success: false, message: 'Invalid scan report for this booking' });
      return;
    }
  }

  const existing = await Appointment.findOne({
    doctorId,
    scheduledDate: new Date(scheduledDate),
    scheduledTime,
    status: { $nin: ['cancelled'] },
  });

  if (existing) {
    res.status(409).json({ success: false, message: 'Time slot already booked' });
    return;
  }

  const appointment = await Appointment.create({
    appointmentId: generateAppointmentId(),
    patientId: req.user!.userId,
    doctorId,
    consultationType,
    scheduledDate: new Date(scheduledDate),
    scheduledTime,
    chiefComplaint,
    patientNotes,
    attachments: attachments?.length ? attachments : undefined,
    homeVisitAddress,
    scanReportId: scanReportId || undefined,
    payment: { amount, status: 'pending' },
    status: 'pending',
  });

  if (scanReportId) {
    await ScanReport.findByIdAndUpdate(scanReportId, {
      appointmentId: appointment._id,
      doctorId: appointment.doctorId,
    });
  }

  await notifyAppointmentBooked(req.user!.userId, doctorId, {
    _id: appointment._id,
    appointmentId: appointment.appointmentId,
    scheduledDate: appointment.scheduledDate,
    scheduledTime: appointment.scheduledTime,
    consultationType: appointment.consultationType,
  });

  const populated = await Appointment.findById(appointment._id).populate(APPOINTMENT_POPULATE);

  res.status(201).json({ success: true, data: populated });
});

export const uploadBookingReports = asyncHandler(async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[] | undefined)?.map((f) => ({
    fileName: f.originalname,
    fileUrl: getFileUrl(f.filename),
    fileType: f.mimetype,
  })) || [];

  res.json({ success: true, data: { files } });
});

export const confirmAppointmentPayment = asyncHandler(async (req: Request, res: Response) => {
  const { method, paymentIntentId } = req.body;

  const appointment = await Appointment.findById(req.params.id)
    .populate('doctorId', 'profile doctorDetails')
    .populate('patientId', 'profile email');

  if (!appointment) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  if (appointment.patientId._id?.toString() !== req.user!.userId && appointment.patientId.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  if (appointment.payment.status === 'paid') {
    res.json({ success: true, data: appointment });
    return;
  }

  const amount = appointment.payment.amount;
  const appointmentId = appointment._id.toString();

  if (method === 'wallet') {
    await debitWallet(req.user!.userId, {
      type: 'debit',
      amount,
      description: `Appointment ${appointment.appointmentId}`,
      category: 'appointment',
      appointmentId,
    });

    appointment.payment.status = 'paid';
    appointment.payment.method = 'wallet';
    appointment.payment.transactionId = `wallet-${Date.now()}`;
    appointment.payment.timestamp = new Date();
    appointment.status = 'confirmed';
    await appointment.save();

    await sendConfirmationNotifications(appointment);
  } else if (method === 'clinic') {
    appointment.payment.method = 'clinic';
    appointment.payment.status = 'pending';
    appointment.status = 'confirmed';
    await appointment.save();
    await sendConfirmationNotifications(appointment, 'Pay at clinic');
  } else if (method === 'card') {
    if (!paymentIntentId) {
      res.status(400).json({ success: false, message: 'paymentIntentId is required for card payments' });
      return;
    }

    if (!stripe) {
      res.status(503).json({
        success: false,
        message: 'Card payments require Stripe. Configure STRIPE_SECRET_KEY or choose another method.',
        code: 'STRIPE_NOT_CONFIGURED',
      });
      return;
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.metadata?.userId !== req.user!.userId) {
      res.status(403).json({ success: false, message: 'Invalid payment' });
      return;
    }

    if (paymentIntent.status === 'succeeded') {
      await fulfillAppointmentPayment(appointmentId, paymentIntentId, paymentIntent.amount);
      const updated = await Appointment.findById(appointment._id)
        .populate('doctorId', 'profile doctorDetails')
        .populate('patientId', 'profile');
      res.json({ success: true, data: updated });
      return;
    }

    if (paymentIntent.status === 'requires_payment_method' || paymentIntent.status === 'canceled') {
      await markAppointmentPaymentFailed(
        appointmentId,
        paymentIntentId,
        paymentIntent.last_payment_error?.message || 'Payment failed'
      );
      res.status(400).json({
        success: false,
        message: paymentIntent.last_payment_error?.message || 'Payment failed. Please try again.',
        status: paymentIntent.status,
        canRetry: true,
      });
      return;
    }

    appointment.payment.status = 'processing';
    appointment.payment.paymentIntentId = paymentIntentId;
    await appointment.save();

    res.status(202).json({
      success: false,
      message: 'Payment is still processing. Please wait a moment and refresh.',
      status: paymentIntent.status,
    });
    return;
  }

  const populated = await Appointment.findById(appointment._id)
    .populate('doctorId', 'profile doctorDetails')
    .populate('patientId', 'profile');

  res.json({ success: true, data: populated });
});

async function sendConfirmationNotifications(
  appointment: typeof Appointment.prototype,
  paymentLabel = 'Health Wallet'
) {
  const patient = appointment.patientId as {
    email?: string;
    profile?: { firstName?: string; lastName?: string };
  };
  const doctor = appointment.doctorId as {
    profile?: { firstName?: string; lastName?: string };
  };

  if (patient?.email) {
    await sendAppointmentConfirmationEmail({
      to: patient.email,
      patientName: `${patient.profile?.firstName || ''} ${patient.profile?.lastName || ''}`.trim() || 'Patient',
      doctorName: `Dr. ${doctor?.profile?.firstName || ''} ${doctor?.profile?.lastName || ''}`.trim(),
      appointmentId: appointment.appointmentId,
      scheduledDate: new Date(appointment.scheduledDate).toLocaleDateString('en-IN'),
      scheduledTime: appointment.scheduledTime,
      consultationType: appointment.consultationType,
      amount: appointment.payment.amount,
      paymentMethod: paymentLabel,
    });
  }
}

export const getAppointments = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = '1', limit = '10' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  const filter: Record<string, unknown> = {};
  if (req.user!.userType === 'doctor') {
    filter.doctorId = req.user!.userId;
  } else {
    filter.patientId = req.user!.userId;
  }
  if (status) filter.status = status;

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate(APPOINTMENT_POPULATE)
      .sort({ scheduledDate: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Appointment.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      appointments,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    },
  });
});

export const getAppointmentById = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await Appointment.findById(req.params.id).populate(APPOINTMENT_POPULATE);

  if (!appointment) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  const isAuthorized =
    appointment.patientId._id.toString() === req.user!.userId ||
    appointment.doctorId._id.toString() === req.user!.userId ||
    req.user!.userType === 'admin';

  if (!isAuthorized) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  res.json({ success: true, data: appointment });
});

export const acceptAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await Appointment.findById(req.params.id).populate('doctorId', 'profile');
  if (!appointment) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  if (appointment.doctorId._id?.toString() !== req.user!.userId && appointment.doctorId.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Only the assigned doctor can accept' });
    return;
  }

  if (appointment.doctorResponse === 'rejected') {
    res.status(400).json({ success: false, message: 'Appointment was already declined' });
    return;
  }

  appointment.doctorResponse = 'accepted';
  appointment.doctorResponseAt = new Date();
  if (appointment.status === 'pending') appointment.status = 'confirmed';
  await appointment.save();

  const doctor = appointment.doctorId as { profile?: { firstName?: string; lastName?: string } };
  await notifyAppointmentAccepted(
    appointment.patientId.toString(),
    appointment._id.toString(),
    formatDoctorName(doctor.profile)
  );

  const populated = await Appointment.findById(appointment._id)
    .populate('doctorId', 'profile doctorDetails')
    .populate('patientId', 'profile');

  res.json({ success: true, data: populated });
});

export const rejectAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body;
  const appointment = await Appointment.findById(req.params.id).populate('doctorId', 'profile');
  if (!appointment) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  if (appointment.doctorId._id?.toString() !== req.user!.userId && appointment.doctorId.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Only the assigned doctor can decline' });
    return;
  }

  appointment.doctorResponse = 'rejected';
  appointment.doctorResponseAt = new Date();
  appointment.status = 'cancelled';
  const rejectionReason = reason || 'Doctor unavailable';
  appointment.doctorRejectionReason = rejectionReason;
  appointment.cancellation = {
    cancelledBy: 'doctor',
    reason: rejectionReason,
    timestamp: new Date(),
  };
  await appointment.save();

  const doctor = appointment.doctorId as { profile?: { firstName?: string; lastName?: string } };
  await notifyAppointmentRejected(
    appointment.patientId.toString(),
    appointment._id.toString(),
    formatDoctorName(doctor.profile),
    appointment.doctorRejectionReason
  );

  const populated = await Appointment.findById(appointment._id)
    .populate('doctorId', 'profile doctorDetails')
    .populate('patientId', 'profile');

  res.json({ success: true, data: populated });
});

export const cancelAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  if (appointment.patientId.toString() !== req.user!.userId && req.user!.userType !== 'admin') {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  appointment.status = 'cancelled';
  appointment.cancellation = {
    cancelledBy: req.user!.userType,
    reason: req.body.reason || 'Cancelled by user',
    timestamp: new Date(),
  };
  await appointment.save();

  res.json({ success: true, data: appointment });
});

export const joinConsultation = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  const userId = req.user!.userId;
  const isPatient = appointment.patientId.toString() === userId;
  const isDoctor = appointment.doctorId.toString() === userId;
  if (!isPatient && !isDoctor && req.user!.userType !== 'admin') {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  if (!['video', 'audio', 'chat'].includes(appointment.consultationType)) {
    res.status(400).json({ success: false, message: 'This appointment is not a teleconsultation' });
    return;
  }

  if (!['confirmed', 'in-progress'].includes(appointment.status)) {
    res.status(400).json({ success: false, message: 'Consultation is not ready to join yet' });
    return;
  }

  if (appointment.payment.status !== 'paid' && appointment.payment.method !== 'clinic') {
    res.status(402).json({ success: false, message: 'Complete payment before joining the consultation' });
    return;
  }

  const roomId = appointment.videoCallDetails?.roomId || `room-${appointment.appointmentId}`;
  if (appointment.status !== 'in-progress') {
    appointment.status = 'in-progress';
    appointment.videoCallDetails = {
      roomId,
      startTime: appointment.videoCallDetails?.startTime ?? new Date(),
    };
    await appointment.save();
  }

  res.json({
    success: true,
    data: {
      roomId,
      appointmentId: appointment.appointmentId,
      consultationType: appointment.consultationType,
    },
  });
});

export const completeAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  if (appointment.doctorId.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Only doctor can complete appointment' });
    return;
  }

  appointment.status = 'completed';
  if (appointment.videoCallDetails) {
    appointment.videoCallDetails.endTime = new Date();
  }
  await appointment.save();

  res.json({ success: true, data: appointment });
});
