import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import * as controller from '../controllers/saved-searches.controller';

export const savedSearchesRouter = Router();

savedSearchesRouter.use(authenticate);

savedSearchesRouter.get('/', asyncHandler(controller.listSavedSearches));
savedSearchesRouter.post('/', asyncHandler(controller.createSavedSearch));
savedSearchesRouter.patch('/:id', asyncHandler(controller.updateSavedSearch));
savedSearchesRouter.delete('/:id', asyncHandler(controller.deleteSavedSearch));
