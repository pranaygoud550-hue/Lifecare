import { Readable } from 'stream';
import { ensureCloudinaryConfigured } from '../config/cloudinary.js';

/**
 * Direct buffer upload to Cloudinary `mediscan` folder (used outside multer-storage path).
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  options: { folder?: string; filename?: string }
): Promise<string> {
  const cloudinary = ensureCloudinaryConfigured();
  const folder = options.folder ?? 'mediscan';
  const publicId = options.filename?.replace(/\.[^.]+$/, '') ?? `scan-${Date.now()}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        overwrite: false,
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error ?? new Error('Cloudinary upload failed'));
          return;
        }
        resolve(result.secure_url);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}
