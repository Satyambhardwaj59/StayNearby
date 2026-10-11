import type { ApiErrorBody } from './types';

/** Error raised for any non-2xx API response, carrying the backend error code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Array<{ field?: string; message: string }>;
  readonly requestId?: string;

  constructor(
    status: number,
    body: {
      code: string;
      message: string;
      details?: Array<{ field?: string; message: string }>;
      requestId?: string;
    },
  ) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details ?? [];
    if (body.requestId) {
      this.requestId = body.requestId;
    }
  }

  get isValidation(): boolean {
    return this.code === 'VALIDATION_ERROR';
  }

  get isAuth(): boolean {
    return this.status === 401 || this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isNetwork(): boolean {
    return this.code === 'NETWORK_ERROR';
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function networkError(): ApiError {
  return new ApiError(0, {
    code: 'NETWORK_ERROR',
    message: 'We could not reach the server. Check your connection and try again.',
  });
}

export function toApiError(status: number, payload: unknown): ApiError {
  const body = payload as ApiErrorBody | undefined;
  if (body && body.success === false && body.error) {
    return new ApiError(status, body.error);
  }
  return new ApiError(status, {
    code: status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
    message:
      status >= 500
        ? 'Something went wrong on our side. Please try again.'
        : 'The request could not be completed.',
  });
}

/** Field-level errors keyed by form field, for react-hook-form. */
export function fieldErrors(error: ApiError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const detail of error.details) {
    if (detail.field) {
      result[detail.field] = detail.message;
    }
  }
  return result;
}
