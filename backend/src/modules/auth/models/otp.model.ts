import { Schema, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

export const OTP_PURPOSES = [
  'EMAIL_VERIFICATION',
  'PHONE_VERIFICATION',
  'PASSWORD_RESET',
] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

/**
 * One-time codes. The code itself is never stored in clear text (HMAC only), is
 * single-use (`consumedAt`) and expires. Attempts are capped.
 */
const otpSchema = new Schema(
  {
    subject: { type: String, required: true, index: true },
    purpose: { type: String, enum: OTP_PURPOSES, required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

otpSchema.index({ subject: 1, purpose: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type Otp = InferSchemaType<typeof otpSchema>;
export type OtpDocument = HydratedDocument<Otp>;
export const OtpModel: Model<Otp> = model<Otp>('Otp', otpSchema);
