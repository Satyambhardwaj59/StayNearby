import { Schema, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    attachments: [
      {
        url: { type: String, required: true },
        type: { type: String, default: 'image' },
      },
    ],
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

export type Message = InferSchemaType<typeof messageSchema>;
export type MessageDocument = HydratedDocument<Message>;
export const MessageModel: Model<Message> = model<Message>('Message', messageSchema);
