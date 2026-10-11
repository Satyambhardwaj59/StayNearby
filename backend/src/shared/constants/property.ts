export const PROPERTY_TYPES = [
  'PG',
  'ROOM',
  'FLAT',
  'APARTMENT',
  'HOUSE',
  'HOSTEL',
  'CO_LIVING',
  'INDEPENDENT_HOUSE',
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const ROOM_TYPES = ['SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_PLUS'] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const BHK_TYPES = ['RK', '1_BHK', '2_BHK', '3_BHK', '4_BHK', '5_PLUS_BHK'] as const;
export type BhkType = (typeof BHK_TYPES)[number];

export const FURNISHING_TYPES = ['UNFURNISHED', 'SEMI_FURNISHED', 'FULLY_FURNISHED'] as const;
export type FurnishingType = (typeof FURNISHING_TYPES)[number];

export const TENANT_PREFERENCES = [
  'STUDENT',
  'BACHELOR',
  'WORKING_PROFESSIONAL',
  'FAMILY',
  'COUPLE',
  'MALE',
  'FEMALE',
  'ANYONE',
] as const;
export type TenantPreference = (typeof TENANT_PREFERENCES)[number];

export const AVAILABILITY_STATUSES = ['AVAILABLE', 'OCCUPIED', 'ON_HOLD'] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const LISTING_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'RESERVED',
  'RENTED',
  'EXPIRED',
  'SUSPENDED',
  'REJECTED',
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const VERIFICATION_STATUSES = ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const LOCATION_PRIVACY = [
  'APPROXIMATE',
  'LOGGED_IN_USERS',
  'AFTER_CONTACT',
  'AFTER_VISIT_REQUEST',
  'EXACT',
] as const;
export type LocationPrivacy = (typeof LOCATION_PRIVACY)[number];

export const AREA_UNITS = ['SQFT', 'SQM'] as const;
export type AreaUnit = (typeof AREA_UNITS)[number];

/** Amenity slugs accepted on listings. */
export const AMENITIES = [
  'WIFI',
  'WATER_SUPPLY_24X7',
  'POWER_BACKUP',
  'LIFT',
  'TWO_WHEELER_PARKING',
  'FOUR_WHEELER_PARKING',
  'MEALS_INCLUDED',
  'HOUSEKEEPING',
  'STUDY_TABLE',
  'ATTACHED_BATHROOM',
  'CCTV',
  'SECURITY_GUARD',
  'GYM',
  'REFRIGERATOR',
  'BALCONY',
  'PARK',
  'PET_FRIENDLY',
  'LAUNDRY',
] as const;
export type Amenity = (typeof AMENITIES)[number];

/** Listing validity window (days) before a published listing expires. */
export const LISTING_TTL_DAYS = 90;
