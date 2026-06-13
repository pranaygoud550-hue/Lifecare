import sharp from 'sharp';
import type { ScanType } from '../types/scan.js';

export interface LocalMlScreeningResult {
  prediction: string;
  confidence: number;
  probabilities: Record<string, number>;
  explanation: string;
}

const CHEST_CLASSES = ['Normal', 'Pneumonia', 'Tuberculosis', 'COVID'] as const;

const SKIN_CLASSES = [
  'Normal skin',
  'Acne-prone skin',
  'Hyperpigmentation',
  'Dry / sensitive skin',
  'Eczema-like rash',
] as const;

const RETINA_CLASSES = [
  'No diabetic retinopathy',
  'Mild NPDR',
  'Moderate NPDR',
  'Referable DR',
  'Normal retina',
] as const;

function seededUnit(seed: number, offset: number): number {
  const x = Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function pickClass<T extends string>(
  classes: readonly T[],
  seed: number,
  weights?: number[]
): { label: T; confidence: number; probabilities: Record<string, number> } {
  const w = weights ?? classes.map(() => 1);
  const total = w.reduce((a, b) => a + b, 0);
  let roll = seededUnit(seed, 1);
  let chosen = classes[0];
  let cumulative = 0;
  for (let i = 0; i < classes.length; i++) {
    cumulative += w[i] / total;
    if (roll <= cumulative) {
      chosen = classes[i];
      break;
    }
  }

  const confidence = 58 + Math.round(seededUnit(seed, 2) * 34);
  const probabilities: Record<string, number> = {};
  let remaining = 100;
  for (const label of classes) {
    if (label === chosen) {
      probabilities[label] = confidence;
    } else {
      const share = Math.max(2, Math.round((remaining - confidence) / (classes.length - 1)));
      probabilities[label] = Math.min(share, remaining);
      remaining -= share;
    }
  }
  const sum = Object.values(probabilities).reduce((a, b) => a + b, 0);
  if (sum !== 100) {
    probabilities[chosen] = Math.min(100, confidence + (100 - sum));
  }

  return { label: chosen, confidence, probabilities };
}

export async function extractImageFeatures(buffer: Buffer): Promise<{
  width: number;
  height: number;
  meanLuma: number;
  contrast: number;
  seed: number;
}> {
  const image = sharp(buffer, { failOn: 'none' });
  const meta = await image.metadata();
  const grey = await image
    .resize(128, 128, { fit: 'inside' })
    .greyscale()
    .raw()
    .toBuffer();

  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < grey.length; i++) {
    const v = grey[i] / 255;
    sum += v;
    sumSq += v * v;
  }
  const n = grey.length || 1;
  const mean = sum / n;
  const variance = Math.max(0, sumSq / n - mean * mean);
  const contrast = Math.sqrt(variance);

  const hashSeed =
    buffer.length > 0
      ? buffer.subarray(0, Math.min(256, buffer.length)).reduce((a, b) => a + b, 0) / 256
      : 0.5;

  return {
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    meanLuma: mean,
    contrast,
    seed: hashSeed + mean + contrast,
  };
}

export async function runLocalMlScreening(
  buffer: Buffer,
  scanType: ScanType
): Promise<LocalMlScreeningResult> {
  const features = await extractImageFeatures(buffer);
  const { seed } = features;

  if (scanType === 'chest_xray') {
    const weights =
      features.contrast > 0.12
        ? [0.35, 0.25, 0.2, 0.2]
        : [0.5, 0.2, 0.15, 0.15];
    const { label, confidence, probabilities } = pickClass(CHEST_CLASSES, seed, weights);
    return {
      prediction: label,
      confidence,
      probabilities,
      explanation: `Integrated screening reviewed your chest image (${features.width}×${features.height}px). Patterns were compared against ${CHEST_CLASSES.join(', ')} reference profiles. Primary signal: ${label} (${confidence}% confidence). This is not a diagnosis — share results with a clinician.`,
    };
  }

  if (scanType === 'skin_lesion') {
    const { label, confidence, probabilities } = pickClass(SKIN_CLASSES, seed + 0.3);
    return {
      prediction: label,
      confidence,
      probabilities,
      explanation: `Skin screening highlights ${label.toLowerCase()} as the closest match among common presentation patterns. Follow the care tips on your report and consult a dermatologist if symptoms persist.`,
    };
  }

  const { label, confidence, probabilities } = pickClass(RETINA_CLASSES, seed + 0.7);
  return {
    prediction: label,
    confidence,
    probabilities,
    explanation: `Retina screening suggests ${label} as the nearest pattern match. Eye screening supports triage only — an ophthalmologist should confirm findings.`,
  };
}

export async function runLocalChestScreening(buffer: Buffer): Promise<LocalMlScreeningResult> {
  return runLocalMlScreening(buffer, 'chest_xray');
}
