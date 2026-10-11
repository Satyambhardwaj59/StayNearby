import { z } from 'zod';
import {
  PROPERTY_TYPES,
  ROOM_TYPES,
  BHK_TYPES,
  FURNISHING_TYPES,
  TENANT_PREFERENCES,
  AMENITIES,
  LOCATION_PRIVACY,
} from '../../../shared/constants/property';

const geoPointSchema = z.object({
  type: z.literal('Point').default('Point'),
  coordinates: z.tuple([
    z.number().min(-180).max(180), // longitude
    z.number().min(-90).max(90),   // latitude
  ]),
});

const addressSchema = z.object({
  street: z.string().trim().max(200).nullable().optional(),
  locality: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  postalCode: z.string().trim().max(20).nullable().optional(),
  country: z.string().trim().max(60).default('India'),
  landmark: z.string().trim().max(200).nullable().optional(),
});

const imageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional(),
  alt: z.string().trim().max(150).default(''),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  isCover: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

const contactSchema = z.object({
  phone: z.string().trim().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  revealRequirement: z
    .enum(['NONE', 'LOGIN_REQUIRED', 'CONTACT_REQUIRED', 'VISIT_REQUEST_REQUIRED'])
    .default('LOGIN_REQUIRED'),
});

const nearbyPlaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.string().trim().min(1).max(30),
  distanceMeters: z.number().int().min(0),
  distanceLabel: z.string().trim().min(1).max(30),
});

/** Base fields for both create and update */
const propertyBaseSchema = z.object({
  title: z.string().trim().min(10).max(150).optional(),
  description: z.string().trim().min(20).max(5000).optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  roomType: z.enum(ROOM_TYPES).nullable().optional(),
  bhk: z.enum(BHK_TYPES).nullable().optional(),
  rent: z.number().int().min(0).optional(),
  securityDeposit: z.number().int().min(0).optional(),
  maintenance: z.number().int().min(0).nullable().optional(),
  maintenanceIncluded: z.boolean().optional(),
  brokerage: z.number().int().min(0).nullable().optional(),
  brokerageApplicable: z.boolean().optional(),
  availableFrom: z.string().datetime().nullable().optional(),
  moveInDateNotBefore: z.string().datetime().nullable().optional(),
  tenantPreferences: z.array(z.enum(TENANT_PREFERENCES)).max(8).optional(),
  furnishing: z.enum(FURNISHING_TYPES).optional(),
  bedrooms: z.number().int().min(0).max(20).nullable().optional(),
  bathrooms: z.number().int().min(0).max(20).nullable().optional(),
  area: z.number().min(0).nullable().optional(),
  areaUnit: z.enum(['SQFT', 'SQM']).optional(),
  floor: z.number().int().nullable().optional(),
  totalFloors: z.number().int().min(0).nullable().optional(),
  amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length).optional(),
  images: z.array(imageSchema).max(20).optional(),
  location: geoPointSchema.optional(),
  address: addressSchema.optional(),
  locationPrivacy: z.enum(LOCATION_PRIVACY).optional(),
  citySlug: z.string().trim().lowercase().max(60).optional(),
  localitySlug: z.string().trim().lowercase().max(60).optional(),
  contact: contactSchema.optional(),
  nearbyPlaces: z.array(nearbyPlaceSchema).max(15).optional(),
});

export const createPropertySchema = propertyBaseSchema;
export const updatePropertySchema = propertyBaseSchema;

export const submitForReviewSchema = z.object({});

export const moderatePropertySchema = z.object({
  action: z.enum(['publish', 'reject', 'suspend']),
  reason: z.string().trim().max(500).optional(),
  note: z.string().trim().max(1000).optional(),
});

export const propertiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(20),
  listingStatus: z.string().optional(),
  search: z.string().trim().max(100).optional(),
});

export const adminPropertiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(20),
  listingStatus: z.string().optional(),
  verificationStatus: z.string().optional(),
  citySlug: z.string().optional(),
  search: z.string().trim().max(100).optional(),
});

export const nearbyQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().int().min(100).max(50_000).default(5_000),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
