import { describe, expect, it } from 'vitest';
import {
  buildOffsetMeta,
  decodeCursor,
  encodeCursor,
  offsetPaginationSchema,
} from '../../src/shared/pagination';
import { ValidationError } from '../../src/shared/errors';

describe('offset pagination', () => {
  it('applies defaults', () => {
    const parsed = offsetPaginationSchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
  });

  it('coerces string query values', () => {
    const parsed = offsetPaginationSchema.parse({ page: '3', limit: '10' });
    expect(parsed).toEqual({ page: 3, limit: 10 });
  });

  it('rejects limits above the maximum', () => {
    expect(offsetPaginationSchema.safeParse({ limit: '500' }).success).toBe(false);
  });

  it('builds page metadata with has-next/has-previous flags', () => {
    expect(buildOffsetMeta(45, 2, 20)).toMatchObject({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });

    expect(buildOffsetMeta(45, 3, 20)).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
    });

    expect(buildOffsetMeta(0, 1, 20)).toMatchObject({
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });
});

describe('cursor pagination', () => {
  it('round-trips a cursor payload', () => {
    const cursor = encodeCursor({ id: 'abc123', sort: '2026-01-01T00:00:00.000Z' });
    expect(decodeCursor(cursor)).toEqual({ id: 'abc123', sort: '2026-01-01T00:00:00.000Z' });
  });

  it('throws a validation error for a malformed cursor', () => {
    expect(() => decodeCursor('not-a-cursor')).toThrow(ValidationError);
  });
});
