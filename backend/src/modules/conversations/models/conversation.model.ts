import { Schema, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

const conversationSchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    unreadCountTenant: { type: Number, default: 0 },
    unreadCountOwner: { type: Number, default: 0 },
  },
  { timestamps: true },
);

conversationSchema.index({ propertyId: 1, tenantId: 1 }, { unique: true });

export type Conversation = InferSchemaType<typeof conversationSchema>;
export type ConversationDocument = HydratedDocument<Conversation>;
export const ConversationModel: Model<Conversation> = model<Conversation>(
  'Conversation',
  conversationSchema,
);
