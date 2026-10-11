import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { VisitModel, type VisitStatus, VISIT_STATUSES } from '../models/visit.model';
import { PropertyModel } from '../../properties/models/property.model';
import { BadRequestError, NotFoundError, AuthorizationError } from '../../../shared/errors';
import { sendSuccess, sendCreated } from '../../../shared/response';

export async function listVisits(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');

  const { role, status } = req.query as { role?: string; status?: VisitStatus };
  const filter: Record<string, unknown> = {};

  if (role === 'owner') {
    filter.ownerId = new Types.ObjectId(userId);
  } else if (role === 'tenant') {
    filter.tenantId = new Types.ObjectId(userId);
  } else {
    filter.$or = [{ tenantId: new Types.ObjectId(userId) }, { ownerId: new Types.ObjectId(userId) }];
  }

  if (status && VISIT_STATUSES.includes(status)) {
    filter.status = status;
  }

  const visits = await VisitModel.find(filter)
    .sort({ scheduledAt: -1 })
    .populate('propertyId', 'title slug rent address images')
    .populate('tenantId', 'name email phone avatar')
    .populate('ownerId', 'name email phone avatar')
    .lean()
    .exec();

  return sendSuccess(res, visits);
}

export async function requestVisit(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');

  const { propertyId, scheduledAt, timeSlot, notes } = req.body;

  if (!propertyId || !Types.ObjectId.isValid(propertyId)) {
    throw new BadRequestError('Valid propertyId is required');
  }
  if (!scheduledAt) {
    throw new BadRequestError('scheduledAt date is required');
  }

  const property = await PropertyModel.findById(propertyId).lean().exec();
  if (!property) {
    throw new NotFoundError('Property not found');
  }

  if (property.ownerId.toString() === userId) {
    throw new BadRequestError('You cannot request a visit to your own property');
  }

  const visit = await VisitModel.create({
    propertyId: new Types.ObjectId(propertyId),
    tenantId: new Types.ObjectId(userId),
    ownerId: property.ownerId,
    scheduledAt: new Date(scheduledAt),
    timeSlot: timeSlot || null,
    notes: notes ? String(notes).trim() : null,
    status: 'REQUESTED',
  });

  const populated = await VisitModel.findById(visit._id)
    .populate('propertyId', 'title slug rent address images')
    .populate('tenantId', 'name email phone avatar')
    .populate('ownerId', 'name email phone avatar')
    .lean()
    .exec();

  return sendCreated(res, populated);
}

export async function updateVisitStatus(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');
  const id = String(req.params.id);
  const { status, ownerFeedback } = req.body;

  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError('Invalid visit ID');
  }

  if (!status || !VISIT_STATUSES.includes(status)) {
    throw new BadRequestError(`Invalid status. Must be one of: ${VISIT_STATUSES.join(', ')}`);
  }

  const visit = await VisitModel.findById(id).exec();
  if (!visit) {
    throw new NotFoundError('Visit not found');
  }

  const isTenant = visit.tenantId.toString() === userId;
  const isOwner = visit.ownerId.toString() === userId;

  if (!isTenant && !isOwner && req.user?.role !== 'ADMIN') {
    throw new AuthorizationError('You do not have permission to update this visit');
  }

  // Tenant can only cancel
  if (isTenant && !isOwner && status !== 'CANCELLED') {
    throw new BadRequestError('Tenants may only cancel visits');
  }

  visit.status = status;
  if (ownerFeedback && isOwner) {
    visit.ownerFeedback = String(ownerFeedback).trim();
  }
  await visit.save();

  const populated = await VisitModel.findById(visit._id)
    .populate('propertyId', 'title slug rent address images')
    .populate('tenantId', 'name email phone avatar')
    .populate('ownerId', 'name email phone avatar')
    .lean()
    .exec();

  return sendSuccess(res, populated);
}
