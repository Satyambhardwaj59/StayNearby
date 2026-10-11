import { Schema, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

const favoriteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  },
  { timestamps: true },
);

favoriteSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

export type Favorite = InferSchemaType<typeof favoriteSchema>;
export type FavoriteDocument = HydratedDocument<Favorite>;
export const FavoriteModel: Model<Favorite> = model<Favorite>('Favorite', favoriteSchema);
