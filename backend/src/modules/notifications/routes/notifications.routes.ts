import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import * as controller from '../controllers/notifications.controller';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get('/', asyncHandler(controller.listNotifications));
notificationsRouter.post('/read-all', asyncHandler(controller.markAllAsRead));
notificationsRouter.patch('/:id/read', asyncHandler(controller.markAsRead));
notificationsRouter.delete('/:id', asyncHandler(controller.deleteNotification));
