import type { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalTeardown() {
  const mongod = (globalThis as typeof globalThis & { __MONGOD__?: MongoMemoryServer }).__MONGOD__;
  if (mongod) {
    await mongod.stop();
  }
}
