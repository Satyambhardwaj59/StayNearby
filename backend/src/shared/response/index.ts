import type { Response } from 'express';
import type { ErrorCode, ErrorDetail } from '../errors';

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  nextCursor?: string | null;
  hasMore?: boolean;
}

export interface ResponseMeta extends PaginationMeta {
  requestId?: string;
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message: string;
  meta: ResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
    requestId?: string;
  };
}

export interface SendSuccessOptions {
  status?: number;
  message?: string;
  meta?: ResponseMeta;
  headers?: Record<string, string>;
}

/** Every successful response leaves the API through this helper. */
export function sendSuccess<T>(
  res: Response,
  data: T,
  options: SendSuccessOptions = {},
): Response<ApiSuccessResponse<T>> {
  if (options.headers) {
    for (const [name, value] of Object.entries(options.headers)) {
      res.setHeader(name, value);
    }
  }

  const meta: ResponseMeta = { ...(options.meta ?? {}) };
  if (res.locals.requestId && meta.requestId === undefined) {
    meta.requestId = String(res.locals.requestId);
  }

  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    message: options.message ?? 'Success',
    meta,
  };

  return res.status(options.status ?? 200).json(body);
}

export function sendCreated<T>(
  res: Response,
  data: T,
  message = 'Created',
  meta?: ResponseMeta,
): Response<ApiSuccessResponse<T>> {
  return sendSuccess(res, data, { status: 201, message, meta });
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

export function sendError(
  res: Response,
  error: { code: ErrorCode; message: string; details?: ErrorDetail[] },
  statusCode = 400,
): Response<ApiErrorResponse> {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && error.details.length > 0 ? { details: error.details } : {}),
      ...(res.locals.requestId ? { requestId: String(res.locals.requestId) } : {}),
    },
  };
  return res.status(statusCode).json(body);
}
