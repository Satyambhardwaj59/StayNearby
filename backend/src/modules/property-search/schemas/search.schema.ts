import { z } from 'zod';
import { PROPERTY_TYPES, ROOM_TYPES, BHK_TYPES, FURNISHING_TYPES, TENANT_PREFERENCES } from '../../../shared/constants/property';

export const searchQuerySchema = z.object({
  // Location
  city: z.string().trim().optional(),
  locality: z.string().trim().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().int().min(100).max(50_000).optional(),

  // Property filters
  type: z.enum(PROPERTY_TYPES).optional(),
  roomType: z.enum(ROOM_TYPES).optional(),
  bhk: z.enum(BHK_TYPES).optional(),
  furnishing: z.enum(FURNISHING_TYPES).optional(),
  tenantType: z.enum(TENANT_PREFERENCES).optional(),
  amenities: z.union([z.string(), z.array(z.string())]).transform((v) =>
    Array.isArray(v) ? v : v.split(',').filter(Boolean),
  ).optional(),

  // Pricing
  minRent: z.coerce.number().int().min(0).optional(),
  maxRent: z.coerce.number().int().min(0).optional(),
  maxDeposit: z.coerce.number().int().min(0).optional(),

  // Availability
  availableFrom: z.string().optional(),
  availabilityStatus: z.string().optional(),

  // Sorting
  sort: z.enum(['rent_asc', 'rent_desc', 'newest', 'relevance']).default('newest'),

  // Pagination
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(20),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const landingQuerySchema = z.object({
  city: z.string().trim().optional(),
  locality: z.string().trim().optional(),
  propertyType: z.string().trim().optional(),
});

export const mapQuerySchema = searchQuerySchema.omit({ page: true, limit: true }).extend({
  swLat: z.coerce.number().min(-90).max(90).optional(),
  swLng: z.coerce.number().min(-180).max(180).optional(),
  neLat: z.coerce.number().min(-90).max(90).optional(),
  neLng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});
