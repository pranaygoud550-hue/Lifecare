import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

const RATE_LIMIT_JSON = {
  success: false,
  message: 'Too many requests, please try again later',
} as const;

const AUTH_RATE_LIMIT_JSON = {
  success: false,
  message: 'Too many authentication attempts, please try again later',
} as const;

function shouldSkipRateLimit(req?: { originalUrl?: string; path?: string }): boolean {
  if (config.nodeEnv === 'test') return true;
  if (req?.originalUrl?.startsWith(config.stripe.webhookPath)) return true;
  // Demo login is phone-gated; skip strict auth limiter so recruiters can try all roles.
  if (process.env.ALLOW_DEMO_LOGIN === 'true' && req?.path === '/demo-login') return true;
  return false;
}

/** 100 requests per 15 minutes for all /api routes */
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => shouldSkipRateLimit(req),
  handler: (_req, res) => {
    res.status(429).json(RATE_LIMIT_JSON);
  },
});

/** 10 requests per 15 minutes for /api/auth routes */
export const authRouteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => shouldSkipRateLimit(req),
  handler: (_req, res) => {
    res.status(429).json(AUTH_RATE_LIMIT_JSON);
  },
});
