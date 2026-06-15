import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
  process.env.DISABLE_EMERGENCY_DEMO = 'true';
  process.env.GOOGLE_PLACES_API_KEY = '';
  process.env.GOOGLE_MAPS_API_KEY = '';
  (globalThis as typeof globalThis & { __MONGOD__: MongoMemoryServer }).__MONGOD__ = mongod;
}
