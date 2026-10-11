import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { requireAdmin, requireModerator } from '../../../middleware/authorize';
import { validateBody, validateQuery } from '../../../middleware/validate';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import * as controller from '../controllers/users.controller';
import {
  updateProfileSchema,
  adminUserQuerySchema,
  setUserStatusSchema,
  setUserRoleSchema,
} from '../schemas/users.schema';

/**
 * /api/v1/users
 */
export const usersRouter = Router();

// Authenticated user's own profile
usersRouter.get('/me', authenticate, asyncHandler(controller.getMe));
usersRouter.patch(
  '/me',
  authenticate,
  validateBody(updateProfileSchema),
  asyncHandler(controller.updateMe),
);

// Public profile (anyone can view)
usersRouter.get('/:userId', asyncHandler(controller.getPublicProfile));

// Admin routes
usersRouter.get(
  '/',
  authenticate,
  requireModerator,
  validateQuery(adminUserQuerySchema),
  asyncHandler(controller.listUsers),
);

usersRouter.patch(
  '/:userId/status',
  authenticate,
  requireModerator,
  validateBody(setUserStatusSchema),
  asyncHandler(controller.setUserStatus),
);

usersRouter.patch(
  '/:userId/role',
  authenticate,
  requireAdmin,
  validateBody(setUserRoleSchema),
  asyncHandler(controller.setUserRole),
);
