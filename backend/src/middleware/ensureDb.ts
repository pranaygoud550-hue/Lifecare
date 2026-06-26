import type { NextFunction, Request, Response } from 'express';
import { ensureDatabaseConnection } from '../config/database.js';
import { isDbReady } from '../config/dbStatus.js';

/** Ensures Atlas is connected before API handlers run (fixes cold-start "database offline"). */
export async function ensureDbMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (process.env.USE_MEMORY_DB === 'true') {
    next();
    return;
  }

  if (!isDbReady()) {
    const restored = await ensureDatabaseConnection();
    if (!restored) {
      res.status(503).json({
        success: false,
        code: 'DATABASE_OFFLINE',
        message: 'Database is waking up. Wait 10–20 seconds and try again.',
      });
      return;
    }
  }

  next();
}
