import type { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'express-mongo-sanitize';

/**
 * Strips MongoDB query operators ($gt, $where, etc.) from body, query, and params
 * to mitigate NoSQL injection.
 */
export const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  allowDots: false,
  onSanitize: ({ key, req }) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[Security] Sanitized MongoDB operator in request key "${key}"`, {
        method: req.method,
        path: req.path,
      });
    }
  },
});

/** Skip sanitizing raw Stripe webhook payloads (Buffer), sanitize everything else. */
export function mongoSanitizeExceptWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.originalUrl.startsWith('/api/payments/webhook')) {
    next();
    return;
  }
  mongoSanitizeMiddleware(req, res, next);
}
