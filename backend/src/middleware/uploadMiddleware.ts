import { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import { Readable } from 'stream';
import sharp from 'sharp';
import { ensureCloudinaryConfigured, getMediscanCloudinaryStorage, isCloudinaryConfigured } from '../config/cloudinary.js';
import { config } from '../config/index.js';
import { saveScanToLocalStorage } from '../services/localScanStorage.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.dcm']);
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/dicom',
  'application/octet-stream',
]);

export class CorruptScanFileError extends Error {
  statusCode = 422;
  code = 'CORRUPT_SCAN_FILE';

  constructor(message: string) {
    super(message);
    this.name = 'CorruptScanFileError';
  }
}

export class CloudinaryUploadError extends Error {
  statusCode = 503;
  code = 'CLOUDINARY_UNAVAILABLE';

  constructor(message: string) {
    super(message);
    this.name = 'CloudinaryUploadError';
  }
}

function fileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

function isAllowedScanFile(file: Express.Multer.File): boolean {
  const ext = fileExtension(file.originalname);
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;
  if (file.mimetype && !ALLOWED_MIMES.has(file.mimetype) && file.mimetype !== 'image/pjpeg') {
    return ext === '.dcm';
  }
  return true;
}

/** DICOM files contain "DICM" at byte offset 128 */
function isValidDicomHeader(buffer: Buffer): boolean {
  if (buffer.length < 132) return false;
  return buffer.subarray(128, 132).toString('ascii') === 'DICM';
}

/**
 * Multer: single field `scan`, memory buffer for validation before Cloudinary.
 */
export const scanFileParser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedScanFile(file)) {
      cb(
        new CorruptScanFileError(
          'Invalid file type. Only JPG, PNG, and DICOM (.dcm) scans are allowed.'
        )
      );
      return;
    }
    cb(null, true);
  },
}).single('scan');

export function handleScanUploadErrors(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!err) {
    next();
    return;
  }

  if (err instanceof CorruptScanFileError) {
    res.status(422).json({
      success: false,
      message: err.message,
      code: err.code,
    });
    return;
  }

  if (err instanceof CloudinaryUploadError) {
    res.status(503).json({
      success: false,
      message: err.message,
      code: err.code,
    });
    return;
  }

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(422).json({
        success: false,
        message: 'Scan file exceeds the 10MB size limit.',
        code: 'FILE_TOO_LARGE',
      });
      return;
    }
    res.status(422).json({
      success: false,
      message: err.message,
      code: 'UPLOAD_ERROR',
    });
    return;
  }

  next(err);
}

async function validateAndPrepareBuffer(
  file: Express.Multer.File
): Promise<{
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  isDicom: boolean;
  dicomPythonConversion: boolean;
}> {
  const ext = fileExtension(file.originalname);

  if (ext === '.dcm') {
    if (!isValidDicomHeader(file.buffer)) {
      throw new CorruptScanFileError(
        'Corrupt DICOM file. The file header is invalid or incomplete.'
      );
    }
    // sharp cannot decode DICOM; Python MediScan service handles conversion to PNG.
    return {
      buffer: file.buffer,
      mimetype: 'application/dicom',
      originalname: file.originalname,
      isDicom: true,
      dicomPythonConversion: true,
    };
  }

  try {
    const meta = await sharp(file.buffer).metadata();
    if (!meta.format || !meta.width || !meta.height) {
      throw new CorruptScanFileError('Corrupt image file. Unable to read image dimensions.');
    }

    const pngBuffer = await sharp(file.buffer).png().toBuffer();
    return {
      buffer: pngBuffer,
      mimetype: 'image/png',
      originalname: file.originalname.replace(/\.[^.]+$/i, '.png'),
      isDicom: false,
      dicomPythonConversion: false,
    };
  } catch (e) {
    if (e instanceof CorruptScanFileError) throw e;
    throw new CorruptScanFileError(
      'Corrupt or unreadable image. Please upload a valid JPG or PNG file.'
    );
  }
}

/**
 * Upload validated buffer to Cloudinary or local disk (dev fallback).
 * Attaches cloudinaryUrl and cloudinaryPublicId to req.file.
 */
export async function uploadScanToCloudinary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file?.buffer) {
      res.status(400).json({ success: false, message: 'Scan file is required (field: scan)' });
      return;
    }

    const prepared = await validateAndPrepareBuffer(req.file);
    req.file.isDicom = prepared.isDicom;
    req.file.dicomPythonConversion = prepared.dicomPythonConversion;

    const attachStoredFile = (url: string, publicId: string, size?: number) => {
      req.file!.cloudinaryUrl = url;
      req.file!.cloudinaryPublicId = publicId;
      req.file!.path = url;
      req.file!.filename = publicId;
      if (size != null) req.file!.size = size;
    };

    if (isCloudinaryConfigured()) {
      try {
        ensureCloudinaryConfigured();

        const fileForStorage = {
          ...req.file,
          buffer: prepared.buffer,
          mimetype: prepared.mimetype,
          originalname: prepared.originalname,
          stream: Readable.from(prepared.buffer),
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
        console.warn('[MediScan] Cloudinary upload failed — using local storage:', cloudErr);
      }
    }

    const local = await saveScanToLocalStorage({
      buffer: prepared.buffer,
      isDicom: prepared.isDicom,
    });
    attachStoredFile(local.url, local.publicId, prepared.buffer.length);
    next();
  } catch (err) {
    if (err instanceof CorruptScanFileError) {
      res.status(422).json({
        success: false,
        message: err.message,
        code: err.code,
      });
      return;
    }
    if (err instanceof CloudinaryUploadError) {
      res.status(503).json({
        success: false,
        message: err.message,
        code: err.code,
      });
      return;
    }
    next(
      new CloudinaryUploadError(
        'Image upload is temporarily unavailable. Please try again in a few moments.'
      )
    );
  }
}

/** Convenience chain: parse → cloudinary */
export const scanUploadMiddleware = [
  (req: Request, res: Response, next: NextFunction) => {
    scanFileParser(req, res, (err) => {
      if (err) handleScanUploadErrors(err, req, res, next);
      else next();
    });
  },
  uploadScanToCloudinary,
];
