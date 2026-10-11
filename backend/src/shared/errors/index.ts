/**
 * Centralised error taxonomy.
 *
 * Every error that can reach the client is represented here so that HTTP status
 * codes and machine-readable `error.code` values stay consistent across modules.
 * Stack traces are only ever surfaced through the logger, never the response.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'AUTHENTICATION_REQUIRED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'EMAIL_NOT_VERIFIED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_LOCKED'
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'OTP_ATTEMPTS_EXCEEDED'
  | 'AUTHORIZATION_DENIED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'INTERNAL_ERROR';

export interface ErrorDetail {
  field?: string;
  message: string;
  [key: string]: unknown;
}

export interface AppErrorOptions {
  code?: ErrorCode;
  statusCode?: number;
  details?: ErrorDetail[];
  /** Set when the message is safe to expose verbatim to clients. */
  expose?: boolean;
  cause?: unknown;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details: ErrorDetail[];
  public readonly expose: boolean;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.statusCode = options.statusCode ?? 500;
    this.details = options.details ?? [];
    this.expose = options.expose ?? this.statusCode < 500;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details: ErrorDetail[] = []) {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 422, details });
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details: ErrorDetail[] = []) {
    super(message, { code: 'BAD_REQUEST', statusCode: 400, details });
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code: ErrorCode = 'AUTHENTICATION_REQUIRED') {
    super(message, { code, statusCode: 401 });
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You are not allowed to perform this action') {
    super(message, { code: 'AUTHORIZATION_DENIED', statusCode: 403 });
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, { code: 'NOT_FOUND', statusCode: 404 });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details: ErrorDetail[] = []) {
    super(message, { code: 'CONFLICT', statusCode: 409, details });
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, { code: 'RATE_LIMITED', statusCode: 429 });
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, cause?: unknown) {
    super(`Upstream service unavailable: ${service}`, {
      code: 'EXTERNAL_SERVICE_ERROR',
      statusCode: 502,
      expose: false,
      cause,
    });
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Uploaded payload is too large') {
    super(message, { code: 'PAYLOAD_TOO_LARGE', statusCode: 413 });
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message = 'Unsupported file type') {
    super(message, { code: 'UNSUPPORTED_MEDIA_TYPE', statusCode: 415 });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
