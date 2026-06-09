import Stripe from 'stripe';
import { Appointment, User } from '../models/index.js';
import { creditWallet } from './walletService.js';
import { notifyWalletCredited } from './notificationService.js';
import { sendAppointmentConfirmationEmail } from './emailService.js';

export async function fulfillWalletTopUp(
  userId: string,
  amount: number,
  paymentIntentId: string
) {
  const result = await creditWallet(userId, {
    type: 'credit',
    amount,
    description: 'Wallet top-up via Stripe',
    category: 'topup',
    paymentIntentId,
  });

  if (result.transaction !== null) {
    await notifyWalletCredited(userId, amount, result.balance);
  }

  return result;
}

export async function fulfillAppointmentPayment(
  appointmentId: string,
  paymentIntentId: string,
  amountPaidPaise?: number
) {
  const appointment = await Appointment.findById(appointmentId)
    .populate('doctorId', 'profile')
    .populate('patientId', 'profile email');

  if (!appointment) {
    throw Object.assign(new Error('Appointment not found'), { statusCode: 404 });
  }

  if (appointment.payment.status === 'paid') {
    return appointment;
  }

  if (
    amountPaidPaise != null &&
    Math.round(appointment.payment.amount * 100) !== amountPaidPaise
  ) {
    throw Object.assign(new Error('Payment amount mismatch'), { statusCode: 400 });
  }

  appointment.payment.status = 'paid';
  appointment.payment.method = 'card';
  appointment.payment.transactionId = paymentIntentId;
  appointment.payment.paymentIntentId = paymentIntentId;
  appointment.payment.timestamp = new Date();
  appointment.payment.failureReason = undefined;
  appointment.status = 'confirmed';
  await appointment.save();

  const patient = appointment.patientId as typeof User.prototype & {
    profile?: { firstName?: string; lastName?: string };
    email?: string;
  };
  const doctor = appointment.doctorId as typeof User.prototype & {
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
      paymentMethod: 'Card (Stripe)',
    });
  }

  return appointment;
}

export async function markAppointmentPaymentFailed(
  appointmentId: string,
  paymentIntentId: string,
  reason?: string
) {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment || appointment.payment.status === 'paid') return null;

  appointment.payment.status = 'failed';
  appointment.payment.paymentIntentId = paymentIntentId;
  appointment.payment.failureReason = reason || 'Payment failed';
  await appointment.save();
  return appointment;
}

export async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { type, userId, referenceId } = paymentIntent.metadata || {};
  const amount = paymentIntent.amount / 100;

  if (type === 'wallet_topup' && userId) {
    await fulfillWalletTopUp(userId, amount, paymentIntent.id);
    return { handled: true, kind: 'wallet_topup' };
  }

  if (type === 'appointment' && referenceId) {
    await fulfillAppointmentPayment(referenceId, paymentIntent.id, paymentIntent.amount);
    return { handled: true, kind: 'appointment' };
  }

  return { handled: false };
}

export async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { type, referenceId } = paymentIntent.metadata || {};

  if (type === 'appointment' && referenceId) {
    await markAppointmentPaymentFailed(
      referenceId,
      paymentIntent.id,
      paymentIntent.last_payment_error?.message
    );
    return { handled: true };
  }

  return { handled: false };
}
