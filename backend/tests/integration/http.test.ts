import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app';

/**
 * HTTP contract tests. These exercise the middleware pipeline (security headers,
 * CORS, CSRF, error envelope, 404 handling) without MongoDB or Redis, so they
 * run anywhere — including CI without services.
 */

let app: Express;

beforeAll(() => {
  app = createApp();
});

describe('health endpoints', () => {
  it('reports liveness without touching dependencies', async () => {
    const response = await request(app).get('/health/live').expect(200);
    expect(response.body).toMatchObject({ status: 'ok' });
    expect(typeof response.body.uptimeSeconds).toBe('number');
  });

  it('reports readiness with per-dependency status', async () => {
    const response = await request(app).get('/health/ready');
    expect([200, 503]).toContain(response.status);
    expect(response.body.dependencies).toHaveProperty('database');
    expect(response.body.dependencies).toHaveProperty('redis');
  });
});

describe('response envelope', () => {
  it('returns the documented error envelope for unknown routes', async () => {
    const response = await request(app).get('/api/v1/definitely-not-a-route').expect(404);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    });
    expect(response.body.error.requestId).toBeDefined();
  });

  it('never leaks stack traces', async () => {
    const response = await request(app).get('/api/v1/definitely-not-a-route');
    expect(JSON.stringify(response.body)).not.toMatch(/at .*\.ts:/);
  });

  it('rejects malformed JSON bodies with BAD_REQUEST', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ')
      .expect(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });
});

describe('CSRF protection', () => {
  it('blocks cookie-authenticated writes that carry no origin', async () => {
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', 'rm_access_token=whatever')
      .expect(403);
    expect(response.body.error.code).toBe('AUTHORIZATION_DENIED');
  });

  it('blocks cookie-authenticated writes from an unknown origin', async () => {
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', 'rm_access_token=whatever')
      .set('Origin', 'https://evil.example.com')
      .expect(403);
    expect(response.body.error.code).toBe('AUTHORIZATION_DENIED');
  });
});

describe('security headers', () => {
  it('sets the hardening headers expected by the acceptance checklist', async () => {
    const response = await request(app).get('/health/live');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('rejects requests from origins outside the allowlist', async () => {
    const response = await request(app)
      .get('/health/live')
      .set('Origin', 'https://evil.example.com')
      .expect(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('AUTHORIZATION_DENIED');
  });
});
