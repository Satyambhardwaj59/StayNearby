import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import * as controller from '../controllers/visits.controller';

export const visitsRouter = Router();

visitsRouter.use(authenticate);

visitsRouter.get('/', asyncHandler(controller.listVisits));
visitsRouter.post('/', asyncHandler(controller.requestVisit));
visitsRouter.patch('/:id/status', asyncHandler(controller.updateVisitStatus));
