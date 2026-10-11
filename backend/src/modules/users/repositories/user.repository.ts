import { Types } from 'mongoose';
import { UserModel, type User } from '../models/user.model';

/** All User database access lives here (indexed queries only). */
export const userRepository = {
  findByEmail(email: string, options: { withPassword?: boolean } = {}) {
    const query = UserModel.findOne({ email: email.toLowerCase() });
    if (options.withPassword) {
      query.select('+passwordHash');
    }
    return query.exec();
  },

  findById(id: string) {
    return UserModel.findById(id).exec();
  },

  create(input: Partial<User>) {
    return UserModel.create(input);
  },

  /** Allowlisted profile update — never accepts role/status/password here. */
  updateProfile(userId: string, fields: Record<string, unknown>) {
    return UserModel.findByIdAndUpdate(userId, { $set: fields }, { new: true }).exec();
  },

  setRole(userId: string, role: User['role']) {
    return UserModel.findByIdAndUpdate(userId, { $set: { role } }, { new: true }).exec();
  },

  setStatus(userId: string, status: User['status']) {
    return UserModel.findByIdAndUpdate(userId, { $set: { status } }, { new: true }).exec();
  },

  setPassword(userId: string, passwordHash: string) {
    return UserModel.findByIdAndUpdate(
      userId,
      { $set: { passwordHash, failedLoginAttempts: 0, lockedUntil: null } },
      { new: true },
    ).exec();
  },

  markEmailVerified(userId: string) {
    return UserModel.findByIdAndUpdate(userId, { $set: { emailVerifiedAt: new Date() } }).exec();
  },

  markPhoneVerified(userId: string, phone: string) {
    return UserModel.findByIdAndUpdate(
      userId,
      { $set: { phone, phoneVerifiedAt: new Date() } },
    ).exec();
  },

  recordSuccessfulLogin(userId: string) {
    return UserModel.findByIdAndUpdate(
      userId,
      { $set: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null } },
    ).exec();
  },

  async registerFailedLogin(userId: string, maxAttempts: number, lockMinutes: number) {
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { failedLoginAttempts: 1 } },
      { new: true },
    ).exec();
    if (user && user.failedLoginAttempts >= maxAttempts) {
      await UserModel.findByIdAndUpdate(user._id, {
        $set: { lockedUntil: new Date(Date.now() + lockMinutes * 60_000) },
      }).exec();
    }
    return user;
  },

  listPublicProfile(userId: string) {
    return UserModel.findById(userId).select('name avatarUrl role bio createdAt').lean().exec();
  },

  listForAdmin(filter: {
    role?: string;
    status?: string;
    search?: string;
    skip: number;
    limit: number;
  }) {
    const query: Record<string, unknown> = {};
    if (filter.role) query.role = filter.role;
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      query.$or = [
        { name: new RegExp(filter.search, 'i') },
        { email: new RegExp(filter.search, 'i') },
      ];
    }
    return Promise.all([
      UserModel.find(query).sort({ createdAt: -1 }).skip(filter.skip).limit(filter.limit).lean().exec(),
      UserModel.countDocuments(query),
    ]);
  },

  countByRole() {
    return UserModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]).exec();
  },

  countAll() {
    return UserModel.countDocuments().exec();
  },

  countNewSince(since: Date) {
    return UserModel.countDocuments({ createdAt: { $gte: since } }).exec();
  },

  isValidId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  },
};
