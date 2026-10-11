import { Schema, Types, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

/** A login session. Access tokens reference it; revoking it invalidates them. */
const sessionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

sessionSchema.index({ userId: 1, revokedAt: 1 });
// TTL: sessions are removed once expired.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type Session = InferSchemaType<typeof sessionSchema>;
export type SessionDocument = HydratedDocument<Session>;
export const SessionModel: Model<Session> = model<Session>('Session', sessionSchema);
