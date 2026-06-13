import { config } from '../config/index.js';
import type { ScanType } from '../types/scan.js';
import type { MediScanAnalyzeResponse } from '../types/scan.js';
import { runLocalMlScreening } from './localMlScreening.js';

export type MlAnalysisSource = 'external' | 'local_screening';

export interface UnifiedMlAnalysisResult {
  prediction: string;
  confidence: number;
  probabilities: Record<string, number>;
  explanation?: string;
  disclaimer?: string;
  gradcamUrl?: string;
  source: MlAnalysisSource;
  engine: string;
}

const DEFAULT_DISCLAIMER =
  'This is an AI screening tool, not a medical diagnosis. Always consult a qualified healthcare professional for clinical decisions.';

function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 1) return Math.round(value * 10000) / 100;
  return Math.round(Math.min(100, Math.max(0, value)) * 100) / 100;
}

function mapRecord(raw: Record<string, number> | undefined): Record<string, number> {
  if (!raw) return {};
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, normalizeConfidence(v)])
  );
}

function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function normalizeExternalPayload(
  data: unknown,
  scanType: ScanType
): UnifiedMlAnalysisResult | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;

  if (Array.isArray(obj.detections)) {
    return null;
  }

  const className =
    (obj.class_name as string) ||
    (obj.prediction as string) ||
    (obj.label as string) ||
    '';

  const rawConf = obj.confidence;
  const confidence =
    typeof rawConf === 'number' ? normalizeConfidence(rawConf) : 0;

  if (!className.trim()) return null;

  const probsRaw = obj.all_predictions ?? obj.probabilities;
  let probabilities: Record<string, number> = {};
  if (probsRaw && typeof probsRaw === 'object' && !Array.isArray(probsRaw)) {
    probabilities = mapRecord(probsRaw as Record<string, number>);
  }

  return {
    prediction: className.trim(),
    confidence: confidence || 72,
    probabilities,
    explanation:
      typeof obj.explanation === 'string'
        ? obj.explanation
        : `Screening suggests patterns consistent with ${className}.`,
    disclaimer:
      typeof obj.disclaimer === 'string' ? obj.disclaimer : DEFAULT_DISCLAIMER,
    gradcamUrl:
      (obj.gradcam_url as string) || (obj.gradcamUrl as string) || undefined,
    source: 'external',
    engine: 'mediscan-remote',
  };
}

async function postMultipart(
  url: string,
  buffer: Buffer,
  mimetype: string,
  originalname: string,
  scanType: ScanType
): Promise<Response> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: mimetype || 'image/jpeg' });
  form.append('file', blob, originalname || 'scan.jpg');
  if (url.includes('/api/analyze')) {
    form.append('scan_type', scanType);
  }
  return fetch(url, { method: 'POST', body: form });
}

async function tryRemoteAnalyze(input: {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  scanType: ScanType;
}): Promise<UnifiedMlAnalysisResult | null> {
  const base = config.mediscan.apiUrl.replace(/\/$/, '');
  const forceLocal =
    process.env.MEDISCAN_FORCE_LOCAL === 'true' || process.env.MEDISCAN_FORCE_LOCAL === '1';

  if (forceLocal) return null;

  const endpoints = [`${base}/api/analyze`, `${base}/predict`];

  for (const url of endpoints) {
    try {
      const withType = url.includes('/api/analyze');
      const res = await postMultipart(
        url,
        input.buffer,
        input.mimetype,
        input.originalname,
        input.scanType
      );
      const text = await res.text();
      if (!res.ok) continue;

      const parsed = parseJsonSafe(text);
      const normalized = normalizeExternalPayload(parsed, input.scanType);
      if (normalized) return normalized;
    } catch (err) {
      console.warn(`[ML] Remote attempt failed (${url}):`, err);
    }
  }

  return null;
}

export async function analyzeMedicalScan(input: {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  scanType: ScanType;
}): Promise<UnifiedMlAnalysisResult> {
  const remote = await tryRemoteAnalyze(input);
  if (remote) return remote;

  const local = await runLocalMlScreening(input.buffer, input.scanType);

  return {
    prediction: local.prediction,
    confidence: local.confidence,
    probabilities: local.probabilities,
    explanation: local.explanation,
    disclaimer: DEFAULT_DISCLAIMER,
    source: 'local_screening',
    engine: 'lifecare-integrated',
  };
}

export async function analyzeChestXrayImage(input: {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}): Promise<
  UnifiedMlAnalysisResult & {
    class_name: string;
    all_predictions: Record<string, number>;
  }
> {
  const result = await analyzeMedicalScan({
    ...input,
    scanType: 'chest_xray',
  });

  const classes = ['Normal', 'Pneumonia', 'Tuberculosis', 'COVID'] as const;
  const all_predictions: Record<string, number> = { ...result.probabilities };
  if (Object.keys(all_predictions).length === 0) {
    for (const c of classes) {
      all_predictions[c] = c === result.prediction ? result.confidence : 0;
    }
  }

  return {
    ...result,
    class_name: result.prediction,
    all_predictions,
  };
}

export function mediScanResponseToUnified(
  ai: MediScanAnalyzeResponse,
  scanType: ScanType
): UnifiedMlAnalysisResult {
  const confidence = normalizeConfidence(ai.confidence);
  return {
    prediction: ai.prediction,
    confidence,
    probabilities: mapRecord(ai.probabilities),
    explanation: `Your ${scanType.replace(/_/g, ' ')} screening suggests ${ai.prediction} with ${confidence.toFixed(1)}% confidence.`,
    disclaimer: DEFAULT_DISCLAIMER,
    source: 'external',
    engine: 'mediscan-remote',
  };
}
