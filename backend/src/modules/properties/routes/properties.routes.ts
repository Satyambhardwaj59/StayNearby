import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../../middleware/authenticate';
import { requireOwner, requireModerator } from '../../../middleware/authorize';
import { limiters } from '../../../middleware/rateLimit';
import { validateBody, validateQuery } from '../../../middleware/validate';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import * as controller from '../controllers/property.controller';
import {
  createPropertySchema,
  updatePropertySchema,
  nearbyQuerySchema,
  propertiesQuerySchema,
  moderatePropertySchema,
} from '../schemas/property.schema';

/**
 * /api/v1/properties
 */
export const propertiesRouter = Router();

// Public
propertiesRouter.get('/nearby', validateQuery(nearbyQuerySchema), asyncHandler(controller.getNearbyProperties));

// Owner — MUST be declared before the `/:slug` catch-all, otherwise Express
// matches `/mine` against `/:slug` and returns a misleading 404.
propertiesRouter.get(
  '/mine',
  authenticate,
  requireOwner,
  validateQuery(propertiesQuerySchema),
  asyncHandler(controller.listMyProperties),
);

propertiesRouter.get('/:slug', optionalAuthenticate, asyncHandler(controller.getPropertyBySlug));

propertiesRouter.post(
  '/',
  authenticate,
  requireOwner,
  limiters.propertyWrite(),
  validateBody(createPropertySchema),
  asyncHandler(controller.createProperty),
);

propertiesRouter.patch(
  '/:propertyId',
  authenticate,
  requireOwner,
  validateBody(updatePropertySchema),
  asyncHandler(controller.updateProperty),
);

propertiesRouter.post(
  '/:propertyId/submit',
  authenticate,
  requireOwner,
  asyncHandler(controller.submitForReview),
);

propertiesRouter.post(
  '/id/:propertyId/reserve',
  authenticate,
  asyncHandler(controller.reserveProperty),
);

propertiesRouter.delete(
  '/:propertyId',
  authenticate,
  asyncHandler(controller.deactivateProperty),
);

// Moderator / Admin
propertiesRouter.post(
  '/:propertyId/publish',
  authenticate,
  requireModerator,
  asyncHandler(controller.publishProperty),
);

propertiesRouter.post(
  '/:propertyId/reject',
  authenticate,
  requireModerator,
  validateBody(moderatePropertySchema),
  asyncHandler(controller.rejectProperty),
);

propertiesRouter.get(
  '/id/:propertyId',
  authenticate,
  requireModerator,
  asyncHandler(controller.getPropertyById),
);
