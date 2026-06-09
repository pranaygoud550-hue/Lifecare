import { createServer } from 'http';
import dotenv from 'dotenv';

import connectDB, { isDatabaseConnected } from './config/database.js';
import { logCorsConfig } from './config/corsOrigins.js';
import { config } from './config/index.js';
import { createApp } from './app.js';
import { initializeSocket } from './services/socketService.js';
import { startCronJobs } from './services/cronService.js';

dotenv.config();

const app = createApp();
const httpServer = createServer(app);

initializeSocket(httpServer);

const autoSeedIfEmpty = async () => {
  try {
    const { User } = await import('./models/index.js');
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('📋 Empty database — loading demo data...');
      const { runSeed } = await import('./utils/seed.js');
      await runSeed();
    }
  } catch (err) {
    console.warn('Auto-seed skipped:', err instanceof Error ? err.message : err);
  }
};

const startServer = async () => {
  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nPort ${config.port} is already in use.`);
      console.error('Run from project root:  npm run kill-api-port');
      console.error('Then start again:       npm run dev\n');
    } else {
      console.error('Server error:', err.message);
    }
    process.exit(1);
  });

  httpServer.listen(config.port, () => {
    console.log(`LifeCare+ API running on ${config.backendUrl}`);
    console.log(`API docs: ${config.backendUrl}/api/docs`);
    logCorsConfig();
    if (config.stripe.secretKey) {
      console.log(`Stripe webhook URL: ${config.stripe.webhookUrl}`);
    }
    console.log('Connecting to database…');
  });

  try {
    await connectDB();
    await autoSeedIfEmpty();
    if (config.nodeEnv !== 'test') {
      startCronJobs();
    }
    if (!isDatabaseConnected) {
      console.warn('Warning: database not connected — demo OTP still works');
    }
  } catch (err) {
    console.error('Database setup failed:', err instanceof Error ? err.message : err);
    if (config.nodeEnv === 'production') {
      process.exit(1);
    }
    console.warn('API is up in degraded mode — use demo sign-in (9876543210) until DB connects.');
  }
};

startServer();

export default app;
