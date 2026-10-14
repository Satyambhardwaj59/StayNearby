import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { FavoriteModel } from '../models/favorite.model';
import { PropertyModel } from '../../properties/models/property.model';
import { toPropertyCard } from '../../properties/services/property.service';
import { BadRequestError, NotFoundError } from '../../../shared/errors';
import { sendSuccess, sendCreated, sendNoContent } from '../../../shared/response';
import { buildOffsetMeta } from '../../../shared/pagination';

/** A saved property only appears while it is still publicly viewable. */
const VISIBLE_LISTING_STATUSES = ['PUBLISHED', 'RESERVED', 'RENTED'] as const;

function toObjectId(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

/**
 * List the authenticated user's saved properties.
 *
 * Uses an aggregation so the listing-status filter runs in MongoDB (with
 * indexes) rather than in application memory, and serialises each populated
 * property to the public card shape — never the raw document.
 */
export async function listFavorites(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');

  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const skip = (page - 1) * limit;
  const userObjectId = toObjectId(userId);

  const [rows, countResult] = await Promise.all([
    FavoriteModel.aggregate<{ createdAt: Date; property: Record<string, unknown> }>([
      { $match: { userId: userObjectId } },
      {
        $lookup: {
          from: PropertyModel.collection.name,
          localField: 'propertyId',
          foreignField: '_id',
          as: 'property',
        },
      },
      // Deleted properties are dropped here (graceful handling of stale favorites).
      { $unwind: '$property' },
      { $match: { 'property.listingStatus': { $in: VISIBLE_LISTING_STATUSES } } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { createdAt: 1, property: 1 } },
    ]).exec(),
    FavoriteModel.aggregate<{ total: number }>([
      { $match: { userId: userObjectId } },
      {
        $lookup: {
          from: PropertyModel.collection.name,
          localField: 'propertyId',
          foreignField: '_id',
          as: 'property',
        },
      },
      { $unwind: '$property' },
      { $match: { 'property.listingStatus': { $in: VISIBLE_LISTING_STATUSES } } },
      { $count: 'total' },
    ]).exec(),
  ]);

  const items = rows.map((row) => ({
    ...toPropertyCard(row.property),
    isFavorited: true,
  }));
  const total = countResult[0]?.total ?? 0;

  return sendSuccess(res, items, { meta: buildOffsetMeta(total, page, limit) });
}

/**
 * Just the ids of the authenticated user's saved properties.
 *
 * The client-side favourites store only needs to know which ids are saved, so
 * this projection returns ids alone — no property lookup, no card serialisation
 * — sorted newest first and capped so a runaway account cannot stream an
 * unbounded list.
 */
export async function listFavoriteIds(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');

  const rows = await FavoriteModel.find({ userId: toObjectId(userId) })
    .select('propertyId')
    .sort({ createdAt: -1 })
    .limit(2000)
    .lean()
    .exec();

  return sendSuccess(res, { ids: rows.map((row) => String(row.propertyId)) });
}

export async function addFavorite(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');
  const propertyId = String(req.params.propertyId);

  if (!Types.ObjectId.isValid(propertyId)) {
    throw new BadRequestError('Invalid property ID');
  }

  const property = await PropertyModel.findById(propertyId).select('listingStatus').lean().exec();
  if (!property || !VISIBLE_LISTING_STATUSES.includes(property.listingStatus as never)) {
    throw new NotFoundError('Property');
  }

  const userObjectId = toObjectId(userId);
  const propertyObjectId = toObjectId(propertyId);

  // Idempotent upsert prevents duplicate favorites even under concurrent taps.
  let created = false;
  try {
    const result = await FavoriteModel.updateOne(
      { userId: userObjectId, propertyId: propertyObjectId },
      { $setOnInsert: { userId: userObjectId, propertyId: propertyObjectId } },
      { upsert: true },
    ).exec();
    created = result.upsertedCount > 0;
  } catch (error) {
    // A concurrent insert won the race; that still counts as "saved".
    if ((error as { code?: number }).code !== 11_000) {
      throw error;
    }
  }

  if (created) {
    await PropertyModel.updateOne(
      { _id: propertyObjectId },
      { $inc: { favoritesCount: 1 } },
    ).exec();
  }

  return sendCreated(res, { favorited: true, created });
}

export async function removeFavorite(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');
  const propertyId = String(req.params.propertyId);

  if (!Types.ObjectId.isValid(propertyId)) {
    throw new BadRequestError('Invalid property ID');
  }

  const propertyObjectId = toObjectId(propertyId);
  const deleted = await FavoriteModel.findOneAndDelete({
    userId: toObjectId(userId),
    propertyId: propertyObjectId,
  }).exec();

  if (deleted) {
    await PropertyModel.updateOne(
      { _id: propertyObjectId, favoritesCount: { $gt: 0 } },
      { $inc: { favoritesCount: -1 } },
    ).exec();
  }

  // Idempotent: unsaving something that was never saved is a success.
  return sendNoContent(res);
}

export async function checkFavorite(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) return sendSuccess(res, { isFavorited: false });
  const propertyId = String(req.params.propertyId);

  if (!Types.ObjectId.isValid(propertyId)) {
    return sendSuccess(res, { isFavorited: false });
  }

  const exists = await FavoriteModel.exists({
    userId: toObjectId(userId),
    propertyId: toObjectId(propertyId),
  });

  return sendSuccess(res, { isFavorited: Boolean(exists) });
}
