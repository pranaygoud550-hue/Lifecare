import request from 'supertest';
import { startTestServer, type TestServer } from '../helpers/testServer.js';
import {
  TEST_COORDS,
  haversineMeters,
  seedEmergencyTestData,
} from '../helpers/emergencyFixtures.js';

describe('GET /api/emergency/nearby-hospitals', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('returns hospitals sorted by distance from the patient', async () => {
    await seedEmergencyTestData();
    const { lat, lng } = TEST_COORDS.patient;

    const nearDistance = haversineMeters(
      TEST_COORDS.hospitals.near.lat,
      TEST_COORDS.hospitals.near.lng,
      lat,
      lng
    );
    const farDistance = haversineMeters(
      TEST_COORDS.hospitals.far.lat,
      TEST_COORDS.hospitals.far.lng,
      lat,
      lng
    );

    const response = await request(server.httpServer)
      .get('/api/emergency/nearby-hospitals')
      .query({ lat, lng, radius: 10 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.hospitals).toHaveLength(2);
    expect(response.body.data.hospitals[0].name).toBe(TEST_COORDS.hospitals.near.name);
    expect(response.body.data.hospitals[1].name).toBe(TEST_COORDS.hospitals.far.name);
    expect(response.body.data.hospitals[0].distanceMeters).toBeLessThan(
      response.body.data.hospitals[1].distanceMeters
    );
    expect(Math.abs(response.body.data.hospitals[0].distanceMeters - nearDistance)).toBeLessThanOrEqual(
      100
    );
    expect(Math.abs(response.body.data.hospitals[1].distanceMeters - farDistance)).toBeLessThanOrEqual(
      100
    );
  });

  it('returns an empty array when no hospitals are within the radius', async () => {
    await seedEmergencyTestData();
    const { lat, lng } = TEST_COORDS.remote;

    const response = await request(server.httpServer)
      .get('/api/emergency/nearby-hospitals')
      .query({ lat, lng, radius: 1 });

    expect(response.status).toBe(200);
    expect(response.body.data.hospitals).toEqual([]);
    expect(response.body.data.count).toBe(0);
  });

  it('returns distance values accurate within 100 meters', async () => {
    await seedEmergencyTestData();
    const { lat, lng } = TEST_COORDS.patient;

    const response = await request(server.httpServer)
      .get('/api/emergency/nearby-hospitals')
      .query({ lat, lng, radius: 10 });

    for (const hospital of response.body.data.hospitals) {
      const expected = haversineMeters(
        hospital.coordinates.lat,
        hospital.coordinates.lng,
        lat,
        lng
      );
      expect(Math.abs(hospital.distanceMeters - expected)).toBeLessThanOrEqual(100);
    }
  });
});
