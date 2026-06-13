import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getFrontendOrigins, normalizeOrigin } from './corsOrigins.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const port = parseInt(process.env.PORT || '5001', 10);
const nodeEnv = process.env.NODE_ENV || 'development';
const frontendUrls = getFrontendOrigins();
const backendUrl =
  process.env.BACKEND_URL?.trim().replace(/\/+$/, '') ||
  `http://127.0.0.1:${port}`;

export const config = {
  port,
  nodeEnv,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lifecare-plus',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  frontendUrl:
    frontendUrls[0] ||
    (process.env.FRONTEND_URL ? normalizeOrigin(process.env.FRONTEND_URL) : 'http://localhost:5173'),
  frontendUrls,
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    webhookPath: '/api/payments/webhook',
    webhookUrl: `${backendUrl}/api/payments/webhook`,
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  /** Base URL for locally stored files (MediScan fetch, etc.) */
  backendUrl,
  mediscan: {
    apiUrl: process.env.MEDISCAN_API_URL || 'https://mediscan-api.onrender.com',
    /** Try remote MediScan API first; fall back to integrated on-site screening when unavailable */
    useLocalFallback: process.env.MEDISCAN_USE_LOCAL_FALLBACK !== 'false',
  },
  google: {
    placesApiKey: process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || '',
    placesCacheTtlSeconds: 600,
    directionsCacheTtlSeconds: 120,
  },
};
