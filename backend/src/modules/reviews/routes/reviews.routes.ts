import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import * as controller from '../controllers/reviews.controller';

export const reviewsRouter = Router();

reviewsRouter.get('/property/:propertyId', asyncHandler(controller.getPropertyReviews));
reviewsRouter.post('/', authenticate, asyncHandler(controller.createReview));
reviewsRouter.delete('/:id', authenticate, asyncHandler(controller.deleteReview));
