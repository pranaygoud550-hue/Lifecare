import { Request, Response } from 'express';
import Stripe from 'stripe';
import { config } from '../config/index.js';
import { Appointment, Order, AmbulanceRequest } from '../models/index.js';
import { asyncHandler } from '../middleware/validate.js';
import { Coupon } from '../models/Coupon.js';
import { stripe, isStripeConfigured } from '../services/stripeService.js';
import {
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  fulfillAppointmentPayment,
} from '../services/paymentHandlers.js';

export const createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
  const { amount, currency = 'inr', metadata } = req.body;

  if (!stripe) {
    res.status(503).json({
      success: false,
      message: 'Payment service not configured. Set STRIPE_SECRET_KEY in environment.',
      code: 'STRIPE_NOT_CONFIGURED',
    });
    return;
  }

  if (!amount || amount < 1) {
    res.status(400).json({ success: false, message: 'Invalid amount' });
    return;
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata: {
      userId: req.user!.userId,
      ...metadata,
    },
    automatic_payment_methods: { enabled: true },
  });

  res.json({
    success: true,
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    },
  });
});

export const createAppointmentPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
  const appointmentId = String(req.params.id);

  if (!stripe) {
    res.status(503).json({
      success: false,
      message: 'Stripe is not configured',
      code: 'STRIPE_NOT_CONFIGURED',
    });
    return;
  }

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  if (appointment.patientId.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  if (appointment.payment.status === 'paid') {
    res.status(400).json({ success: false, message: 'Appointment already paid' });
    return;
  }

  const amount = appointment.payment.amount;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'inr',
    metadata: {
      type: 'appointment',
      userId: req.user!.userId,
      referenceId: appointmentId,
      appointmentCode: appointment.appointmentId,
    },
    automatic_payment_methods: { enabled: true },
  });

  appointment.payment.status = 'processing';
  appointment.payment.paymentIntentId = paymentIntent.id;
  appointment.payment.method = 'card';
  await appointment.save();

  res.json({
    success: true,
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
    },
  });
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const { paymentIntentId, type, referenceId } = req.body;

  if (!stripe) {
    res.status(503).json({ success: false, message: 'Payment service not configured' });
    return;
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.metadata?.userId !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Invalid payment' });
    return;
  }

  if (paymentIntent.status !== 'succeeded') {
    res.status(400).json({
      success: false,
      message: 'Payment not completed',
      status: paymentIntent.status,
    });
    return;
  }

  if (type === 'appointment' && referenceId) {
    await fulfillAppointmentPayment(referenceId, paymentIntentId, paymentIntent.amount);
  } else if (type === 'order') {
    await Order.findByIdAndUpdate(referenceId, {
      'payment.status': 'paid',
      'payment.transactionId': paymentIntentId,
      'payment.timestamp': new Date(),
      'delivery.currentStatus': 'confirmed',
    });
  } else if (type === 'ambulance') {
    await AmbulanceRequest.findByIdAndUpdate(referenceId, {
      'payment.status': 'paid',
      'payment.transactionId': paymentIntentId,
      'payment.timestamp': new Date(),
    });
  }

  res.json({ success: true, message: 'Payment verified successfully' });
});

export const stripeWebhook = async (req: Request, res: Response) => {
  if (!stripe || !config.stripe.webhookSecret) {
    res.status(503).send('Webhook not configured');
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    res.status(400).send('Missing stripe-signature');
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      config.stripe.webhookSecret
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature failed';
    console.error('Stripe webhook error:', message);
    res.status(400).send(`Webhook Error: ${message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(pi);
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(pi);
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

export const applyCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { code, orderAmount, applicableOn = 'all' } = req.body;

  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
    isActive: true,
    validFrom: { $lte: new Date() },
    validTill: { $gte: new Date() },
  });

  if (!coupon) {
    res.status(404).json({ success: false, message: 'Invalid or expired coupon' });
    return;
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
    return;
  }

  if (coupon.minOrderValue && orderAmount < coupon.minOrderValue) {
    res.status(400).json({
      success: false,
      message: `Minimum order value of ₹${coupon.minOrderValue} required`,
    });
    return;
  }

  if (coupon.applicableOn !== 'all' && coupon.applicableOn !== applicableOn) {
    res.status(400).json({ success: false, message: 'Coupon not applicable for this service' });
    return;
  }

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = (orderAmount * coupon.discountValue) / 100;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = coupon.discountValue;
  }

  res.json({
    success: true,
    data: {
      coupon: { code: coupon.code, description: coupon.description },
      discount: Math.round(discount * 100) / 100,
      finalAmount: Math.max(0, orderAmount - discount),
    },
  });
});

export const getPaymentConfig = asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { stripeEnabled: isStripeConfigured() },
  });
});
