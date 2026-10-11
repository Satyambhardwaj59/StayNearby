import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app';

/**
 * Regression tests for the API fixes.
 *
 * These run without MongoDB or Redis (the model layer is never reached because
 * every request is rejected by auth or routing first), so they are safe in CI.
 */

let app: Express;

beforeAll(() => {
  app = createApp();
});

describe('favourites endpoints require authentication', () => {
  it('rejects listing saved properties without a session', async () => {
    const response = await request(app).get('/api/v1/favorites').expect(401);
    expect(response.body).toMatchObject({ success: false });
    expect(response.body.error.code).toBeTruthy();
  });

  it('rejects saving without a session', async () => {
    const response = await request(app)
      .post('/api/v1/favorites/64b7f1c2c2c2c2c2c2c2c2c2')
      .expect(401);
    expect(response.body.success).toBe(false);
  });

  it('rejects unsaving without a session', async () => {
    const response = await request(app)
      .delete('/api/v1/favorites/64b7f1c2c2c2c2c2c2c2c2c2')
      .expect(401);
    expect(response.body.success).toBe(false);
  });

  it('answers the public check endpoint with isFavorited=false when anonymous', async () => {
    const response = await request(app)
      .get('/api/v1/favorites/check/64b7f1c2c2c2c2c2c2c2c2c2')
      .expect(200);
    expect(response.body).toMatchObject({ success: true, data: { isFavorited: false } });
  });
});

describe('route ordering', () => {
  it('does not shadow /properties/mine behind /properties/:slug', async () => {
    // Before the fix this matched the `/:slug` handler and returned 404. The
    // owner route runs `authenticate` first, so an anonymous request is 401.
    const response = await request(app).get('/api/v1/properties/mine');
    expect(response.status).toBe(401);
    expect(response.status).not.toBe(404);
  });
});
