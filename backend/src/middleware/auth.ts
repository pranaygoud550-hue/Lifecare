import { Request, Response, NextFunction } from 'express';
import type { JwtPayload, UserType } from '../types/index.js';
import {
  verifyAccessToken,
  isTokenBlacklisted,
  decodeTokenUnsafe,
} from '../services/tokenService.js';

const ROLE_LABELS: Record<UserType, string> = {
  patient: 'patient',
  doctor: 'doctor',
  pharmacy: 'pharmacy staff',
  ambulance: 'ambulance operator',
  admin: 'administrator',
};

function extractAccessToken(req: Request): string | null {
  if (req.cookies?.accessToken) return req.cookies.accessToken as string;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];
  return null;
}

/**
 * Verifies JWT from HTTP-only cookie (preferred) or Authorization header.
 * Rejects blacklisted tokens (logout).
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractAccessToken(req);
    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const decoded = verifyAccessToken(token);

    if (decoded.jti && (await isTokenBlacklisted(decoded.jti))) {
      res.status(401).json({ success: false, message: 'Session ended. Please sign in again.' });
      return;
    }

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Role-based access control. Admin always passes if included in allowed roles.
 * Returns explicit 403 messages per role.
 */
export const authorize = (...allowedRoles: UserType[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (allowedRoles.includes(req.user.userType)) {
      next();
      return;
    }

    const allowedLabel = allowedRoles.map((r) => ROLE_LABELS[r]).join(', ');
    res.status(403).json({
      success: false,
      message: `Access denied. This resource requires ${allowedLabel} privileges. Your account is a ${ROLE_LABELS[req.user.userType]}.`,
      requiredRoles: allowedRoles,
      yourRole: req.user.userType,
    });
  };
};

/** Optional auth — attaches user when valid cookie/header present */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractAccessToken(req);
    if (!token) {
      next();
      return;
    }
    const decoded = verifyAccessToken(token);
    if (decoded.jti && (await isTokenBlacklisted(decoded.jti))) {
      next();
      return;
    }
    req.user = decoded;
  } catch {
    // continue without user
  }
  next();
};

/** Read refresh token from cookie or body (legacy) */
export function extractRefreshToken(req: Request): string | null {
  if (req.cookies?.refreshToken) return req.cookies.refreshToken as string;
  if (typeof req.body?.refreshToken === 'string') return req.body.refreshToken;
  return null;
}

export function extractTokenJti(token: string | null): string | undefined {
  if (!token) return undefined;
  return decodeTokenUnsafe(token)?.jti;
}
