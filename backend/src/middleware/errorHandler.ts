import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import {
  sanitizeErrorMessage,
  shouldExposeErrorInternals,
} from '../utils/sanitizeErrorMessage.js';

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  code?: string;
  stack?: string;
}

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
}

function buildErrorPayload(
  statusCode: number,
  message: string,
  options?: { code?: string; errors?: Array<{ field: string; message: string }>; stack?: string }
): ApiErrorResponse {
  return {
    success: false,
    message,
    ...(options?.code && { code: options.code }),
    ...(options?.errors?.length && { errors: options.errors }),
    ...(options?.stack && { stack: options.stack }),
  };
}

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json(buildErrorPayload(404, 'Route not found', { code: 'NOT_FOUND' }));
};

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (res.headersSent) return;

  console.error('Error:', err);

  if (err instanceof ZodError) {
    const zodError = err as ZodError;
    res.status(400).json(
      buildErrorPayload(400, 'Validation failed', {
        code: 'VALIDATION_ERROR',
        errors: zodError.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      })
    );
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json(
      buildErrorPayload(400, 'Validation failed', {
        code: 'MONGOOSE_VALIDATION_ERROR',
        errors: Object.values(err.errors).map((e) => ({
          field: e.path,
          message: e.message,
        })),
      })
    );
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json(
      buildErrorPayload(400, 'Invalid identifier format', { code: 'INVALID_ID' })
    );
    return;
  }

  if (err.name === 'MongoServerError') {
    const mongoCode = (err as { code?: number }).code;
    if (mongoCode === 11000) {
      res.status(409).json(
        buildErrorPayload(409, 'Duplicate entry — resource already exists', { code: 'DUPLICATE_KEY' })
      );
      return;
    }
    if (mongoCode === 16755 || /Can't extract geo keys/i.test(err.message)) {
      res.status(400).json(
        buildErrorPayload(400, 'Location data is invalid. Please try again.', {
          code: 'INVALID_GEOJSON',
        })
      );
      return;
    }
  }

  const statusCode = err.statusCode ?? 500;
  const isServerError = statusCode >= 500;
  const exposeInternals = shouldExposeErrorInternals();
  const rawMessage = err.message || 'Internal server error';
  const clientMessage =
    isServerError && !exposeInternals
      ? 'Internal server error'
      : exposeInternals
        ? rawMessage
        : sanitizeErrorMessage(rawMessage);

  res.status(statusCode).json(
    buildErrorPayload(statusCode, clientMessage, {
      code: err.code ?? (isServerError ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
      errors: err.errors,
      ...(exposeInternals && err.stack ? { stack: err.stack } : {}),
    })
  );
};
