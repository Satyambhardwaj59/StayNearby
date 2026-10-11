import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from '../../../shared/errors';
import type { UserRole } from '../../../shared/constants';
import { hashPassword, verifyPassword } from '../../../shared/utils/password';
import { userRepository } from '../../users/repositories/user.repository';
import { toPrivateUser, type PrivateUserView } from '../../users/services/user.service';
import { requestOtp, verifyOtp } from './otp.service';
import {
  createSession,
  revokeAllSessions,
  revokeSession,
  rotateRefreshToken,
} from './session.service';
import { signAccessToken } from './token.service';

/** Registration, login, token rotation, verification and password management. */

const MAX_LOGIN_ATTEMPTS = 10;
const LOCK_MINUTES = 15;

export interface SessionMeta {
  userAgent?: string | null;
  ip?: string | null;
}

export interface AuthResult {
  user: PrivateUserView;
  sessionId: string;
  accessToken: string;
  /** Returned so the controller can set the httpOnly cookie; never sent in the body. */
  refreshToken: string;
}

async function issueAuthResult(
  user: { _id: unknown } & Parameters<typeof toPrivateUser>[0],
  meta: SessionMeta,
): Promise<AuthResult> {
  const userId = String(user._id);
  const session = await createSession({ userId, userAgent: meta.userAgent, ip: meta.ip });
  const view = toPrivateUser(user);
  const accessToken = signAccessToken({
    userId,
    sessionId: session.sessionId,
    role: view.role as UserRole,
    emailVerified: view.emailVerified,
    phoneVerified: view.phoneVerified,
  });
  return {
    user: view,
    sessionId: session.sessionId,
    accessToken,
    refreshToken: session.refreshToken,
  };
}

export async function register(
  input: {
    name: string;
    email: string;
    password: string;
    role: 'TENANT' | 'OWNER';
    phone?: string;
  },
  meta: SessionMeta,
): Promise<AuthResult> {
  const existing = await userRepository.findByEmail(input.email);
  if (existing) {
    throw new ConflictError('An account with this email already exists', [
      { field: 'email', message: 'Already registered' },
    ]);
  }

  const passwordHash = await hashPassword(input.password);
  const user = await userRepository.create({
    name: input.name,
    email: input.email.toLowerCase(),
    phone: input.phone ?? null,
    passwordHash,
    role: input.role,
    acceptedTermsAt: new Date(),
  });

  return issueAuthResult(user, meta);
}

export async function login(
  input: { email: string; password: string },
  meta: SessionMeta,
): Promise<AuthResult> {
  const user = await userRepository.findByEmail(input.email, { withPassword: true });

  // Same error for unknown email and wrong password (no account enumeration).
  if (!user || !user.passwordHash) {
    throw new AuthenticationError('Email or password is incorrect', 'INVALID_CREDENTIALS');
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new AuthenticationError(
      'Account temporarily locked after too many attempts',
      'ACCOUNT_LOCKED',
    );
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    await userRepository.registerFailedLogin(String(user._id), MAX_LOGIN_ATTEMPTS, LOCK_MINUTES);
    throw new AuthenticationError('Email or password is incorrect', 'INVALID_CREDENTIALS');
  }

  if (user.status !== 'ACTIVE') {
    throw new AuthenticationError('This account is not active', 'ACCOUNT_SUSPENDED');
  }

  await userRepository.recordSuccessfulLogin(String(user._id));
  return issueAuthResult(user, meta);
}

export async function refresh(rawToken: string, meta: SessionMeta): Promise<AuthResult> {
  const rotated = await rotateRefreshToken(rawToken);
  const user = await userRepository.findById(rotated.userId);
  if (!user || user.status !== 'ACTIVE') {
    await revokeAllSessions(rotated.userId);
    throw new AuthenticationError('Session is no longer valid', 'TOKEN_INVALID');
  }

  const view = toPrivateUser(user);
  const accessToken = signAccessToken({
    userId: rotated.userId,
    sessionId: rotated.sessionId,
    role: view.role as UserRole,
    emailVerified: view.emailVerified,
    phoneVerified: view.phoneVerified,
  });

  void meta;
  return {
    user: view,
    sessionId: rotated.sessionId,
    accessToken,
    refreshToken: rotated.refreshToken,
  };
}

export async function logout(sessionId: string): Promise<{ revoked: boolean }> {
  await revokeSession(sessionId);
  return { revoked: true };
}

export async function logoutAll(userId: string): Promise<{ revoked: boolean }> {
  await revokeAllSessions(userId);
  return { revoked: true };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ changed: boolean }> {
  const base = await userRepository.findById(userId);
  if (!base) {
    throw new NotFoundError('User');
  }

  const user = await userRepository.findByEmail(base.email, { withPassword: true });
  if (!user || !user.passwordHash) {
    throw new NotFoundError('User');
  }

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) {
    throw new AuthenticationError('Current password is incorrect', 'INVALID_CREDENTIALS');
  }

  const passwordHash = await hashPassword(newPassword);
  await userRepository.setPassword(userId, passwordHash);
  return { changed: true };
}

export async function requestEmailVerification(email: string): Promise<{ sent: boolean }> {
  const user = await userRepository.findByEmail(email);
  // Do not reveal whether the email exists.
  if (!user) {
    return { sent: true };
  }
  return requestOtp(email.toLowerCase(), 'EMAIL_VERIFICATION', { recipientName: user.name });
}

export async function verifyEmail(email: string, code: string): Promise<{ verified: boolean }> {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new NotFoundError('User');
  }
  await verifyOtp(email.toLowerCase(), 'EMAIL_VERIFICATION', code);
  await userRepository.markEmailVerified(String(user._id));
  return { verified: true };
}

export async function requestPhoneVerification(
  userId: string,
  phone: string,
): Promise<{ sent: boolean }> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User');
  }
  return requestOtp(phone, 'PHONE_VERIFICATION', { recipientName: user.name });
}

export async function verifyPhone(
  userId: string,
  phone: string,
  code: string,
): Promise<{ verified: boolean }> {
  await verifyOtp(phone, 'PHONE_VERIFICATION', code);
  await userRepository.markPhoneVerified(userId, phone);
  return { verified: true };
}

export async function forgotPassword(email: string): Promise<{ sent: boolean }> {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    return { sent: true };
  }
  return requestOtp(email.toLowerCase(), 'PASSWORD_RESET', { recipientName: user.name });
}

export async function resetPassword(
  email: string,
  code: string,
  password: string,
): Promise<{ reset: boolean }> {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new NotFoundError('User');
  }
  await verifyOtp(email.toLowerCase(), 'PASSWORD_RESET', code);
  const passwordHash = await hashPassword(password);
  await userRepository.setPassword(String(user._id), passwordHash);
  await revokeAllSessions(String(user._id));
  return { reset: true };
}
