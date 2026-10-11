import { RefreshTokenModel } from '../models/refresh-token.model';

export const refreshTokenRepository = {
  create(input: {
    userId: string;
    sessionId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return RefreshTokenModel.create(input);
  },

  findByHash(tokenHash: string) {
    return RefreshTokenModel.findOne({ tokenHash }).lean().exec();
  },

  markUsed(tokenId: string) {
    return RefreshTokenModel.updateOne(
      { _id: tokenId, usedAt: null },
      { $set: { usedAt: new Date() } },
    ).exec();
  },

  /** Reuse detection: revoke every token in the rotation family. */
  revokeFamily(familyId: string) {
    return RefreshTokenModel.updateMany(
      { familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    ).exec();
  },

  revokeAllForUser(userId: string) {
    return RefreshTokenModel.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    ).exec();
  },

  revokeForSession(sessionId: string) {
    return RefreshTokenModel.updateMany(
      { sessionId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    ).exec();
  },
};
