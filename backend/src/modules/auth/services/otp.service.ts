import { timingSafeEqual } from 'node:crypto';
import { AuthenticationError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { hmac, numericCode } from '../../../shared/utils/crypto';
import { QUEUE_NAMES, enqueue } from '../../../infrastructure/queue/queue';
import type { OtpPurpose } from '../models/otp.model';
import { otpRepository } from '../repositories/otp.repository';

/** One-time codes: hashed at rest, single-use, expiring and attempt-capped. */

const OTP_TTL_MS = 10 * 60 * 1_000;
const MAX_ATTEMPTS = 5;

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

export async function requestOtp(
  subject: string,
  purpose: OtpPurpose,
  meta: { recipientName?: string } = {},
): Promise<{ sent: boolean }> {
  const code = numericCode(6);
  await otpRepository.issue({
    subject,
    purpose,
    codeHash: hmac(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  // Delivery is queued so the request stays fast. The code is never returned.
  const jobId = await enqueue(QUEUE_NAMES.email, 'deliver-otp', {
    identifier: subject,
    code,
    purpose,
    ...(meta.recipientName ? { recipientName: meta.recipientName } : {}),
  });

  if (!jobId) {
    logger.warn({ purpose }, 'otp queued not delivered (redis unavailable, degraded mode)');
  }

  return { sent: true };
}

export async function verifyOtp(
  subject: string,
  purpose: OtpPurpose,
  code: string,
): Promise<void> {
  const otp = await otpRepository.findLatestActive(subject, purpose);
  if (!otp) {
    throw new AuthenticationError('The code is invalid or has expired', 'OTP_INVALID');
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    throw new AuthenticationError('Too many attempts. Request a new code.', 'OTP_ATTEMPTS_EXCEEDED');
  }

  if (!safeEqual(hmac(code), otp.codeHash)) {
    await otpRepository.incrementAttempts(String(otp._id));
    throw new AuthenticationError('The code is invalid or has expired', 'OTP_INVALID');
  }

  await otpRepository.consume(String(otp._id));
}
