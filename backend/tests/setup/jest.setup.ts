import { clearAllDriverAcceptTimeouts } from '../../src/services/emergencyRealtimeService.js';
import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from './testDatabase.js';

beforeAll(async () => {
  await connectTestDatabase();
});

afterEach(async () => {
  clearAllDriverAcceptTimeouts();
  await clearTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase();
});
