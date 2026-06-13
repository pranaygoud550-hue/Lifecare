import request from 'supertest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { startTestServer, type TestServer } from '../helpers/testServer.js';
import { registerPatient } from '../helpers/authHelpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, '../fixtures/sample-chest.png');

describe('POST /api/scans/analyze (chest X-ray)', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('analyzes chest image and stores scan for patient', async () => {
    const { response: reg } = await registerPatient(server.httpServer);
    expect(reg.status).toBe(201);
    const token = reg.body.data.accessToken as string;

    let imageBuffer: Buffer;
    try {
      imageBuffer = readFileSync(fixturePath);
    } catch {
      imageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
    }

    const analyzeRes = await request(server.httpServer)
      .post('/api/scans/analyze')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', imageBuffer, 'chest-test.png');

    expect(analyzeRes.status).toBe(201);
    expect(analyzeRes.body.success).toBe(true);
    expect(analyzeRes.body.data.prediction).toBeTruthy();
    expect(analyzeRes.body.data.confidence).toBeGreaterThan(0);

    const listRes = await request(server.httpServer)
      .get('/api/scans/my-scans')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
