import { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import { Readable } from 'stream';
import sharp from 'sharp';
import {
  CorruptScanFileError,
  CloudinaryUploadError,
  handleScanUploadErrors,
} from './uploadMiddleware.js';
import { ensureCloudinaryConfigured, getMediscanCloudinaryStorage, isCloudinaryConfigured } from '../config/cloudinary.js';
import { config } from '../config/index.js';
import { saveScanToLocalStorage } from '../services/localScanStorage.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp']);
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp']);

function fileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

function isAllowedImage(file: Express.Multer.File): boolean {
  const ext = fileExtension(file.originalname);
  return ALLOWED_EXTENSIONS.has(ext) || ALLOWED_MIMES.has(file.mimetype);
}

export const analyzeFileParser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedImage(file)) {
      cb(new CorruptScanFileError('Unsupported image format. Use JPG, PNG, or WebP.'));
      return;
    }
    cb(null, true);
  },
}).single('image');

async function validateImageBuffer(buffer: Buffer): Promise<Buffer> {
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) {
      throw new CorruptScanFileError('Invalid or corrupted image file.');
    }
    return buffer;
  } catch {
    throw new CorruptScanFileError('Invalid or corrupted image file.');
  }
}

async function uploadAnalyzeImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Image file is required (field: image)' });
      return;
    }

    const buffer = await validateImageBuffer(req.file.buffer);
    req.file.buffer = buffer;

    const attachStoredFile = (url: string, publicId: string, size?: number) => {
      req.file!.cloudinaryUrl = url;
      req.file!.cloudinaryPublicId = publicId;
      if (size != null) req.file!.size = size;
    };

    if (isCloudinaryConfigured()) {
      try {
        ensureCloudinaryConfigured();
        const fileForStorage = {
          ...req.file,
          buffer,
          stream: Readable.from(buffer),
        } as Express.Multer.File;

        await new Promise<void>((resolve, reject) => {
          getMediscanCloudinaryStorage()._handleFile(req, fileForStorage, (error, info) => {
            if (error) {
              reject(error);
              return;
            }
            if (!info?.path) {
              reject(new Error('Cloudinary returned no file URL'));
              return;
            }
            attachStoredFile(info.path, info.filename ?? info.path, info.size);
            resolve();
          });
        });
        next();
        return;
      } catch (cloudErr) {
        if (config.nodeEnv === 'production') {
          throw new CloudinaryUploadError(
            'Image upload is temporarily unavailable. Please try again shortly.'
          );
        }
        console.warn('[ChestScan] Cloudinary failed — using local storage:', cloudErr);
      }
    }

    const local = await saveScanToLocalStorage({ buffer, isDicom: false });
    attachStoredFile(local.url, local.publicId, buffer.length);
    next();
  } catch (err) {
    if (err instanceof CorruptScanFileError) {
      res.status(422).json({ success: false, message: err.message, code: err.code });
      return;
    }
    if (err instanceof CloudinaryUploadError) {
      res.status(503).json({ success: false, message: err.message, code: err.code });
      return;
    }
    next(err);
  }
}

export const analyzeUploadMiddleware = [
  (req: Request, res: Response, next: NextFunction) => {
    analyzeFileParser(req, res, (err) => {
      if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(422).json({
          success: false,
          message: 'Image exceeds the 10MB size limit.',
          code: 'FILE_TOO_LARGE',
        });
        return;
      }
      if (err) handleScanUploadErrors(err, req, res, next);
      else next();
    });
  },
  uploadAnalyzeImage,
];
