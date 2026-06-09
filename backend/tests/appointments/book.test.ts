import request from 'supertest';
import { Appointment } from '../../src/models/index.js';
import { getTestApp } from '../helpers/testApp.js';
import { authHeader } from '../helpers/authHelpers.js';
import { createPatientToken, seedDoctors } from '../helpers/platformFixtures.js';
import { createUserWithPassword } from '../helpers/authHelpers.js';

function tomorrowDateString(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

describe('POST /api/appointments/book', () => {
  it('books an appointment successfully for an authenticated patient', async () => {
    const app = await getTestApp();
    const seed = await seedDoctors();
    const { accessToken, user } = await createPatientToken();
    const scheduledDate = tomorrowDateString();

    const response = await request(app)
      .post('/api/appointments/book')
      .set(authHeader(accessToken))
      .send({
        doctorId: String(seed.cardiologistHyderabad._id),
        consultationType: 'video',
        scheduledDate,
        scheduledTime: '10:00',
        chiefComplaint: 'Chest discomfort',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('pending');
    expect(String(response.body.data.patientId._id ?? response.body.data.patientId)).toBe(
      String(user._id)
    );

    const saved = await Appointment.findOne({
      doctorId: seed.cardiologistHyderabad._id,
      scheduledTime: '10:00',
    });
    expect(saved).not.toBeNull();
  });

  it('returns 409 when the requested slot is already booked', async () => {
    const app = await getTestApp();
    const seed = await seedDoctors();
    const patientOne = await createPatientToken({ phone: '9666666601' });
    const patientTwo = await createPatientToken({
      email: 'patient.two@test.com',
      phone: '9666666602',
    });
    const scheduledDate = tomorrowDateString();

    const payload = {
      doctorId: String(seed.cardiologistHyderabad._id),
      consultationType: 'video',
      scheduledDate,
      scheduledTime: '11:00',
      chiefComplaint: 'Follow-up',
    };

    const first = await request(app)
      .post('/api/appointments/book')
      .set(authHeader(patientOne.accessToken))
      .send(payload);

    expect(first.status).toBe(201);

    const conflict = await request(app)
      .post('/api/appointments/book')
      .set(authHeader(patientTwo.accessToken))
      .send(payload);

    expect(conflict.status).toBe(409);
    expect(conflict.body.message).toMatch(/already booked/i);
  });

  it('returns 401 when the caller is not authenticated', async () => {
    const app = await getTestApp();
    const seed = await seedDoctors();

    const response = await request(app).post('/api/appointments/book').send({
      doctorId: String(seed.cardiologistHyderabad._id),
      consultationType: 'video',
      scheduledDate: tomorrowDateString(),
      scheduledTime: '12:00',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/authentication required/i);
  });

  it('returns 403 when a non-patient tries to book', async () => {
    const app = await getTestApp();
    const seed = await seedDoctors();
    const doctorAccount = await createUserWithPassword({
      email: 'doctor.book@test.com',
      phone: '9777777701',
      userType: 'doctor',
    });

    const response = await request(app)
      .post('/api/appointments/book')
      .set(authHeader(doctorAccount.accessToken))
      .send({
        doctorId: String(seed.cardiologistHyderabad._id),
        consultationType: 'video',
        scheduledDate: tomorrowDateString(),
        scheduledTime: '13:00',
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/patient/i);
  });
});
