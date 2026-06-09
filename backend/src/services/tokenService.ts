import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { TokenBlacklist, RefreshToken } from '../models/index.js';
import type { JwtPayload, UserType } from '../types/index.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessJti: string;
  refreshJti: string;
  familyId: string;
}

function parseExpiryMs(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return n * (multipliers[unit] || 86400000);
}

export async function issueTokenPair(payload: {
  userId: string;
  userType: UserType;
  email: string;
  familyId?: string;
}): Promise<TokenPair> {
  const accessJti = uuidv4();
  const refreshJti = uuidv4();
  const familyId = payload.familyId || uuidv4();

  const accessToken = jwt.sign(
    { userId: payload.userId, userType: payload.userType, email: payload.email, jti: accessJti },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    {
      userId: payload.userId,
      userType: payload.userType,
      email: payload.email,
      jti: refreshJti,
      familyId,
    },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions
  );

  const refreshExpires = new Date(Date.now() + parseExpiryMs(config.jwt.refreshExpiresIn));

  await RefreshToken.create({
    userId: payload.userId,
    jti: refreshJti,
    familyId,
    expiresAt: refreshExpires,
  });

  return { accessToken, refreshToken, accessJti, refreshJti, familyId };
}

export async function rotateRefreshToken(oldRefreshToken: string): Promise<TokenPair | null> {
  let decoded: JwtPayload & { jti?: string; familyId?: string };
  try {
    decoded = jwt.verify(oldRefreshToken, config.jwt.refreshSecret) as JwtPayload & {
      jti?: string;
      familyId?: string;
    };
  } catch {
    return null;
  }

  if (!decoded.jti) return null;

  if (await isTokenBlacklisted(decoded.jti)) return null;

  const stored = await RefreshToken.findOne({ jti: decoded.jti, revokedAt: { $exists: false } });
  if (!stored) return null;

  stored.revokedAt = new Date();

  const newPair = await issueTokenPair({
    userId: decoded.userId,
    userType: decoded.userType,
    email: decoded.email,
    familyId: decoded.familyId || stored.familyId,
  });

  stored.replacedByJti = newPair.refreshJti;
  await stored.save();

  return newPair;
}

export async function revokeTokenPair(accessJti?: string, refreshJti?: string, userId?: string) {
  const ops: Promise<unknown>[] = [];

  if (accessJti) {
    ops.push(
      TokenBlacklist.findOneAndUpdate(
        { jti: accessJti },
        {
          jti: accessJti,
          tokenType: 'access',
          userId,
          expiresAt: new Date(Date.now() + parseExpiryMs(config.jwt.expiresIn)),
        },
        { upsert: true, new: true }
      )
    );
  }

  if (refreshJti) {
    ops.push(
      RefreshToken.updateOne({ jti: refreshJti }, { revokedAt: new Date() }),
      TokenBlacklist.findOneAndUpdate(
        { jti: refreshJti },
        {
          jti: refreshJti,
          tokenType: 'refresh',
          userId,
          expiresAt: new Date(Date.now() + parseExpiryMs(config.jwt.refreshExpiresIn)),
        },
        { upsert: true, new: true }
      )
    );
  }

  await Promise.all(ops);
}

export async function revokeAllUserRefreshTokens(userId: string) {
  await RefreshToken.updateMany({ userId, revokedAt: { $exists: false } }, { revokedAt: new Date() });
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const found = await TokenBlacklist.findOne({ jti });
  return !!found;
}

export function verifyAccessToken(token: string): JwtPayload & { jti?: string } {
  return jwt.verify(token, config.jwt.secret) as JwtPayload & { jti?: string };
}

export function decodeTokenUnsafe(token: string): (JwtPayload & { jti?: string }) | null {
  try {
    return jwt.decode(token) as JwtPayload & { jti?: string };
  } catch {
    return null;
  }
}
