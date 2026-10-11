import type { Request, Response } from 'express';
import { AuthenticationError } from '../../../shared/errors';
import { REFRESH_TOKEN_COOKIE } from '../../../config/env';
import { sendCreated, sendSuccess } from '../../../shared/response';
import { getMyProfile } from '../../users/services/user.service';
import * as authService from '../services/auth.service';
import * as sessionService from '../services/session.service';
import { clearAuthCookies, setAuthCookies } from '../utils/cookies';

function sessionMeta(req: Request): authService.SessionMeta {
  return { userAgent: req.get('user-agent') ?? null, ip: req.ip ?? null };
}

/** Session payload sent to the client — the refresh token is cookie-only. */
function sessionResponse(result: authService.AuthResult) {
  return { user: result.user, sessionId: result.sessionId, accessToken: result.accessToken };
}

function refreshTokenFrom(req: Request): string {
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[REFRESH_TOKEN_COOKIE];
  const fromBody = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
  const token = fromCookie ?? fromBody;
  if (!token) {
    throw new AuthenticationError('Refresh token missing', 'TOKEN_INVALID');
  }
  return token;
}

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(
    req.body as Parameters<typeof authService.register>[0],
    sessionMeta(req),
  );
  setAuthCookies(res, { accessToken: result.accessToken, refreshToken: result.refreshToken });
  sendCreated(res, sessionResponse(result), 'Account created');
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(
    req.body as Parameters<typeof authService.login>[0],
    sessionMeta(req),
  );
  setAuthCookies(res, { accessToken: result.accessToken, refreshToken: result.refreshToken });
  sendSuccess(res, sessionResponse(result), { message: 'Signed in' });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const result = await authService.refresh(refreshTokenFrom(req), sessionMeta(req));
  setAuthCookies(res, { accessToken: result.accessToken, refreshToken: result.refreshToken });
  sendSuccess(res, sessionResponse(result));
}

export async function logout(req: Request, res: Response): Promise<void> {
  const result = await authService.logout(req.user?.sessionId ?? '');
  clearAuthCookies(res);
  sendSuccess(res, result, { message: 'Signed out' });
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  const result = await authService.logoutAll(req.user?.userId ?? '');
  clearAuthCookies(res);
  sendSuccess(res, result, { message: 'Signed out everywhere' });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await getMyProfile(req.user?.userId ?? '');
  sendSuccess(res, { user });
}

export async function listSessions(req: Request, res: Response): Promise<void> {
  const sessions = await sessionService.listSessions(
    req.user?.userId ?? '',
    req.user?.sessionId,
  );
  sendSuccess(res, { sessions });
}

export async function revokeSession(req: Request, res: Response): Promise<void> {
  const { sessionId } = req.body as { sessionId: string };
  const result = await sessionService.revokeUserSession(req.user?.userId ?? '', sessionId);
  sendSuccess(res, result, { message: 'Session revoked' });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };
  const result = await authService.changePassword(
    req.user?.userId ?? '',
    currentPassword,
    newPassword,
  );
  sendSuccess(res, result, { message: 'Password updated' });
}

export async function requestEmailVerification(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  const result = await authService.requestEmailVerification(email);
  sendSuccess(res, result, { message: 'If the account exists, a code has been sent' });
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { email, code } = req.body as { email: string; code: string };
  const result = await authService.verifyEmail(email, code);
  sendSuccess(res, result, { message: 'Email verified' });
}

export async function requestPhoneVerification(req: Request, res: Response): Promise<void> {
  const { phone } = req.body as { phone: string };
  const result = await authService.requestPhoneVerification(req.user?.userId ?? '', phone);
  sendSuccess(res, result, { message: 'Code sent' });
}

export async function verifyPhone(req: Request, res: Response): Promise<void> {
  const { phone, code } = req.body as { phone: string; code: string };
  const result = await authService.verifyPhone(req.user?.userId ?? '', phone, code);
  sendSuccess(res, result, { message: 'Phone verified' });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  const result = await authService.forgotPassword(email);
  sendSuccess(res, result, { message: 'If the account exists, a code has been sent' });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { email, code, password } = req.body as { email: string; code: string; password: string };
  const result = await authService.resetPassword(email, code, password);
  sendSuccess(res, result, { message: 'Password reset' });
}
