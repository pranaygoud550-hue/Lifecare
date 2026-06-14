import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { setServers as setDnsServers } from 'node:dns';
import dotenv from 'dotenv';
import { config } from './index.js';
import {
  atlasConnectionHints,
  encodeMongoUri,
  isAtlasUri,
} from './mongoUri.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

/** Prefer IPv4 on macOS — avoids ECONNREFUSED on ::1:27017 */
export function normalizeMongoUri(uri: string): string {
  return uri
    .replace(/mongodb:\/\/localhost\b/i, 'mongodb://127.0.0.1')
    .replace(/mongodb\+srv:\/\/localhost\b/i, 'mongodb+srv://127.0.0.1');
}

export let isDatabaseConnected = false;
export let usingInMemoryDatabase = false;

/** Test helper — marks mongoose connection state for services that gate on isDbReady(). */
export function markDatabaseConnected(connected: boolean): void {
  isDatabaseConnected = connected;
}

let memoryServer: { stop: () => Promise<boolean>; getUri: (db?: string) => string } | null = null;

const MAX_RETRIES = 8;
const ATLAS_DEV_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const LOCAL_FALLBACK_URI = 'mongodb://127.0.0.1:27017/lifecare-plus';

function logAtlasHints(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const hints = atlasConnectionHints(message);
  if (hints.length === 0) return;
  console.error('   Atlas checklist:');
  for (const hint of hints) {
    console.error(`     • ${hint}`);
  }
}

async function connectWithUri(
  uri: string,
  options: { serverSelectionTimeoutMS?: number } = {}
): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  const isAtlas = isAtlasUri(uri);
  if (isAtlas) {
    setDnsServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: options.serverSelectionTimeoutMS ?? 15000,
    connectTimeoutMS: options.serverSelectionTimeoutMS ?? 15000,
    family: 4,
    autoSelectFamily: false,
  });

  isDatabaseConnected = true;
  const { host, name, port } = mongoose.connection;
  console.log(`✅ MongoDB connected → ${name} on ${host}:${port ?? 'srv'}`);

  mongoose.connection.on('disconnected', () => {
    isDatabaseConnected = false;
    console.warn('⚠️  MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    isDatabaseConnected = true;
    console.log('✅ MongoDB reconnected');
  });
}

async function connectInMemoryDatabase(): Promise<void> {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const server = await MongoMemoryServer.create();
  memoryServer = server;
  usingInMemoryDatabase = true;

  const uri = server.getUri('lifecare-plus');
  await connectWithUri(uri);
  console.log('📦 Using in-memory MongoDB (dev). Data resets when the server stops.');
  console.log('   For a permanent DB: Docker (npm run db:up), local MongoDB, or Atlas in backend/.env');
}

async function tryConnectWithRetries(
  uri: string,
  maxRetries: number,
  timeoutMs: number
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await connectWithUri(uri, { serverSelectionTimeoutMS: timeoutMs });
      usingInMemoryDatabase = false;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`MongoDB (${attempt}/${maxRetries}): ${message}`);
      if (uri.startsWith('mongodb+srv')) logAtlasHints(error);

      if (attempt < maxRetries) {
        console.log(`   Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  return false;
}

export const connectDB = async (): Promise<void> => {
  if (process.env.USE_MEMORY_DB === 'true') {
    await connectInMemoryDatabase();
    return;
  }

  const uri = encodeMongoUri(normalizeMongoUri(config.mongodbUri));
  mongoose.set('strictQuery', true);

  const isAtlas = isAtlasUri(uri);
  const isDev = config.nodeEnv === 'development';
  const primaryRetries = isDev && isAtlas ? ATLAS_DEV_RETRIES : MAX_RETRIES;
  const primaryTimeoutMs = isDev && isAtlas ? 12000 : 15000;

  if (await tryConnectWithRetries(uri, primaryRetries, primaryTimeoutMs)) {
    return;
  }

  if (isDev) {
    if (uri !== LOCAL_FALLBACK_URI) {
      console.warn('\n⚠️  Primary MongoDB unreachable. Trying local MongoDB at 127.0.0.1:27017...');
      if (await tryConnectWithRetries(LOCAL_FALLBACK_URI, 1, 3000)) {
        return;
      }
    }

    console.warn('\n⚠️  Could not reach MongoDB (Atlas IP whitelist, Docker, or local mongod).');
    console.warn('   Falling back to in-memory database for development...\n');
    try {
      await connectInMemoryDatabase();
      return;
    } catch (memErr) {
      console.error('In-memory MongoDB failed:', memErr);
    }
  }

  /** Demo/production deploy without Atlas — keep interview flows working (data resets on cold start). */
  if (process.env.ALLOW_DEMO_LOGIN === 'true' && process.env.USE_MEMORY_DB !== 'false') {
    console.warn('\n⚠️  MongoDB unreachable — using in-memory DB for demo deploy (ALLOW_DEMO_LOGIN)...\n');
    try {
      await connectInMemoryDatabase();
      return;
    } catch (memErr) {
      console.error('In-memory MongoDB failed:', memErr);
    }
  }

  const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  console.error('\n❌ Could not connect to MongoDB');
  console.error(`   URI: ${safeUri}\n`);
  console.error('Options:');
  console.error('   npm run db:up       # Docker MongoDB');
  console.error('   npm run db:seed     # demo users & data');
  console.error('   USE_MEMORY_DB=true npm run dev -w backend   # temporary in-memory DB');
  console.error('   Or set MONGODB_URI in backend/.env (MongoDB Atlas)\n');
  process.exit(1);
};

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isDatabaseConnected = false;
  }
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
    usingInMemoryDatabase = false;
  }
};

export default connectDB;
