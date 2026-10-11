import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../../config/env';
import { AuthenticationError } from '../../../shared/errors';
import type { UserRole } from '../../../shared/constants';
import { hmac, randomToken } from '../../../shared/utils/crypto';

/** Access-token signing/verification and opaque refresh-token generation. */

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  role: UserRole;
  ev: boolean;
  pv: boolean;
  type: 'access';
}

const AUDIENCE = 'rental-marketplace-client';

export function signAccessToken(input: {
  userId: string;
  sessionId: string;
  role: UserRole;
  emailVerified: boolean;
  phoneVerified: boolean;
}): string {
  const payload: AccessTokenPayload = {
    sub: input.userId,
    sid: input.sessionId,
    role: input.role,
    ev: input.emailVerified,
    pv: input.phoneVerified,
    type: 'access',
  };
  const options: SignOptions = {
    algorithm: 'HS256',
    issuer: env.SERVICE_NAME,
    audience: AUDIENCE,
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: env.SERVICE_NAME,
      audience: AUDIENCE,
    }) as AccessTokenPayload;

    if (decoded.type !== 'access') {
      throw new AuthenticationError('Invalid access token', 'TOKEN_INVALID');
    }
    return decoded;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Access token expired', 'TOKEN_EXPIRED');
    }
    throw new AuthenticationError('Invalid access token', 'TOKEN_INVALID');
  }
}

/** Opaque refresh token (returned once) plus the HMAC stored at rest. */
export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = randomToken();
  return { token, tokenHash: hmac(token) };
}

export function hashToken(token: string): string {
  return hmac(token);
}
