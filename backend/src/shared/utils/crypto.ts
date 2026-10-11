import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';
import { env } from '../../config/env';

/** URL-safe short id used to make stored file names unique. */
export function shortId(length = 8): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Keyed hash used to store tokens/OTPs at rest. */
export function hmac(value: string): string {
  return createHmac('sha256', env.TOKEN_HASH_SECRET).update(value).digest('hex');
}

/** Cryptographically-random numeric code (OTP). Never logged or returned. */
export function numericCode(digits = 6): string {
  const max = 10 ** digits;
  return String(randomInt(0, max)).padStart(digits, '0');
}

export function randomToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}
