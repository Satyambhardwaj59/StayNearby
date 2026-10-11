import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ReviewModel } from '../models/review.model';
import { PropertyModel } from '../../properties/models/property.model';
import { BadRequestError, NotFoundError, AuthorizationError } from '../../../shared/errors';
import { sendSuccess, sendCreated, sendNoContent } from '../../../shared/response';

export async function getPropertyReviews(req: Request, res: Response): Promise<Response> {
  const propertyId = String(req.params.propertyId);

  if (!Types.ObjectId.isValid(propertyId)) {
    throw new BadRequestError('Invalid property ID');
  }

  const reviews = await ReviewModel.find({
    propertyId: new Types.ObjectId(propertyId),
    status: 'APPROVED',
  })
    .sort({ createdAt: -1 })
    .populate('userId', 'name avatar')
    .lean()
    .exec();

  const total = reviews.length;
  const avgRating = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;

  return sendSuccess(res, {
    reviews,
    stats: {
      total,
      avgRating: Math.round(avgRating * 10) / 10,
    },
  });
}

export async function createReview(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');

  const { propertyId, rating, comment } = req.body;

  if (!propertyId || !Types.ObjectId.isValid(propertyId)) {
    throw new BadRequestError('Valid propertyId is required');
  }

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    throw new BadRequestError('Rating must be between 1 and 5');
  }

  if (!comment || typeof comment !== 'string' || comment.trim().length < 5) {
    throw new BadRequestError('Comment must be at least 5 characters');
  }

  const property = await PropertyModel.findById(propertyId).lean().exec();
  if (!property) {
    throw new NotFoundError('Property not found');
  }

  if (property.ownerId.toString() === userId) {
    throw new BadRequestError('You cannot review your own property');
  }

  const existing = await ReviewModel.findOne({
    propertyId: new Types.ObjectId(propertyId),
    userId: new Types.ObjectId(userId),
  });

  if (existing) {
    throw new BadRequestError('You have already reviewed this property');
  }

  const review = await ReviewModel.create({
    propertyId: new Types.ObjectId(propertyId),
    userId: new Types.ObjectId(userId),
    rating,
    comment: comment.trim(),
    status: 'APPROVED',
  });

  const populated = await ReviewModel.findById(review._id)
    .populate('userId', 'name avatar')
    .lean()
    .exec();

  return sendCreated(res, populated);
}

export async function deleteReview(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');
  const id = String(req.params.id);

  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError('Invalid review ID');
  }

  const review = await ReviewModel.findById(id).exec();
  if (!review) {
    throw new NotFoundError('Review not found');
  }

  if (review.userId.toString() !== userId && req.user?.role !== 'ADMIN') {
    throw new AuthorizationError('You do not have permission to delete this review');
  }

  await ReviewModel.deleteOne({ _id: review._id });
  return sendNoContent(res);
}
