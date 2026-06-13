import { analyzeMedicalScan, analyzeChestXrayImage } from '../../src/services/mlScanAnalyzer.js';
import { runLocalMlScreening } from '../../src/services/localMlScreening.js';

describe('mlScanAnalyzer', () => {
  const sampleBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );

  it('returns chest screening via integrated fallback', async () => {
    const result = await analyzeChestXrayImage({
      buffer: sampleBuffer,
      mimetype: 'image/png',
      originalname: 'test.png',
    });

    expect(result.class_name).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.source).toBe('local_screening');
    expect(Object.keys(result.all_predictions).length).toBeGreaterThan(0);
  });

  it('analyzes skin and retina scan types', async () => {
    for (const scanType of ['skin_lesion', 'retina', 'chest_xray'] as const) {
      const result = await analyzeMedicalScan({
        buffer: sampleBuffer,
        mimetype: 'image/png',
        originalname: 'test.png',
        scanType,
      });
      expect(result.prediction).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.source).toBe('local_screening');
    }
  });

  it('local screening is deterministic for same buffer', async () => {
    const a = await runLocalMlScreening(sampleBuffer, 'chest_xray');
    const b = await runLocalMlScreening(sampleBuffer, 'chest_xray');
    expect(a.prediction).toBe(b.prediction);
    expect(a.confidence).toBe(b.confidence);
  });
});
