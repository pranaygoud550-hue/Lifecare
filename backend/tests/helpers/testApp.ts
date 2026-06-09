import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { connectTestDatabase } from '../setup/testDatabase.js';

let cachedApp: Express | null = null;

export async function getTestApp(): Promise<Express> {
  await connectTestDatabase();
  cachedApp = null;
  cachedApp = createApp();
  return cachedApp;
}
