import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sanitizeDeep } from '../utils/sanitize.js';

export { errorHandler, notFound } from './errorHandler.js';
export type { AppError, ApiErrorResponse } from './errorHandler.js';

export const validate = (schema: ZodSchema, options?: { statusCode?: number }) => {
  const statusCode = options?.statusCode ?? 400;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as { body?: unknown; query?: unknown; params?: unknown };

      if (parsed.body !== undefined) req.body = sanitizeDeep(parsed.body);
      if (parsed.query !== undefined) req.query = sanitizeDeep(parsed.query) as typeof req.query;
      if (parsed.params !== undefined) req.params = sanitizeDeep(parsed.params) as typeof req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(statusCode).json({
          success: false,
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
        return;
      }
      next(error);
    }
  };
};

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
