import type { NextFunction, Request, Response } from 'express';
import { isPlainObject } from '../shared/utils/object';

/**
 * Defence-in-depth against NoSQL operator injection and prototype pollution.
 *
 * Zod validation strips unknown keys and enforces primitive types, but it only
 * runs on routes with an explicit schema. This middleware is the request-boundary
 * defence against NoSQL operator injection, applied to every request: it removes
 * keys starting with `$`, dotted keys, and `__proto__`/`constructor`/`prototype`
 * anywhere in body, params and query. (Mongoose's `sanitizeFilter` is therefore
 * not enabled — it also mangles legitimate internal operator filters.)
 */

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 12) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.') || FORBIDDEN_KEYS.has(key)) {
        continue;
      }
      const sanitized = sanitizeValue(nested, depth + 1);
      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }
    return result;
  }

  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    return undefined;
  }

  return value;
}

function replaceQuery(req: Request, value: unknown): void {
  Object.defineProperty(req, 'query', {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

export function sanitizeRequest(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params) as Request['params'];
  }

  if (req.query && typeof req.query === 'object') {
    replaceQuery(req, sanitizeValue(req.query));
  }

  next();
}
