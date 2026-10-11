import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import * as controller from '../controllers/messages.controller';

export const messagesRouter = Router();

messagesRouter.use(authenticate);

messagesRouter.get('/', asyncHandler(controller.listMessages));
messagesRouter.post('/', asyncHandler(controller.sendMessage));
messagesRouter.post('/mark-read', asyncHandler(controller.markRead));
