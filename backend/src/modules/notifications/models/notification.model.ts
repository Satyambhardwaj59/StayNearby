import { Schema, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

export const NOTIFICATION_TYPES = [
  'VISIT_REQUEST',
  'VISIT_UPDATE',
  'MESSAGE',
  'LISTING_APPROVED',
  'LISTING_REJECTED',
  'SYSTEM',
] as const;

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'SYSTEM' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export type Notification = InferSchemaType<typeof notificationSchema>;
export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationModel: Model<Notification> = model<Notification>(
  'Notification',
  notificationSchema,
);
