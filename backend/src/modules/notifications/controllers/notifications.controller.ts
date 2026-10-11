import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { NotificationModel } from '../models/notification.model';
import { BadRequestError, NotFoundError } from '../../../shared/errors';
import { sendSuccess, sendNoContent } from '../../../shared/response';

/**
 * The stored notification types are coarser than the client's presentation
 * types; map them so the UI can pick the right icon without a second lookup.
 */
const CLIENT_TYPE: Record<string, string> = {
  VISIT_REQUEST: 'VISIT_REQUESTED',
  VISIT_UPDATE: 'VISIT_CONFIRMED',
  MESSAGE: 'NEW_MESSAGE',
  LISTING_APPROVED: 'LISTING_APPROVED',
  LISTING_REJECTED: 'LISTING_REJECTED',
  SYSTEM: 'ACCOUNT_UPDATE',
};

function readUrl(data: unknown): string | null {
  if (data && typeof data === 'object' && 'url' in data) {
    const url = (data as { url?: unknown }).url;
    if (typeof url === 'string') return url;
  }
  return null;
}

function readId(data: unknown, key: string): string | null {
  if (data && typeof data === 'object' && key in data) {
    const value = (data as Record<string, unknown>)[key];
    if (value !== null && value !== undefined) return String(value);
  }
  return null;
}

/** Serialises a stored notification to the client contract (`id`, `body`, …). */
function serialize(doc: Record<string, unknown>) {
  return {
    id: String(doc._id),
    type: CLIENT_TYPE[doc.type as string] ?? 'ACCOUNT_UPDATE',
    title: doc.title as string,
    body: doc.message as string,
    data: {
      url: readUrl(doc.data),
      propertyId: readId(doc.data, 'propertyId'),
      conversationId: readId(doc.data, 'conversationId'),
      visitId: readId(doc.data, 'visitId'),
      reportId: readId(doc.data, 'reportId'),
      savedSearchId: readId(doc.data, 'savedSearchId'),
    },
    read: Boolean(doc.read),
    createdAt: doc.createdAt,
  };
}

export async function listNotifications(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');

  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const cursor = req.query.cursor as string | undefined;
  const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
  if (cursor && Types.ObjectId.isValid(cursor)) {
    filter._id = { $lt: new Types.ObjectId(cursor) };
  }

  const items = await NotificationModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec();

  const unreadCount = await NotificationModel.countDocuments({
    userId: new Types.ObjectId(userId),
    read: false,
  }).exec();

  return sendSuccess(res, items.map((item) => serialize(item as Record<string, unknown>)), {
    meta: { limit, unreadCount, hasMore: items.length === limit },
  });
}

export async function markAsRead(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');
  const id = String(req.params.id);

  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError('Invalid notification ID');
  }

  const notification = await NotificationModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    },
    { read: true },
    { new: true },
  )
    .lean()
    .exec();

  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  return sendSuccess(res, serialize(notification as Record<string, unknown>));
}

export async function markAllAsRead(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');

  const result = await NotificationModel.updateMany(
    { userId: new Types.ObjectId(userId), read: false },
    { read: true },
  ).exec();

  return sendSuccess(res, { updated: result.modifiedCount });
}

export async function deleteNotification(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');
  const id = String(req.params.id);

  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError('Invalid notification ID');
  }

  await NotificationModel.findOneAndDelete({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  }).exec();

  return sendNoContent(res);
}
