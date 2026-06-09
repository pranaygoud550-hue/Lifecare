import request from 'supertest';
import { getTestApp } from '../helpers/testApp.js';
import {
  TEST_PASSWORD,
  createUserWithPassword,
  loginWithPassword,
} from '../helpers/authHelpers.js';

describe('POST /api/auth/login', () => {
  it('logs in successfully with valid email and password', async () => {
    const app = await getTestApp();
    await createUserWithPassword({
      email: 'login.success@test.com',
      phone: '9444444441',
    });

    const response = await loginWithPassword(app, 'login.success@test.com', TEST_PASSWORD);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('login.success@test.com');
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 for an incorrect password', async () => {
    const app = await getTestApp();
    await createUserWithPassword({
      email: 'login.wrongpass@test.com',
      phone: '9444444442',
    });

    const response = await loginWithPassword(app, 'login.wrongpass@test.com', 'WrongPass1');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/invalid email or password/i);
  });

  it('returns 404 when the user does not exist', async () => {
    const app = await getTestApp();

    const response = await loginWithPassword(app, 'missing.user@test.com', TEST_PASSWORD);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/user not found/i);
  });
});
