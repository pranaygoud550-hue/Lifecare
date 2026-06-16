import express, { type Express, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import mongoose from 'mongoose';

import { isDatabaseConnected, usingInMemoryDatabase } from './config/database.js';
import { isAllowedFrontendOrigin } from './config/corsOrigins.js';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { stripeWebhook } from './controllers/paymentController.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestTimingMiddleware } from './middleware/requestMetrics.js';
import { globalApiLimiter, authRouteLimiter } from './middleware/rateLimit.js';
import { mongoSanitizeExceptWebhook } from './middleware/mongoSanitize.js';
import { buildOpenApiSpec, swaggerUiOptions } from './swagger/index.js';

export function createApp(): Express {
  const app = express();
  const swaggerSpec = buildOpenApiSpec();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedFrontendOrigin(origin)) {
          callback(null, origin ?? true);
          return;
        }
        console.warn(`CORS blocked origin: ${origin ?? '(missing)'}`);
        callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Stripe webhook — raw body, no rate limit, before JSON parser
  app.post(
    config.stripe.webhookPath,
    express.raw({ type: 'application/json' }),
    (req: Request, res: Response) => stripeWebhook(req, res)
  );

  app.get('/api/docs.json', (_req, res) => {
    res.json(swaggerSpec);
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerUiOptions)
  );
  app.get('/api-docs', (_req, res) => {
    res.redirect(301, '/api/docs');
  });

  if (config.nodeEnv !== 'test') {
    app.use('/api/auth', authRouteLimiter);
    app.use('/api', globalApiLimiter);
  }

  app.use(requestTimingMiddleware);

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(mongoSanitizeExceptWebhook);

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  app.get('/health', (_req, res) => {
    const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'][
      mongoose.connection.readyState
    ] || 'unknown';
    const demoMode = process.env.ALLOW_DEMO_LOGIN === 'true';
    res.json({
      status: isDatabaseConnected ? 'ok' : 'degraded',
      environment: config.nodeEnv,
      demoMode,
      database: {
        connected: isDatabaseConnected,
        inMemory: usingInMemoryDatabase,
        state: dbState,
        name: mongoose.connection.name || null,
        host: mongoose.connection.host || null,
      },
      integrations: {
        googlePlaces: !!config.google.placesApiKey,
        twilioSms: !!(
          config.twilio.accountSid &&
          config.twilio.authToken &&
          config.twilio.phoneNumber
        ),
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
