import { z } from 'zod';
import { ValidationError } from '../errors';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 60;

/** Shared offset query contract used by list endpoints. */
export const offsetPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const cursorPaginationSchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type OffsetPagination = z.infer<typeof offsetPaginationSchema>;
export type CursorPagination = z.infer<typeof cursorPaginationSchema>;

export interface OffsetPageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  [key: string]: unknown;
}

export function buildOffsetMeta(total: number, page: number, limit: number): OffsetPageMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && total > 0,
  };
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface CursorPayload {
  id: string;
  sort?: string | number;
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as CursorPayload).id !== 'string'
    ) {
      throw new Error('malformed cursor');
    }
    return parsed as CursorPayload;
  } catch {
    throw new ValidationError('Invalid pagination cursor', [
      { field: 'cursor', message: 'Cursor is not valid or has expired' },
    ]);
  }
}
