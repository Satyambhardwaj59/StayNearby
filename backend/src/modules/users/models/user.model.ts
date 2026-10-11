import { Schema, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';
import { ACCOUNT_STATUSES, USER_ROLES } from '../../../shared/constants';

const preferencesSchema = new Schema(
  {
    budgetMin: { type: Number, default: null },
    budgetMax: { type: Number, default: null },
    preferredCities: { type: [String], default: [] },
    preferredPropertyTypes: { type: [String], default: [] },
    moveInDate: { type: Date, default: null },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, default: null, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'TENANT', index: true },
    status: { type: String, enum: ACCOUNT_STATUSES, default: 'ACTIVE', index: true },
    gender: { type: String, default: null },
    occupation: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    bio: { type: String, default: null, maxlength: 600 },
    citySlug: { type: String, default: null },
    localitySlug: { type: String, default: null },
    preferences: { type: preferencesSchema, default: () => ({}) },
    emailVerifiedAt: { type: Date, default: null },
    phoneVerifiedAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    acceptedTermsAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Sparse unique phone so accounts without a phone do not collide on null.
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;
export const UserModel: Model<User> = model<User>('User', userSchema);
