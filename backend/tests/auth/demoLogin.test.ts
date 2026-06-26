import request from 'supertest';
import { getTestApp } from '../helpers/testApp.js';

describe('POST /api/auth/demo-login', () => {
  it('upserts the patient demo account without invalid ambulance geo', async () => {
    const app = await getTestApp();

    const response = await request(app)
      .post('/api/auth/demo-login')
      .send({ phone: '9876543210' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.phone).toBe('9876543210');
    expect(response.body.data.user.password).toBeUndefined();
    expect(response.body.data.user.ambulanceDetails).toBeUndefined();
    expect(response.body.data.accessToken).toBeTruthy();
  });

  it('does not leak Mongo document dumps in error responses', async () => {
    const app = await getTestApp();

    const response = await request(app)
      .post('/api/auth/demo-login')
      .send({ phone: '0000000000' });

    expect(response.status).toBe(400);
    expect(response.body.message).not.toMatch(/password|ObjectId/i);
    expect(response.body.stack).toBeUndefined();
  });
});
