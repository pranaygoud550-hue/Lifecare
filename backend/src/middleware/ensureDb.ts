import type { NextFunction, Request, Response } from 'express';
import { ensureDatabaseConnection } from '../config/database.js';
import { isDbReady } from '../config/dbStatus.js';

/** Read-only emergency/location endpoints work via Google Places — never block on MongoDB. */
const DB_OPTIONAL_ROUTES = [
  '/emergency/nearby-hospitals',
  '/emergency/reverse-geocode',
  '/emergency/geocode',
  '/emergency/address-suggestions',
  '/emergency/hyderabad-areas',
] as const;

function isDbOptionalRoute(req: Request): boolean {
  const path = req.path.split('?')[0];
  return (DB_OPTIONAL_ROUTES as readonly string[]).includes(path);
}

const WAKE_RETRIES = 6;
const WAKE_DELAY_MS = 4000;

/** Ensures Atlas is connected before API handlers run; retries on cold start / paused cluster. */
export async function ensureDbMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (process.env.USE_MEMORY_DB === 'true') {
    next();
    return;
  }

  if (isDbOptionalRoute(req)) {
    if (!isDbReady()) {
      void ensureDatabaseConnection();
    }
    next();
    return;
  }

  if (!isDbReady()) {
    for (let attempt = 0; attempt < WAKE_RETRIES; attempt++) {
      const restored = await ensureDatabaseConnection();
      if (restored) {
        next();
        return;
      }
      if (attempt < WAKE_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, WAKE_DELAY_MS));
      }
    }

    res.status(503).json({
      success: false,
      code: 'DATABASE_OFFLINE',
      message: 'Server is starting up. Please wait a moment and try again.',
    });
    return;
  }

  next();
}
