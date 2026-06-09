import mongoose from 'mongoose';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { markDatabaseConnected } from '../../src/config/database.js';

declare global {
  // eslint-disable-next-line no-var
  var __MONGOD__: MongoMemoryServer | undefined;
}

export async function startTestDatabase(): Promise<string> {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;
  global.__MONGOD__ = mongod;
  return uri;
}

export async function connectTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
  }
  markDatabaseConnected(true);
}

export async function clearTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

export async function disconnectTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  markDatabaseConnected(false);
}

export async function stopTestDatabase(): Promise<void> {
  await disconnectTestDatabase();
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
    global.__MONGOD__ = undefined;
  }
}