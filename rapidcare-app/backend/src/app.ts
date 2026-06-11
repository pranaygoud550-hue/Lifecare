import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import bookingRoutes from './routes/bookingRoutes.js';
import driverRoutes from './routes/driverRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import placesRoutes from './routes/placesRoutes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'rapidcare-api' }));
app.use('/api/bookings', bookingRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/places', placesRoutes);

export default app;
