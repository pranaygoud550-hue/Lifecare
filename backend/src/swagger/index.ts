import { config } from '../config/index.js';
import { schemas } from './schemas.js';
import { authPaths } from './paths/auth.js';
import { appointmentPaths } from './paths/appointments.js';
import { emergencyPaths } from './paths/emergency.js';
import { pharmacyPaths } from './paths/pharmacy.js';
import { paymentPaths } from './paths/payments.js';
import { hospitalPaths } from './paths/hospitals.js';
import { navigationPaths } from './paths/navigation.js';
import { reminderPaths } from './paths/reminders.js';
import { doctorExtraPaths } from './paths/doctors.js';

export function buildOpenApiSpec() {
  const localUrl = `http://localhost:${config.port}`;
  const servers = [{ url: config.backendUrl, description: 'Current server' }];
  if (!servers.some((s) => s.url === localUrl)) {
    servers.push({ url: localUrl, description: 'Local development' });
  }

  return {
    openapi: '3.0.0',
    info: {
      title: 'LifeCare+ Healthcare Platform API',
      version: '1.0.0',
      description: [
        'REST API for the LifeCare+ healthcare platform.',
        '',
        '### Authentication',
        '1. Call `POST /api/auth/login` or `POST /api/auth/demo-login`',
        '2. Copy `data.accessToken` from the response',
        '3. Click **Authorize** and enter: `Bearer <accessToken>`',
        '4. Use **Try it out** on any protected endpoint',
        '',
        '### Demo credentials',
        '| Role | Email | Password |',
        '|------|-------|----------|',
        '| Patient | patient@demo.com | Password@123 |',
        '| Admin | admin@lifecare.com | Password@123 |',
        '| Doctor | dr.kavitha@lifecare.com | Password@123 |',
        '| Ambulance | ambulance@lifecare.com | Password@123 |',
      ].join('\n'),
      contact: { name: 'LifeCare+ API Support' },
    },
    servers,
    tags: [
      { name: 'Auth', description: 'Registration, login, and profile' },
      { name: 'Appointments', description: 'Consultation booking and video calls' },
      { name: 'Emergency', description: 'SOS dispatch and ambulance tracking' },
      { name: 'Pharmacy', description: 'Medicine catalog and orders' },
      { name: 'Payments', description: 'Stripe payments and coupons' },
      { name: 'Hospitals', description: 'Google Places hospital discovery' },
      { name: 'Navigation', description: 'Google Directions ambulance routing' },
      { name: 'Reminders', description: 'Medicine reminder schedules' },
      { name: 'Doctors', description: 'Doctor schedule and patient vitals' },
    ],
    paths: {
      ...authPaths,
      ...appointmentPaths,
      ...emergencyPaths,
      ...pharmacyPaths,
      ...paymentPaths,
      ...hospitalPaths,
      ...navigationPaths,
      ...reminderPaths,
      ...doctorExtraPaths,
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT from login response (`data.accessToken`)',
        },
      },
      schemas,
    },
  };
}

export const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    docExpansion: 'list',
  },
  customSiteTitle: 'LifeCare+ API Docs',
};
