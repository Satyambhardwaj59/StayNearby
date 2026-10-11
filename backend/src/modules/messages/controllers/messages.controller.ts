import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { MessageModel } from '../models/message.model';
import { ConversationModel } from '../../conversations/models/conversation.model';
import { BadRequestError, NotFoundError, AuthorizationError } from '../../../shared/errors';
import { sendSuccess, sendCreated } from '../../../shared/response';
import { emitRealtime } from '../../../sockets/emitter';

export async function listMessages(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  const { conversationId } = req.query as { conversationId?: string };

  if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
    throw new BadRequestError('Valid conversationId is required');
  }

  const conversation = await ConversationModel.findById(conversationId).lean().exec();
  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  const isTenant = conversation.tenantId.toString() === userId;
  const isOwner = conversation.ownerId.toString() === userId;
  if (!isTenant && !isOwner && req.user?.role !== 'ADMIN') {
    throw new AuthorizationError('You do not have access to these messages');
  }

  const messages = await MessageModel.find({
    conversationId: new Types.ObjectId(conversationId),
  })
    .sort({ createdAt: 1 })
    .populate('senderId', 'name avatar')
    .lean()
    .exec();

  return sendSuccess(res, messages);
}

export async function sendMessage(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');

  const { conversationId, content, attachments } = req.body;
  if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
    throw new BadRequestError('Valid conversationId is required');
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new BadRequestError('Message content cannot be empty');
  }

  const conversation = await ConversationModel.findById(conversationId).exec();
  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  const isTenant = conversation.tenantId.toString() === userId;
  const isOwner = conversation.ownerId.toString() === userId;
  if (!isTenant && !isOwner) {
    throw new AuthorizationError('You cannot send messages in this conversation');
  }

  const otherUserId = isTenant ? conversation.ownerId.toString() : conversation.tenantId.toString();

  const message = await MessageModel.create({
    conversationId: conversation._id,
    senderId: new Types.ObjectId(userId),
    content: content.trim(),
    attachments: attachments || [],
  });

  // Update conversation
  conversation.lastMessage = content.trim().substring(0, 100);
  conversation.lastMessageAt = new Date();
  if (isTenant) {
    conversation.unreadCountOwner += 1;
  } else {
    conversation.unreadCountTenant += 1;
  }
  await conversation.save();

  const populatedMessage = await MessageModel.findById(message._id)
    .populate('senderId', 'name avatar')
    .lean()
    .exec();

  // Real-time emit to conversation and recipient personal room
  emitRealtime({
    conversationId: conversation._id.toString(),
    userIds: [otherUserId],
    event: 'message:new',
    payload: populatedMessage,
  });

  return sendCreated(res, populatedMessage);
}

export async function markRead(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.userId;
  if (!userId) throw new BadRequestError('User required');
  const { conversationId } = req.body;

  if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
    throw new BadRequestError('Valid conversationId is required');
  }

  const conversation = await ConversationModel.findById(conversationId).exec();
  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  const isTenant = conversation.tenantId.toString() === userId;
  const isOwner = conversation.ownerId.toString() === userId;

  if (isTenant) {
    conversation.unreadCountTenant = 0;
  } else if (isOwner) {
    conversation.unreadCountOwner = 0;
  }
  await conversation.save();

  await MessageModel.updateMany(
    {
      conversationId: new Types.ObjectId(conversationId),
      senderId: { $ne: new Types.ObjectId(userId) },
      readAt: null,
    },
    { readAt: new Date() },
  );

  return sendSuccess(res, { markedRead: true });
}
