import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ConversationModel } from '../models/conversation.model';
import { PropertyModel } from '../../properties/models/property.model';
import { BadRequestError, NotFoundError, AuthorizationError } from '../../../shared/errors';
import { sendSuccess, sendCreated } from '../../../shared/response';

export async function listConversations(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');

  const userObjectId = new Types.ObjectId(userId);
  const conversations = await ConversationModel.find({
    $or: [{ tenantId: userObjectId }, { ownerId: userObjectId }],
  })
    .sort({ lastMessageAt: -1 })
    .populate('propertyId', 'title slug rent images address')
    .populate('tenantId', 'name email avatar phone')
    .populate('ownerId', 'name email avatar phone')
    .lean()
    .exec();

  return sendSuccess(res, conversations);
}

export async function getOrCreateConversation(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');
  const { propertyId } = req.body;

  if (!propertyId || !Types.ObjectId.isValid(propertyId)) {
    throw new BadRequestError('Invalid property ID');
  }

  const property = await PropertyModel.findById(propertyId).lean().exec();
  if (!property) {
    throw new NotFoundError('Property not found');
  }

  const ownerId = property.ownerId.toString();
  if (ownerId === userId) {
    throw new BadRequestError('You cannot message yourself about your own listing');
  }

  let conversation = await ConversationModel.findOne({
    propertyId: new Types.ObjectId(propertyId),
    tenantId: new Types.ObjectId(userId),
  })
    .populate('propertyId', 'title slug rent images address')
    .populate('tenantId', 'name email avatar phone')
    .populate('ownerId', 'name email avatar phone')
    .exec();

  if (!conversation) {
    const created = await ConversationModel.create({
      propertyId: new Types.ObjectId(propertyId),
      tenantId: new Types.ObjectId(userId),
      ownerId: new Types.ObjectId(ownerId),
    });
    conversation = await ConversationModel.findById(created._id)
      .populate('propertyId', 'title slug rent images address')
      .populate('tenantId', 'name email avatar phone')
      .populate('ownerId', 'name email avatar phone')
      .exec();
    return sendCreated(res, conversation);
  }

  return sendSuccess(res, conversation);
}

export async function getConversation(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');
  const id = String(req.params.id);

  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError('Invalid conversation ID');
  }

  const conversation = await ConversationModel.findById(id)
    .populate('propertyId', 'title slug rent images address')
    .populate('tenantId', 'name email avatar phone')
    .populate('ownerId', 'name email avatar phone')
    .lean()
    .exec();

  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  const isTenant = conversation.tenantId?._id?.toString() === userId;
  const isOwner = conversation.ownerId?._id?.toString() === userId;

  if (!isTenant && !isOwner && req.user?.role !== 'ADMIN') {
    throw new AuthorizationError('You do not have access to this conversation');
  }

  // Reset unread count for current user
  if (isTenant && conversation.unreadCountTenant > 0) {
    await ConversationModel.updateOne({ _id: conversation._id }, { unreadCountTenant: 0 });
  } else if (isOwner && conversation.unreadCountOwner > 0) {
    await ConversationModel.updateOne({ _id: conversation._id }, { unreadCountOwner: 0 });
  }

  return sendSuccess(res, conversation);
}
