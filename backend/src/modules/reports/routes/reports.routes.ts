import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { requireModerator } from '../../../middleware/authorize';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import * as controller from '../controllers/reports.controller';

export const reportsRouter = Router();

reportsRouter.use(authenticate);

// Public authenticated users can report
reportsRouter.post('/', asyncHandler(controller.createReport));

// Moderators and admins can view and update reports
reportsRouter.get('/', requireModerator, asyncHandler(controller.listReports));
reportsRouter.patch('/:id/status', requireModerator, asyncHandler(controller.updateReportStatus));
