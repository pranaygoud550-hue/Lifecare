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

const MAX_RETRIES = 10;
const PRODUCTION_RETRIES = 5;
const RETRY_DELAY_MS = 3000;
const ATLAS_TIMEOUT_MS = 15_000;
const LOCAL_TIMEOUT_MS = 8_000;
const LOCAL_FALLBACK_URI = 'mongodb://127.0.0.1:27017/lifecare-plus';

export class DatabaseConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

function assertProductionMongoConfigured(uri: string): void {
  if (config.nodeEnv !== 'production') return;

  if (!process.env.MONGODB_URI?.trim()) {
    throw new DatabaseConnectionError(
      'MONGODB_URI is not set. Add your Atlas connection string in Render → Environment.'
    );
  }

  if (!isAtlasUri(uri) && uri.includes('127.0.0.1')) {
    throw new DatabaseConnectionError(
      'Production requires MongoDB Atlas. Set MONGODB_URI to your mongodb+srv://… URI on Render.'
    );
  }
}

function printConnectionHelp(uri: string): void {
  const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  const isAtlas = isAtlasUri(uri);
  console.error('\n❌ Could not connect to MongoDB — data will NOT persist until this is fixed.');
  console.error(`   URI: ${safeUri}\n`);
  if (isAtlas) {
    console.error('One-time Atlas setup (keeps data for months/years):');
    console.error('   1. https://cloud.mongodb.com → Network Access → Add IP → 0.0.0.0/0');
    console.error('   2. Database → Clusters → Resume if paused (free M0 sleeps after ~60d idle)');
    console.error('   3. npm run db:verify');
    console.error('   See docs/DEPLOY_ATLAS.md\n');
  } else {
    console.error('Options:');
    console.error('   npm run db:up          # Docker MongoDB');
    console.error('   npm run db:verify      # test connection');
    console.error('   Set MONGODB_URI to Atlas in backend/.env — see docs/DEPLOY_ATLAS.md');
    console.error('   USE_MEMORY_DB=true     # temporary only — data resets every restart\n');
  }
}

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
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30_000,
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
  /** In-memory wipes all data on restart — opt-in only via USE_MEMORY_DB=true */
  if (process.env.USE_MEMORY_DB === 'true') {
    console.warn('⚠️  USE_MEMORY_DB=true — data will NOT survive restarts.');
    await connectInMemoryDatabase();
    return;
  }

  const uri = encodeMongoUri(normalizeMongoUri(config.mongodbUri));
  mongoose.set('strictQuery', true);

  assertProductionMongoConfigured(uri);

  const isAtlas = isAtlasUri(uri);
  const isProduction = config.nodeEnv === 'production';
  const maxRetries = isProduction ? PRODUCTION_RETRIES : MAX_RETRIES;
  const timeoutMs = isAtlas ? ATLAS_TIMEOUT_MS : LOCAL_TIMEOUT_MS;

  if (await tryConnectWithRetries(uri, maxRetries, timeoutMs)) {
    if (isAtlas) {
      console.log('💾 Persistent Atlas database — data survives restarts and deploys.');
    }
    return;
  }

  /** Dev-only: optional local Docker/mongo after Atlas/local URI fails */
  if (config.nodeEnv === 'development' && uri !== LOCAL_FALLBACK_URI) {
    console.warn('\n⚠️  Primary MongoDB unreachable. Trying local MongoDB at 127.0.0.1:27017...');
    if (await tryConnectWithRetries(LOCAL_FALLBACK_URI, 3, LOCAL_TIMEOUT_MS)) {
      console.warn('   Using local MongoDB — for cloud persistence set Atlas in backend/.env');
      return;
    }
  }

  printConnectionHelp(uri);
  throw new DatabaseConnectionError('Could not connect to MongoDB after retries.');
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
