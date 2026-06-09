import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config/index.js';

const SCAN_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'mediscan');

export async function saveScanToLocalStorage(input: {
  buffer: Buffer;
  isDicom: boolean;
}): Promise<{ url: string; publicId: string; filename: string }> {
  await fs.promises.mkdir(SCAN_UPLOAD_DIR, { recursive: true });

  const ext = input.isDicom ? '.dcm' : '.png';
  const filename = `scan-${Date.now()}-${randomUUID()}${ext}`;
  await fs.promises.writeFile(path.join(SCAN_UPLOAD_DIR, filename), input.buffer);

  return {
    filename,
    url: `${config.backendUrl}/uploads/mediscan/${filename}`,
    publicId: `local/mediscan/${filename}`,
  };
}

export function resolveScanAssetUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${config.backendUrl}${url}`;
  return url;
}
