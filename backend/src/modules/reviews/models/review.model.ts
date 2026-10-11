import { Schema, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

const reviewSchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, minlength: 5, maxlength: 1000 },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'APPROVED',
      index: true,
    },
  },
  { timestamps: true },
);

reviewSchema.index({ propertyId: 1, userId: 1 }, { unique: true });

export type Review = InferSchemaType<typeof reviewSchema>;
export type ReviewDocument = HydratedDocument<Review>;
export const ReviewModel: Model<Review> = model<Review>('Review', reviewSchema);
