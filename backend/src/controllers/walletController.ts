import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/index.js';
import { Appointment } from '../models/index.js';
import { asyncHandler } from '../middleware/validate.js';
import { sanitizeUser } from '../services/authService.js';
import {
  creditWallet,
  debitWallet,
  computeMonthlySpending,
  enrichTransactions,
} from '../services/walletService.js';
import { stripe, isStripeConfigured } from '../services/stripeService.js';
import { fulfillWalletTopUp } from '../services/paymentHandlers.js';
import { notifyWalletCredited } from '../services/notificationService.js';
import { resolveUserById } from '../services/userResolver.js';
import { config } from '../config/index.js';

export const getWallet = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId).select('wallet');
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const transactions = user.wallet?.transactions || [];
  const monthlySummary = computeMonthlySpending(transactions);

  res.json({
    success: true,
    data: {
      balance: user.wallet?.balance || 0,
      transactions: enrichTransactions(transactions).slice(0, 10),
      monthlySummary,
      stripeEnabled: isStripeConfigured(),
    },
  });
});

export const createWalletTopUpIntent = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.body;

  if (!amount || amount < 100 || amount > 50000) {
    res.status(400).json({ success: false, message: 'Amount must be between ₹100 and ₹50,000' });
    return;
  }

  if (!stripe) {
    res.status(503).json({
      success: false,
      message: 'Stripe is not configured. Set STRIPE_SECRET_KEY to add money with card.',
      code: 'STRIPE_NOT_CONFIGURED',
    });
    return;
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'inr',
    metadata: {
      type: 'wallet_topup',
      userId: req.user!.userId,
    },
    automatic_payment_methods: { enabled: true },
  });

  res.json({
    success: true,
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
    },
  });
});

export const confirmWalletTopUp = asyncHandler(async (req: Request, res: Response) => {
  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    res.status(400).json({ success: false, message: 'paymentIntentId is required' });
    return;
  }

  if (!stripe) {
    if (config.nodeEnv === 'development') {
      res.status(503).json({
        success: false,
        message: 'Stripe not configured. Use demo top-up or set STRIPE_SECRET_KEY.',
      });
      return;
    }
    res.status(503).json({ success: false, message: 'Payment service unavailable' });
    return;
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.metadata?.userId !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Invalid payment' });
    return;
  }

  if (paymentIntent.metadata?.type !== 'wallet_topup') {
    res.status(400).json({ success: false, message: 'Not a wallet top-up payment' });
    return;
  }

  if (paymentIntent.status !== 'succeeded') {
    res.status(400).json({
      success: false,
      message: 'Payment not completed yet',
      status: paymentIntent.status,
    });
    return;
  }

  const amount = paymentIntent.amount / 100;
  const result = await fulfillWalletTopUp(req.user!.userId, amount, paymentIntentId);

  res.json({
    success: true,
    data: {
      balance: result.balance,
      transaction: result.transaction,
      alreadyProcessed: result.transaction === null,
    },
  });
});

/** Dev-only instant top-up when Stripe is off */
export const addMoney = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.body;

  if (!amount || amount < 1) {
    res.status(400).json({ success: false, message: 'Invalid amount' });
    return;
  }

  if (isStripeConfigured()) {
    res.status(400).json({
      success: false,
      message: 'Use Stripe top-up flow. Card payment is required when Stripe is enabled.',
    });
    return;
  }

  if (config.nodeEnv === 'production') {
    res.status(503).json({ success: false, message: 'Configure Stripe for wallet top-ups' });
    return;
  }

  const result = await creditWallet(req.user!.userId, {
    type: 'credit',
    amount,
    description: 'Wallet top-up (demo)',
    category: 'topup',
  });

  await notifyWalletCredited(req.user!.userId, amount, result.balance);

  res.json({
    success: true,
    data: { balance: result.balance, transaction: result.transaction },
  });
});

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  const user = await User.findById(req.user!.userId).select('wallet');
  if (!user?.wallet) {
    res.json({
      success: true,
      data: {
        transactions: [],
        monthlySummary: computeMonthlySpending([]),
        pagination: { page: 1, limit: limitNum, total: 0, pages: 0 },
      },
    });
    return;
  }

  const enriched = enrichTransactions(user.wallet.transactions);
  const total = enriched.length;
  const transactions = enriched.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  const monthlySummary = computeMonthlySpending(user.wallet.transactions);

  res.json({
    success: true,
    data: {
      transactions,
      monthlySummary,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    },
  });
});

