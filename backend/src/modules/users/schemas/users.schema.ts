import { z } from 'zod';
import { USER_ROLES, ACCOUNT_STATUSES } from '../../../shared/constants';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  gender: z.string().trim().max(20).nullable().optional(),
  occupation: z.string().trim().max(80).nullable().optional(),
  bio: z.string().trim().max(600).nullable().optional(),
  citySlug: z.string().trim().max(60).nullable().optional(),
  localitySlug: z.string().trim().max(60).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  preferences: z
    .object({
      budgetMin: z.number().int().min(0).nullable().optional(),
      budgetMax: z.number().int().min(0).nullable().optional(),
      preferredCities: z.array(z.string()).max(10).optional(),
      preferredPropertyTypes: z.array(z.string()).max(10).optional(),
      moveInDate: z.string().datetime().nullable().optional(),
    })
    .optional(),
});

export const adminUserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(20),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(ACCOUNT_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
});

export const setUserStatusSchema = z.object({
  status: z.enum(ACCOUNT_STATUSES),
  reason: z.string().trim().max(500).optional(),
});

export const setUserRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});
