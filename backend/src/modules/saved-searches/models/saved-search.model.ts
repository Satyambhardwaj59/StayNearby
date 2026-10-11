import { Schema, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

const savedSearchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    filters: { type: Schema.Types.Mixed, required: true },
    emailAlerts: { type: Boolean, default: false },
    lastNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type SavedSearch = InferSchemaType<typeof savedSearchSchema>;
export type SavedSearchDocument = HydratedDocument<SavedSearch>;
export const SavedSearchModel: Model<SavedSearch> = model<SavedSearch>(
  'SavedSearch',
  savedSearchSchema,
);
