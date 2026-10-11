import { Router } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { validateQuery } from '../../../middleware/validate';
import { z } from 'zod';
import * as controller from '../controllers/locations.controller';

export const locationsRouter = Router();

const suggestSchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

const nearbySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().int().min(100).max(50_000).default(5_000),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

locationsRouter.get('/suggest', validateQuery(suggestSchema), asyncHandler(controller.suggest));
locationsRouter.get('/cities', asyncHandler(controller.listCities));
locationsRouter.get('/cities/:city', asyncHandler(controller.getCity));
locationsRouter.get('/nearby', validateQuery(nearbySchema), asyncHandler(controller.nearbyPlaces));
