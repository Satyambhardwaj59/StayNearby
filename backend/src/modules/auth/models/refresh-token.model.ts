import { Schema, Types, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

/**
 * Refresh tokens are stored hashed (HMAC) and rotate on every use. Tokens in the
 * same rotation family share `familyId`; reuse of a rotated token revokes the
 * whole family.
 */
const refreshTokenSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: Types.ObjectId, ref: 'Session', required: true, index: true },
    familyId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    usedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshToken = InferSchemaType<typeof refreshTokenSchema>;
export type RefreshTokenDocument = HydratedDocument<RefreshToken>;
export const RefreshTokenModel: Model<RefreshToken> = model<RefreshToken>(
  'RefreshToken',
  refreshTokenSchema,
);
