import request from 'supertest';
import { getTestApp } from '../helpers/testApp.js';
import { authHeader, createUserWithPassword } from '../helpers/authHelpers.js';
import { createPatientToken } from '../helpers/platformFixtures.js';

describe('GET /api/users/wallet', () => {
  it('returns the patient wallet balance and recent transaction summary', async () => {
    const app = await getTestApp();
    const { accessToken } = await createPatientToken({ walletBalance: 2500 });

    const response = await request(app).get('/api/users/wallet').set(authHeader(accessToken));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.balance).toBe(2500);
    expect(response.body.data).toHaveProperty('monthlySummary');
    expect(Array.isArray(response.body.data.transactions)).toBe(true);
  });

  it('returns 401 when no authentication token is provided', async () => {
    const app = await getTestApp();
    await createPatientToken();

    const response = await request(app).get('/api/users/wallet');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/authentication required/i);
  });

  it('returns 403 when a non-patient requests wallet data', async () => {
    const app = await getTestApp();
    const doctor = await createUserWithPassword({
      email: 'doctor.wallet@test.com',
      phone: '9888888801',
      userType: 'doctor',
    });

    const response = await request(app)
      .get('/api/users/wallet')
      .set(authHeader(doctor.accessToken));

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/patient/i);
  });
});
