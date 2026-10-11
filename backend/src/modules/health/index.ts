import { Router } from 'express';
import { health, liveness, readiness } from './health.controller';

/** Health probes. Mounted at the application root, not under /api/v1. */
export const healthRouter = Router();

healthRouter.get('/health', health);
healthRouter.get('/health/live', liveness);
healthRouter.get('/health/ready', readiness);
