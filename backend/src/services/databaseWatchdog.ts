import mongoose from 'mongoose';
import { config } from '../config/index.js';
import {
  ensureDatabaseConnection,
  isDatabaseConnected,
  markDatabaseConnected,
} from '../config/database.js';

const PING_INTERVAL_MS = 30_000;
const RECONNECT_DELAY_MS = 3_000;

let intervalId: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnecting = false;

async function ping(): Promise<boolean> {
  if (mongoose.connection.readyState !== 1) {
    markDatabaseConnected(false);
    return false;
  }
  try {
    await mongoose.connection.db?.admin().ping();
    markDatabaseConnected(true);
    return true;
  } catch {
    markDatabaseConnected(false);
    return false;
  }
}

async function scheduleReconnect(reason: string): Promise<void> {
  if (reconnecting || process.env.USE_MEMORY_DB === 'true' || config.nodeEnv === 'test') {
    return;
  }
  if (reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void runReconnect(reason);
  }, RECONNECT_DELAY_MS);
}

async function runReconnect(reason: string): Promise<void> {
  if (reconnecting) return;
  reconnecting = true;
  try {
    console.warn(`[DB watchdog] Reconnecting (${reason})…`);
    const ok = await ensureDatabaseConnection();
    if (ok) {
      console.log('[DB watchdog] Database connection restored');
    }
  } finally {
    reconnecting = false;
  }
}

export function startDatabaseWatchdog(): void {
  if (config.nodeEnv === 'test' || intervalId) return;

  void ping();

  intervalId = setInterval(() => {
    void (async () => {
      const ok = await ping();
      if (!ok && !isDatabaseConnected) {
        await scheduleReconnect('periodic ping failed');
      }
    })();
  }, PING_INTERVAL_MS);

  mongoose.connection.on('disconnected', () => {
    markDatabaseConnected(false);
    void scheduleReconnect('mongoose disconnected');
  });
}

export function stopDatabaseWatchdog(): void {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
}
