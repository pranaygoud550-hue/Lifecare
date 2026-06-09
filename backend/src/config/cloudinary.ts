import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { config } from './index.js';

let configured = false;

const PLACEHOLDER_VALUES = new Set(['your_cloud_name', 'your_api_key', 'your_api_secret']);

export function isCloudinaryConfigured(): boolean {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) return false;
  if (PLACEHOLDER_VALUES.has(cloudName) || PLACEHOLDER_VALUES.has(apiKey) || PLACEHOLDER_VALUES.has(apiSecret)) {
    return false;
  }
  return true;
}

export function ensureCloudinaryConfigured(): typeof cloudinary {
  if (!configured) {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
    }
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

let mediscanStorage: CloudinaryStorage | null = null;

/** Multer storage engine — uploads into Cloudinary folder `mediscan` */
export function getMediscanCloudinaryStorage(): CloudinaryStorage {
  if (!mediscanStorage) {
    mediscanStorage = new CloudinaryStorage({
      cloudinary: ensureCloudinaryConfigured(),
      params: async (_req, file) => {
        const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
        const isDicom = ext === 'dcm' || file.mimetype === 'application/dicom';
        return {
          folder: 'mediscan',
          resource_type: isDicom ? ('raw' as const) : ('image' as const),
          public_id: `scan-${Date.now()}`,
        };
      },
    });
  }
  return mediscanStorage;
}

export { cloudinary };
