import { NotFoundError } from '../../../shared/errors';
import type { UserDocument } from '../models/user.model';
import { userRepository } from '../repositories/user.repository';

/** Profile read/write plus the serializers used across the API boundary. */

export interface PrivateUserView {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  role: string;
  status: string;
  gender: string | null;
  occupation: string | null;
  avatarUrl: string | null;
  bio: string | null;
  citySlug: string | null;
  localitySlug: string | null;
  preferences: {
    budgetMin: number | null;
    budgetMax: number | null;
    preferredCities: string[];
    preferredPropertyTypes: string[];
    moveInDate: string | null;
  };
  createdAt: string;
  lastLoginAt: string | null;
}

export interface PublicUserView {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  memberSince: string;
  bio: string | null;
}

type ProfileSource = {
  _id: unknown;
  name: string;
  email?: string;
  emailVerifiedAt?: Date | null;
  phone?: string | null;
  phoneVerifiedAt?: Date | null;
  role: string;
  status?: string;
  gender?: string | null;
  occupation?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  citySlug?: string | null;
  localitySlug?: string | null;
  preferences?: {
    budgetMin?: number | null;
    budgetMax?: number | null;
    preferredCities?: string[];
    preferredPropertyTypes?: string[];
    moveInDate?: Date | null;
  };
  createdAt?: Date;
  lastLoginAt?: Date | null;
};

export function toPrivateUser(user: ProfileSource): PrivateUserView {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email ?? '',
    emailVerified: Boolean(user.emailVerifiedAt),
    phone: user.phone ?? null,
    phoneVerified: Boolean(user.phoneVerifiedAt),
    role: user.role,
    status: user.status ?? 'ACTIVE',
    gender: user.gender ?? null,
    occupation: user.occupation ?? null,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    citySlug: user.citySlug ?? null,
    localitySlug: user.localitySlug ?? null,
    preferences: {
      budgetMin: user.preferences?.budgetMin ?? null,
      budgetMax: user.preferences?.budgetMax ?? null,
      preferredCities: user.preferences?.preferredCities ?? [],
      preferredPropertyTypes: user.preferences?.preferredPropertyTypes ?? [],
      moveInDate: user.preferences?.moveInDate ? user.preferences.moveInDate.toISOString() : null,
    },
    createdAt: (user.createdAt ?? new Date()).toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}

export function toPublicUser(user: ProfileSource): PublicUserView {
  return {
    id: String(user._id),
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    memberSince: (user.createdAt ?? new Date()).toISOString(),
    bio: user.bio ?? null,
  };
}

export async function getMyProfile(userId: string): Promise<PrivateUserView> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User');
  }
  return toPrivateUser(user as unknown as UserDocument);
}

/** Allowlisted fields only — role, status and credentials cannot be set here. */
const PROFILE_FIELDS = [
  'name',
  'gender',
  'occupation',
  'avatarUrl',
  'bio',
  'citySlug',
  'localitySlug',
] as const;

export async function updateMyProfile(
  userId: string,
  patch: Record<string, unknown>,
): Promise<PrivateUserView> {
  const update: Record<string, unknown> = {};
  for (const field of PROFILE_FIELDS) {
    if (patch[field] !== undefined) {
      update[field] = patch[field];
    }
  }

  if (patch.preferences && typeof patch.preferences === 'object') {
    update.preferences = patch.preferences;
  }

  const user = await userRepository.updateProfile(userId, update);
  if (!user) {
    throw new NotFoundError('User');
  }
  return toPrivateUser(user as unknown as UserDocument);
}

export async function getPublicProfile(userId: string): Promise<PublicUserView> {
  const user = await userRepository.listPublicProfile(userId);
  if (!user) {
    throw new NotFoundError('User');
  }
  return toPublicUser(user as unknown as ProfileSource);
}