export const requestRefund = asyncHandler(async (req: Request, res: Response) => {
  const transactionId = String(req.params.transactionId);

  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    res.status(400).json({ success: false, message: 'Invalid transaction ID' });
    return;
  }

  const user = await User.findById(req.user!.userId);
  if (!user?.wallet) {
    res.status(404).json({ success: false, message: 'Wallet not found' });
    return;
  }

  const tx = user.wallet.transactions.find((t) => t._id?.toString() === transactionId);
  if (!tx) {
    res.status(404).json({ success: false, message: 'Transaction not found' });
    return;
  }

  if (tx.type !== 'debit' || tx.category !== 'appointment') {
    res.status(400).json({
      success: false,
      message: 'Refunds are only available for appointment payments',
    });
    return;
  }

  if (tx.refundStatus && tx.refundStatus !== 'none') {
    res.status(400).json({
      success: false,
      message: `Refund already ${tx.refundStatus}`,
    });
    return;
  }

  if (!tx.appointmentId) {
    res.status(400).json({ success: false, message: 'No linked appointment for this transaction' });
    return;
  }

  const appointment = await Appointment.findById(tx.appointmentId);
  if (!appointment) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  if (appointment.status !== 'cancelled') {
    res.status(400).json({
      success: false,
      message: 'Refund can only be requested for cancelled appointments',
    });
    return;
  }

  if (appointment.payment.status === 'refunded') {
    res.status(400).json({ success: false, message: 'Appointment already refunded' });
    return;
  }

  tx.refundStatus = 'requested';
  await user.save();

  res.json({
    success: true,
    message: 'Refund request submitted. We will credit your wallet within 3–5 business days.',
    data: { refundStatus: 'requested', transactionId },
  });
});

export const payWithWallet = asyncHandler(async (req: Request, res: Response) => {
  const { amount, description } = req.body;

  if (!amount || amount < 1) {
    res.status(400).json({ success: false, message: 'Invalid amount' });
    return;
  }

  const result = await debitWallet(req.user!.userId, {
    type: 'debit',
    amount,
    description: description || 'Payment',
    category: 'other',
  });

  res.json({
    success: true,
    data: { balance: result.balance, paid: amount },
  });
});

export const updateMedicalHistory = asyncHandler(async (req: Request, res: Response) => {
  const existing = await resolveUserById(req.user!.userId);
  if (!existing) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const { dateOfBirth, gender, ...medicalFields } = req.body as {
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
    [key: string]: unknown;
  };

  const existingPlain = existing.toObject() as { medicalHistory?: Record<string, unknown> };
  const updates: Record<string, unknown> = {
    medicalHistory: {
      ...(existingPlain.medicalHistory ?? {}),
      ...medicalFields,
      profileCompleted: !!medicalFields.bloodGroup,
    },
  };

  if (dateOfBirth) {
    updates['profile.dateOfBirth'] = new Date(dateOfBirth);
  }
  if (gender) {
    updates['profile.gender'] = gender;
  }

  const user = await User.findByIdAndUpdate(existing._id, { $set: updates }, { new: true }).select(
    '-password'
  );

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  res.json({ success: true, data: sanitizeUser(user) });
});

export const getMedicalHistory = asyncHandler(async (req: Request, res: Response) => {
  const user = await resolveUserById(req.user!.userId);
  res.json({ success: true, data: user?.medicalHistory || {} });
});
