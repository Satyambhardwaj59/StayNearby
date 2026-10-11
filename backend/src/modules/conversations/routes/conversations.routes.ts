import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import * as controller from '../controllers/conversations.controller';

export const conversationsRouter = Router();

conversationsRouter.use(authenticate);

conversationsRouter.get('/', asyncHandler(controller.listConversations));
conversationsRouter.post('/', asyncHandler(controller.getOrCreateConversation));
conversationsRouter.get('/:id', asyncHandler(controller.getConversation));
