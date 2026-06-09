import Stripe from 'stripe';
import { config } from '../config/index.js';

export const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null;

export const isStripeConfigured = () => !!stripe;
