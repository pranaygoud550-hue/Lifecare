import request from 'supertest';
import { getTestApp } from '../helpers/testApp.js';
import { registerPatient } from '../helpers/authHelpers.js';
import { User } from '../../src/models/index.js';

describe('POST /api/auth/register', () => {
  it('registers a new patient successfully with OTP verification', async () => {
    const app = await getTestApp();
    const { response, phone } = await registerPatient(app, { phone: '9111111111' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.phone).toBe(phone);
    expect(response.body.data.user.userType).toBe('patient');
    expect(response.headers['set-cookie']).toBeDefined();

    const saved = await User.findOne({ phone });
    expect(saved).not.toBeNull();
    expect(saved?.email).toBe(`${phone}@phone.lifecare.local`);
  });

  it('rejects duplicate registration for an existing phone/email', async () => {
    const app = await getTestApp();
    const phone = '9222222222';

    await registerPatient(app, { phone });

    const duplicateOtpRequest = await request(app).post('/api/auth/send-otp').send({
      phone,
      purpose: 'register',
    });

    expect(duplicateOtpRequest.status).toBe(409);
    expect(duplicateOtpRequest.body.success).toBe(false);
    expect(duplicateOtpRequest.body.message).toMatch(/already exists/i);
  });

  it('returns 400 when required registration fields are missing', async () => {
    const app = await getTestApp();

    const response = await request(app).post('/api/auth/register').send({
      userType: 'patient',
      phone: '9333333333',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors?.length).toBeGreaterThan(0);
  });
});
