import request from 'supertest';
import { getTestApp } from '../helpers/testApp.js';
import { seedDoctors } from '../helpers/platformFixtures.js';

describe('GET /api/doctors', () => {
  it('returns verified doctors with pagination metadata', async () => {
    const app = await getTestApp();
    await seedDoctors();

    const response = await request(app).get('/api/doctors');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.doctors).toHaveLength(3);
    expect(response.body.data.pagination.total).toBe(3);
  });

  it('filters doctors by specialty', async () => {
    const app = await getTestApp();
    await seedDoctors();

    const response = await request(app).get('/api/doctors').query({ specialty: 'Cardiology' });

    expect(response.status).toBe(200);
    expect(response.body.data.doctors).toHaveLength(2);
    expect(
      response.body.data.doctors.every((doctor: { doctorDetails: { specializations: string[] } }) =>
        doctor.doctorDetails.specializations.includes('Cardiology')
      )
    ).toBe(true);
  });

  it('filters doctors by city and maximum consultation fee', async () => {
    const app = await getTestApp();
    const seed = await seedDoctors();

    const response = await request(app)
      .get('/api/doctors')
      .query({ city: 'Hyderabad', maxFee: '700' });

    expect(response.status).toBe(200);
    expect(response.body.data.doctors).toHaveLength(1);
    expect(response.body.data.doctors[0].doctorDetails.consultationFees.video).toBe(
      seed.cardiologistHyderabad.videoFee
    );
  });

  it('returns an empty list when filters match no doctors', async () => {
    const app = await getTestApp();
    await seedDoctors();

    const response = await request(app)
      .get('/api/doctors')
      .query({ specialty: 'Cardiology', city: 'Mumbai' });

    expect(response.status).toBe(200);
    expect(response.body.data.doctors).toHaveLength(0);
  });
});
