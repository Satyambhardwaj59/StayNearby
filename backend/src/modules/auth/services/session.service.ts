import { env } from '../../../config/env';
import { AuthenticationError } from '../../../shared/errors';
import type { UserRole } from '../../../shared/constants';
import type { AuthPrincipal } from '../../../types/express';
import { userRepository } from '../../users/repositories/user.repository';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';
import { sessionRepository } from '../repositories/session.repository';
import { generateRefreshToken } from './token.service';

/** Session creation, live validation and refresh-token rotation with reuse detection. */

function refreshExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
}

export interface IssuedSession {
  sessionId: string;
  refreshToken: string;
}

export async function createSession(input: {
  userId: string;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<IssuedSession> {
  const expiresAt = refreshExpiry();
  const session = await sessionRepository.create({
    userId: input.userId,
    userAgent: input.userAgent ?? null,
    ip: input.ip ?? null,
    expiresAt,
  });

  const familyId = String(session._id);
  const { token, tokenHash } = generateRefreshToken();
  await refreshTokenRepository.create({
    userId: input.userId,
    sessionId: String(session._id),
    familyId,
    tokenHash,
    expiresAt,
  });

  return { sessionId: String(session._id), refreshToken: token };
}

/** Server-side session validation: the token alone is never trusted. */
export async function validateSession(
  sessionId: string,
  userId: string,
): Promise<AuthPrincipal | null> {
  if (!sessionId || !userId) {
    return null;
  }
  const session = await sessionRepository.findActiveById(sessionId, userId);
  if (!session) {
    return null;
  }

  const user = await userRepository.findById(userId);
  if (!user || user.status !== 'ACTIVE') {
    return null;
  }

  void sessionRepository.touch(sessionId);

  return {
    userId,
    role: user.role as UserRole,
    sessionId,
    emailVerified: Boolean(user.emailVerifiedAt),
    phoneVerified: Boolean(user.phoneVerifiedAt),
  };
}

export interface RotatedSession {
  userId: string;
  sessionId: string;
  refreshToken: string;
}

export async function rotateRefreshToken(rawToken: string): Promise<RotatedSession> {
  const { hashToken } = await import('./token.service');
  const stored = await refreshTokenRepository.findByHash(hashToken(rawToken));
  if (!stored) {
    throw new AuthenticationError('Invalid refresh token', 'TOKEN_INVALID');
  }

  // Reuse of a rotated/revoked token revokes the entire rotation family.
  if (stored.revokedAt || stored.usedAt) {
    await refreshTokenRepository.revokeFamily(stored.familyId);
    await sessionRepository.revoke(String(stored.sessionId));
    throw new AuthenticationError('Refresh token reuse detected', 'TOKEN_INVALID');
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    throw new AuthenticationError('Refresh token expired', 'TOKEN_EXPIRED');
  }

  await refreshTokenRepository.markUsed(String(stored._id));

  const { token, tokenHash } = generateRefreshToken();
  await refreshTokenRepository.create({
    userId: String(stored.userId),
    sessionId: String(stored.sessionId),
    familyId: stored.familyId,
    tokenHash,
    expiresAt: refreshExpiry(),
  });

  return {
    userId: String(stored.userId),
    sessionId: String(stored.sessionId),
    refreshToken: token,
  };
}

export async function revokeUserSession(
  userId: string,
  sessionId: string,
): Promise<{ revoked: boolean }> {
  // Ownership check: a user may only revoke their own session.
  const owned = await sessionRepository.findActiveById(sessionId, userId);
  if (!owned) {
    return { revoked: false };
  }
  await revokeSession(sessionId);
  return { revoked: true };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await Promise.all([
    sessionRepository.revoke(sessionId),
    refreshTokenRepository.revokeForSession(sessionId),
  ]);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await Promise.all([
    sessionRepository.revokeAllForUser(userId),
    refreshTokenRepository.revokeAllForUser(userId),
  ]);
}

export function listSessions(userId: string, currentSessionId?: string) {
  return sessionRepository.listActiveForUser(userId, currentSessionId);
}
