import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { SavedSearchModel } from '../models/saved-search.model';
import { BadRequestError, NotFoundError } from '../../../shared/errors';
import { sendSuccess, sendCreated, sendNoContent } from '../../../shared/response';

/** Maps the stored document to the client's saved-search contract. */
function serialize(doc: Record<string, unknown>) {
  return {
    _id: String(doc._id),
    name: doc.name as string,
    filters: (doc.filters as Record<string, unknown>) ?? {},
    alertEnabled: Boolean(doc.emailAlerts),
    // The matching job notifies as soon as a listing appears.
    alertFrequency: 'IMMEDIATE' as const,
    lastMatchCount: 0,
    createdAt: doc.createdAt,
    lastCheckedAt: (doc.lastNotifiedAt as Date | null) ?? null,
  };
}

export async function listSavedSearches(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');

  const searches = await SavedSearchModel.find({ userId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  return sendSuccess(res, searches.map((s) => serialize(s as Record<string, unknown>)));
}

export async function createSavedSearch(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');
  const { name, filters, emailAlerts, alertEnabled } = req.body;

  if (!name || typeof name !== 'string') {
    throw new BadRequestError('Name is required');
  }
  if (!filters || typeof filters !== 'object') {
    throw new BadRequestError('Valid filters object is required');
  }

  const savedSearch = await SavedSearchModel.create({
    userId: new Types.ObjectId(userId),
    name: name.trim(),
    filters,
    emailAlerts: Boolean(emailAlerts ?? alertEnabled),
  });

  return sendCreated(res, serialize(savedSearch.toObject() as Record<string, unknown>));
}

export async function updateSavedSearch(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');
  const id = String(req.params.id);

  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError('Invalid ID');
  }

  const { alertEnabled, name, filters } = req.body as {
    alertEnabled?: unknown;
    name?: unknown;
    filters?: unknown;
  };

  const patch: Record<string, unknown> = {};
  if (typeof alertEnabled === 'boolean') patch.emailAlerts = alertEnabled;
  if (typeof name === 'string' && name.trim().length > 0) patch.name = name.trim();
  if (filters && typeof filters === 'object') patch.filters = filters;

  if (Object.keys(patch).length === 0) {
    throw new BadRequestError('No supported fields to update');
  }

  const updated = await SavedSearchModel.findOneAndUpdate(
    { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
    { $set: patch },
    { new: true },
  )
    .lean()
    .exec();

  if (!updated) {
    throw new NotFoundError('Saved search not found or unauthorized');
  }

  return sendSuccess(res, serialize(updated as Record<string, unknown>));
}

export async function deleteSavedSearch(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');
  const id = String(req.params.id);

  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError('Invalid ID');
  }

  const deleted = await SavedSearchModel.findOneAndDelete({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  });

  if (!deleted) {
    throw new NotFoundError('Saved search not found or unauthorized');
  }

  return sendNoContent(res);
}
