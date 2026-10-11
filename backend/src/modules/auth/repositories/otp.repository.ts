import type { OtpPurpose } from '../models/otp.model';
import { OtpModel } from '../models/otp.model';

export const otpRepository = {
  /** Invalidates previous codes for the subject/purpose before issuing a new one. */
  async issue(input: {
    subject: string;
    purpose: OtpPurpose;
    codeHash: string;
    expiresAt: Date;
  }) {
    await OtpModel.deleteMany({ subject: input.subject, purpose: input.purpose });
    return OtpModel.create(input);
  },

  findLatestActive(subject: string, purpose: OtpPurpose) {
    return OtpModel.findOne({
      subject,
      purpose,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .exec();
  },

  incrementAttempts(id: string) {
    return OtpModel.updateOne({ _id: id }, { $inc: { attempts: 1 } }).exec();
  },

  consume(id: string) {
    return OtpModel.updateOne(
      { _id: id, consumedAt: null },
      { $set: { consumedAt: new Date() } },
    ).exec();
  },
};
