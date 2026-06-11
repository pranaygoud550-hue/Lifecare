import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT || 5002),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27018/rapidcare',
  jwtSecret: process.env.JWT_SECRET || 'rapidcare-dev-secret',
  googleMapsKey: process.env.GOOGLE_MAPS_API_KEY || '',
  stripeSecret: process.env.STRIPE_SECRET_KEY || '',
  resendKey: process.env.RESEND_API_KEY || '',
  resendFrom: process.env.RESEND_FROM_EMAIL || 'RapidCare <bookings@rapidcare.app>',
  lifecareApiUrl: process.env.LIFECARE_API_URL || 'https://lifecare-l42k.onrender.com',
  lifecareWebhookSecret: process.env.LIFECARE_WEBHOOK_SECRET || 'change-me',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map((s) => s.trim()),
};
