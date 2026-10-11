import type { NextFunction, Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { AppError, isAppError, type ErrorCode, type ErrorDetail } from '../shared/errors';
import { zodIssuesToDetails } from '../shared/validation';
import { logger } from '../shared/logger';
import { sendError } from '../shared/response';
import { isProduction } from '../config/env';

interface NormalizedError {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: ErrorDetail[];
  cause: unknown;
}

function normalize(error: unknown): NormalizedError {
  if (isAppError(error)) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.expose ? error.message : 'Something went wrong. Please try again.',
      details: error.details,
      cause: error,
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: zodIssuesToDetails(error),
      cause: error,
    };
  }

  if (error instanceof MongooseError.ValidationError) {
    return {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: Object.values(error.errors).map((issue) => ({
        field: issue.path,
        message: issue.message,
      })),
      cause: error,
    };
  }

  if (error instanceof MongooseError.CastError) {
    return {
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Invalid value for one or more fields',
      details: [{ field: error.path, message: `Invalid ${error.kind}` }],
      cause: error,
    };
  }

  if (error instanceof multer.MulterError) {
    const isTooLarge = error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_COUNT';
    return {
      statusCode: isTooLarge ? 413 : 400,
      code: isTooLarge ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
      message:
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Uploaded file exceeds the maximum allowed size'
          : 'Upload rejected',
      cause: error,
    };
  }

  if (error instanceof jwt.TokenExpiredError) {
    return { statusCode: 401, code: 'TOKEN_EXPIRED', message: 'Token expired', cause: error };
  }
  if (error instanceof jwt.JsonWebTokenError) {
    return { statusCode: 401, code: 'TOKEN_INVALID', message: 'Invalid token', cause: error };
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return {
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Malformed JSON payload',
      cause: error,
    };
  }

  const mongoError = error as { code?: number; keyValue?: Record<string, unknown> };
  if (mongoError?.code === 11_000) {
    const fields = Object.keys(mongoError.keyValue ?? {});
    return {
      statusCode: 409,
      code: 'CONFLICT',
      message: 'A record with these details already exists',
      details: fields.map((field) => ({ field, message: 'Already in use' })),
      cause: error,
    };
  }

  return {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong. Please try again.',
    cause: error,
  };
}

/** Terminal error middleware. Production responses never contain stack traces. */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  const normalized = normalize(error);
  const logPayload = {
    err: normalized.cause,
    requestId: req.requestId,
    method: req.method,
    route: req.originalUrl,
    statusCode: normalized.statusCode,
    errorCode: normalized.code,
    userId: req.user?.userId,
  };

  if (normalized.statusCode >= 500) {
    logger.error(logPayload, 'request failed');
  } else {
    logger.warn(logPayload, 'request rejected');
  }

  const body: { code: ErrorCode; message: string; details?: ErrorDetail[] } = {
    code: normalized.code,
    message:
      isProduction && normalized.statusCode >= 500 && !isAppError(normalized.cause)
        ? 'Something went wrong. Please try again.'
        : normalized.message,
  };
  if (normalized.details && normalized.details.length > 0) {
    body.details = normalized.details;
  }

  sendError(res, body, normalized.statusCode);
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(
    res,
    { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} does not exist` },
    404,
  );
}

export { AppError };
