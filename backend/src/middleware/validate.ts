import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { ValidationError } from '../shared/errors';
import { zodIssuesToDetails } from '../shared/validation';

/**
 * Request validation boundary. Controllers only ever see parsed, typed data:
 * unknown keys are stripped by Zod's default object behaviour, which also acts
 * as the mass-assignment guard for request bodies.
 */

type Source = 'body' | 'query' | 'params';

function assignParsed(req: Request, source: Source, value: unknown): void {
  if (source === 'query') {
    // Express defines `query` as a getter; define an own property to override it.
    Object.defineProperty(req, 'query', {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    return;
  }
  req[source] = value as never;
}

function makeValidator(source: Source) {
  return <T>(schema: ZodType<T>): RequestHandler => {
    return (req: Request, _res: Response, next: NextFunction) => {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        next(new ValidationError(`Invalid request ${source}`, zodIssuesToDetails(result.error)));
        return;
      }
      assignParsed(req, source, result.data);
      next();
    };
  };
}

export const validateBody = makeValidator('body');
export const validateQuery = makeValidator('query');
export const validateParams = makeValidator('params');

/** Validates several sources at once when a handler needs more than one. */
export function validateRequest(schemas: {
  body?: ZodType<unknown>;
  query?: ZodType<unknown>;
  params?: ZodType<unknown>;
}): RequestHandler[] {
  const handlers: RequestHandler[] = [];
  if (schemas.params) handlers.push(makeValidator('params')(schemas.params));
  if (schemas.query) handlers.push(makeValidator('query')(schemas.query));
  if (schemas.body) handlers.push(makeValidator('body')(schemas.body));
  return handlers;
}
