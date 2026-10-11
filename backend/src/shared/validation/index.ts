import type { ZodError } from 'zod';
import type { ErrorDetail } from '../errors';

/** ObjectId-shaped string (24 hex chars). */
export const objectIdSchema = /^[a-f0-9]{24}$/i;

/** Converts a Zod error into the API's field-level error detail shape. */
export function zodIssuesToDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || undefined,
    message: issue.message,
  }));
}
