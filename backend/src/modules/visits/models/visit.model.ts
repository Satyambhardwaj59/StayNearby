import { Schema, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

export const VISIT_STATUSES = [
  'REQUESTED',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'REJECTED',
] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

const visitSchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scheduledAt: { type: Date, required: true },
    timeSlot: { type: String, default: null },
    status: {
      type: String,
      enum: VISIT_STATUSES,
      default: 'REQUESTED',
      index: true,
    },
    notes: { type: String, default: null, maxlength: 500 },
    ownerFeedback: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true },
);

visitSchema.index({ tenantId: 1, scheduledAt: -1 });
visitSchema.index({ ownerId: 1, scheduledAt: -1 });

export type Visit = InferSchemaType<typeof visitSchema>;
export type VisitDocument = HydratedDocument<Visit>;
export const VisitModel: Model<Visit> = model<Visit>('Visit', visitSchema);
