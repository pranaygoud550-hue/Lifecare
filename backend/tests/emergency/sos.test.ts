import request from 'supertest';
import { EmergencyRequest, AmbulanceUnit } from '../../src/models/index.js';
import { startTestServer, type TestServer } from '../helpers/testServer.js';
import {
  TEST_COORDS,
  expectedEtaMinutes,
  haversineMeters,
  seedEmergencyTestData,
} from '../helpers/emergencyFixtures.js';

describe('POST /api/emergency/sos', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('finds the nearest ambulance within 10km and returns ETA under 10 minutes', async () => {
    const seed = await seedEmergencyTestData();
    const expectedEta = expectedEtaMinutes(
      TEST_COORDS.ambulances.nearest.lat,
      TEST_COORDS.ambulances.nearest.lng,
      TEST_COORDS.patient.lat,
      TEST_COORDS.patient.lng
    );

    const response = await request(server.httpServer)
      .post('/api/emergency/sos')
      .set('Authorization', `Bearer ${seed.patient.token}`)
      .send({
        patientLat: TEST_COORDS.patient.lat,
        patientLng: TEST_COORDS.patient.lng,
        emergencyType: 'cardiac',
        patientId: String(seed.patient._id),
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.isDelayed).toBe(false);
    expect(response.body.data.calculatedETA).toBeLessThanOrEqual(10);
    expect(response.body.data.calculatedETA).toBe(expectedEta);
    expect(response.body.data.assignedAmbulance.vehicleNumber).toBe(
      TEST_COORDS.ambulances.nearest.vehicleNumber
    );
    expect(response.body.data.assignedAmbulance.distanceMeters).toBe(
      seed.distances.nearestAmbulanceMeters
    );
  });

  it('returns delayed flag when no ambulance can arrive within 10 minutes', async () => {
    const seed = await seedEmergencyTestData({ onlyFarAmbulanceAvailable: true });
    const expectedEta = expectedEtaMinutes(
      TEST_COORDS.ambulances.far.lat,
      TEST_COORDS.ambulances.far.lng,
      TEST_COORDS.patient.lat,
      TEST_COORDS.patient.lng
    );

    const response = await request(server.httpServer)
      .post('/api/emergency/sos')
      .set('Authorization', `Bearer ${seed.patient.token}`)
      .send({
        patientLat: TEST_COORDS.patient.lat,
        patientLng: TEST_COORDS.patient.lng,
        emergencyType: 'accident',
        patientId: String(seed.patient._id),
      });

    expect(response.status).toBe(201);
    expect(response.body.data.isDelayed).toBe(true);
    expect(response.body.data.calculatedETA).toBeGreaterThan(10);
    expect(response.body.data.calculatedETA).toBe(expectedEta);
    expect(response.body.data.assignedAmbulance.vehicleNumber).toBe(
      TEST_COORDS.ambulances.far.vehicleNumber
    );
  });

  it('returns 422 when patient location is missing', async () => {
    const seed = await seedEmergencyTestData();

    const response = await request(server.httpServer)
      .post('/api/emergency/sos')
      .set('Authorization', `Bearer ${seed.patient.token}`)
      .send({
        emergencyType: 'cardiac',
        patientId: String(seed.patient._id),
      });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
  });

  it('creates an EmergencyRequest document with the correct fields', async () => {
    const seed = await seedEmergencyTestData();

    const response = await request(server.httpServer)
      .post('/api/emergency/sos')
      .set('Authorization', `Bearer ${seed.patient.token}`)
      .send({
        patientLat: TEST_COORDS.patient.lat,
        patientLng: TEST_COORDS.patient.lng,
        emergencyType: 'breathing',
        patientId: String(seed.patient._id),
      });

    expect(response.status).toBe(201);

    const saved = await EmergencyRequest.findOne({ requestId: response.body.data.requestId });
    expect(saved).not.toBeNull();
    expect(String(saved!.patientId)).toBe(String(seed.patient._id));
    expect(saved!.status).toBe('searching');
    expect(saved!.emergencyType).toBe('breathing');
    expect(saved!.patientLocation.coordinates).toEqual([
      TEST_COORDS.patient.lng,
      TEST_COORDS.patient.lat,
    ]);
    expect(saved!.isDelayed).toBe(false);
    expect(saved!.candidateAmbulanceIds).toHaveLength(3);

    const assignedUnit = await AmbulanceUnit.findById(saved!.assignedAmbulanceId);
    expect(assignedUnit?.vehicleNumber).toBe(TEST_COORDS.ambulances.nearest.vehicleNumber);
    expect(assignedUnit?.isAvailable).toBe(false);
    // Unit status becomes 'dispatched' after driver accepts (demo flow disabled in tests).
  });
});
