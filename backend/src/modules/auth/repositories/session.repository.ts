import { SessionModel } from '../models/session.model';

export const sessionRepository = {
  create(input: {
    userId: string;
    userAgent?: string | null;
    ip?: string | null;
    expiresAt: Date;
  }) {
    return SessionModel.create(input);
  },

  /** Only live (unrevoked, unexpired) sessions are returned. */
  findActiveById(sessionId: string, userId: string) {
    return SessionModel.findOne({
      _id: sessionId,
      userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).lean();
  },

  touch(sessionId: string) {
    return SessionModel.updateOne({ _id: sessionId }, { $set: { lastUsedAt: new Date() } }).exec();
  },

  revoke(sessionId: string) {
    return SessionModel.updateOne(
      { _id: sessionId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    ).exec();
  },

  revokeAllForUser(userId: string) {
    return SessionModel.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    ).exec();
  },

  revokeFamily(sessionId: string) {
    return SessionModel.updateOne(
      { _id: sessionId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    ).exec();
  },

  listActiveForUser(userId: string, currentSessionId?: string) {
    return SessionModel.find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
      .sort({ lastUsedAt: -1 })
      .lean()
      .exec()
      .then((sessions) =>
        sessions.map((session) => ({
          id: String(session._id),
          userAgent: session.userAgent ?? null,
          ip: session.ip ?? null,
          lastUsedAt: session.lastUsedAt,
          current: currentSessionId !== undefined && String(session._id) === currentSessionId,
        })),
      );
  },
};
