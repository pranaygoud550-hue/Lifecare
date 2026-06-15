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
  return false;
}

function authUrl(req?: { originalUrl?: string; path?: string }): string {
  return req?.originalUrl ?? req?.path ?? '';
}

/** Auth limiter targets credential endpoints only — not profile reads or demo role switching. */
function shouldSkipAuthRateLimit(req?: { originalUrl?: string; path?: string; method?: string }): boolean {
  if (config.nodeEnv === 'test') return true;
  const url = authUrl(req);

  // Phone-gated demo accounts — exempt so recruiters can try all 5 roles in one session.
  if (url.includes('demo-login')) return true;

  // Authenticated session routes are not brute-force targets.
  if (req?.method === 'GET' && url.includes('/api/auth/')) return true;
  if (url.includes('/api/auth/profile')) return true;
  if (url.includes('/api/auth/logout')) return true;
  if (url.includes('/api/auth/rapidcare-token')) return true;
  if (url.includes('/api/auth/patient-summary')) return true;
  if (url.includes('/api/auth/refresh-token')) return true;

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

/** 10 requests per 15 minutes for credential /api/auth POST routes */
export const authRouteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => shouldSkipAuthRateLimit(req),
  handler: (_req, res) => {
    res.status(429).json(AUTH_RATE_LIMIT_JSON);
  },
});
