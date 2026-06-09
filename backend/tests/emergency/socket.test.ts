import request from 'supertest';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { EmergencyRequest } from '../../src/models/index.js';
import { startTestServer, type TestServer } from '../helpers/testServer.js';
import {
  TEST_COORDS,
  flushPromises,
  seedEmergencyTestData,
} from '../helpers/emergencyFixtures.js';

function connectSocket(port: number): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = ioClient(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      forceNew: true,
    });

    client.on('connect', () => resolve(client));
    client.on('connect_error', reject);
  });
}

function authenticateSocket(client: ClientSocket, token: string): Promise<{ success: boolean }> {
  return new Promise((resolve, reject) => {
    client.emit('socket:authenticate', { token }, (response: { success: boolean }) => {
      if (response?.success) resolve(response);
      else reject(new Error('Socket authentication failed'));
    });
  });
}

function waitForEvent<T>(client: ClientSocket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);

    const handler = (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    };

    client.on(event, handler);
  });
}

describe('Emergency Socket.io events', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('broadcasts driver:locationUpdate to the patient emergency room', async () => {
    const seed = await seedEmergencyTestData();

    const sosResponse = await request(server.httpServer)
      .post('/api/emergency/sos')
      .set('Authorization', `Bearer ${seed.patient.token}`)
      .send({
        patientLat: TEST_COORDS.patient.lat,
        patientLng: TEST_COORDS.patient.lng,
        emergencyType: 'cardiac',
        patientId: String(seed.patient._id),
      });

    const requestId = sosResponse.body.data.requestId as string;
    const nearestDriver = seed.drivers.find(
      (driver) => driver.vehicleNumber === TEST_COORDS.ambulances.nearest.vehicleNumber
    )!;

    const patientSocket = await connectSocket(server.port);
    const driverSocket = await connectSocket(server.port);

    patientSocket.emit('join-emergency-room', requestId);
    await authenticateSocket(driverSocket, nearestDriver.token);

    const locationPromise = waitForEvent<{
      requestId: string;
      location: { lat: number; lng: number };
    }>(patientSocket, 'ambulance:locationUpdate');

    driverSocket.emit('driver:locationUpdate', {
      requestId,
      lat: TEST_COORDS.ambulances.nearest.lat + 0.001,
      lng: TEST_COORDS.ambulances.nearest.lng,
    });

    const payload = await locationPromise;
    expect(payload.requestId).toBe(requestId);
    expect(payload.location.lat).toBeCloseTo(TEST_COORDS.ambulances.nearest.lat + 0.001, 4);
    expect(payload.location.lng).toBeCloseTo(TEST_COORDS.ambulances.nearest.lng, 4);

    patientSocket.disconnect();
    driverSocket.disconnect();
  });

  it('updates the database and emits emergency:arrived to the patient on driver:arrived', async () => {
    const seed = await seedEmergencyTestData();

    const sosResponse = await request(server.httpServer)
      .post('/api/emergency/sos')
      .set('Authorization', `Bearer ${seed.patient.token}`)
      .send({
        patientLat: TEST_COORDS.patient.lat,
        patientLng: TEST_COORDS.patient.lng,
        emergencyType: 'other',
        patientId: String(seed.patient._id),
      });

    const requestId = sosResponse.body.data.requestId as string;
    const nearestDriver = seed.drivers.find(
      (driver) => driver.vehicleNumber === TEST_COORDS.ambulances.nearest.vehicleNumber
    )!;

    const patientSocket = await connectSocket(server.port);
    const driverSocket = await connectSocket(server.port);

    patientSocket.emit('join-emergency-room', requestId);
    await authenticateSocket(driverSocket, nearestDriver.token);

    driverSocket.emit('driver:accepted', { requestId });
    await flushPromises();

    const arrivedPromise = waitForEvent<{ requestId: string; status: string; message: string }>(
      patientSocket,
      'emergency:arrived'
    );

    driverSocket.emit('driver:arrived', { requestId });

    const arrivedPayload = await arrivedPromise;
    expect(arrivedPayload.requestId).toBe(requestId);
    expect(arrivedPayload.status).toBe('arrived');
    expect(arrivedPayload.message).toContain('arrived');

    const saved = await EmergencyRequest.findOne({ requestId });
    expect(saved?.status).toBe('arrived');
    expect(saved?.arrivedAt).toBeInstanceOf(Date);
    expect(saved?.actualArrivalTime).toBeInstanceOf(Date);

    patientSocket.disconnect();
    driverSocket.disconnect();
  });

  it('reassigns to the next nearest ambulance after the driver accept timeout', async () => {
    process.env.EMERGENCY_ACCEPT_TIMEOUT_MS = '200';
    const seed = await seedEmergencyTestData();

    const patientSocket = await connectSocket(server.port);
    const reassignedPromise = waitForEvent<{
      requestId: string;
      assignedAmbulance?: { vehicleNumber?: string };
    }>(patientSocket, 'emergency:reassigned', 10000);

    const sosResponse = await request(server.httpServer)
      .post('/api/emergency/sos')
      .set('Authorization', `Bearer ${seed.patient.token}`)
      .send({
        patientLat: TEST_COORDS.patient.lat,
        patientLng: TEST_COORDS.patient.lng,
        emergencyType: 'accident',
        patientId: String(seed.patient._id),
      });

    const requestId = sosResponse.body.data.requestId as string;
    patientSocket.emit('join-emergency-room', requestId);

    expect(sosResponse.body.data.assignedAmbulance.vehicleNumber).toBe(
      TEST_COORDS.ambulances.nearest.vehicleNumber
    );

    await new Promise((resolve) => setTimeout(resolve, 350));
    await flushPromises(10);

    const reassignedPayload = await reassignedPromise;
    expect(reassignedPayload.requestId).toBe(requestId);
    expect(reassignedPayload.assignedAmbulance?.vehicleNumber).toBe(
      TEST_COORDS.ambulances.mid.vehicleNumber
    );

    const saved = await EmergencyRequest.findOne({ requestId });
    const reassignedUnit = seed.drivers.find(
      (driver) => driver.vehicleNumber === TEST_COORDS.ambulances.mid.vehicleNumber
    )!;
    expect(String(saved?.assignedAmbulanceId)).toBe(String(reassignedUnit.unitId));
    expect(saved?.status).toBe('searching');

    delete process.env.EMERGENCY_ACCEPT_TIMEOUT_MS;
    patientSocket.disconnect();
  });
});
