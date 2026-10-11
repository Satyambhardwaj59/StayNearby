import { Router } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { validateQuery } from '../../../middleware/validate';
import { optionalAuthenticate } from '../../../middleware/authenticate';
import { searchQuerySchema, mapQuerySchema } from '../schemas/search.schema';
import * as controller from '../controllers/search.controller';

export const searchRouter = Router();

// Optional auth so results can be decorated with the viewer's saved state.
searchRouter.get(
  '/',
  optionalAuthenticate,
  validateQuery(searchQuerySchema),
  asyncHandler(controller.search),
);
searchRouter.get('/map', validateQuery(mapQuerySchema), asyncHandler(controller.mapSearch));
