import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { requireAdmin, requireModerator } from '../../../middleware/authorize';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import * as controller from '../controllers/admin.controller';

export const adminRouter = Router();

adminRouter.use(authenticate);

// Moderators and admins can view moderation queue
adminRouter.get('/moderation-queue', requireModerator, asyncHandler(controller.getModerationQueue));

// Admin-only metrics and health
adminRouter.get('/stats', requireAdmin, asyncHandler(controller.getDashboardStats));
adminRouter.get('/health', requireAdmin, asyncHandler(controller.getSystemHealth));
