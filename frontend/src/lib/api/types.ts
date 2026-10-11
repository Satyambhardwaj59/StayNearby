/**
 * API contract types.
 *
 * The backend and frontend are separate applications with no shared package, so
 * the stable, cross-boundary types are duplicated here deliberately. Only shapes
 * that actually cross the wire live in this file.
 */

export type UserRole = 'TENANT' | 'OWNER' | 'MODERATOR' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type ListingStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PUBLISHED'
  | 'RESERVED'
  | 'RENTED'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'REJECTED';
export type PropertyType =
  | 'PG'
  | 'ROOM'
  | 'FLAT'
  | 'APARTMENT'
  | 'HOUSE'
  | 'HOSTEL'
  | 'CO_LIVING'
  | 'INDEPENDENT_HOUSE';
export type RoomType = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'FOUR_PLUS';
export type BhkType = 'RK' | '1_BHK' | '2_BHK' | '3_BHK' | '4_BHK' | '5_PLUS_BHK';
export type FurnishingType = 'UNFURNISHED' | 'SEMI_FURNISHED' | 'FULLY_FURNISHED';
export type TenantPreference =
  | 'STUDENT'
  | 'BACHELOR'
  | 'WORKING_PROFESSIONAL'
  | 'FAMILY'
  | 'COUPLE'
  | 'MALE'
  | 'FEMALE'
  | 'ANYONE';
export type AvailabilityStatus = 'AVAILABLE' | 'OCCUPIED' | 'ON_HOLD';
export type VisitStatus =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'RESCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';
export type NotificationType =
  | 'NEW_MESSAGE'
  | 'VISIT_REQUESTED'
  | 'VISIT_CONFIRMED'
  | 'VISIT_RESCHEDULED'
  | 'VISIT_CANCELLED'
  | 'VISIT_REMINDER'
  | 'LISTING_APPROVED'
  | 'LISTING_REJECTED'
  | 'LISTING_EXPIRING'
  | 'LISTING_EXPIRED'
  | 'SAVED_SEARCH_MATCH'
  | 'REPORT_UPDATE'
  | 'REVIEW_RECEIVED'
  | 'ACCOUNT_UPDATE';

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  nextCursor?: string | null;
  hasMore?: boolean;
  unreadCount?: number;
  unreadTotal?: number;
  appliedFilters?: Record<string, unknown>;
  resolvedLocation?: { label: string; citySlug: string | null; localitySlug: string | null } | null;
  summary?: { average: number; count: number; distribution: Record<string, number> };
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
  meta: PaginationMeta;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field?: string; message: string }>;
    requestId?: string;
  };
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface PublicUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  memberSince: string;
  bio: string | null;
}

export interface PrivateUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  role: UserRole;
  status: AccountStatus;
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

export interface PropertyImage {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  isCover: boolean;
}

export interface PublicLocation {
  locality: string;
  city: string;
  state: string;
  postalCode: string | null;
  country: string;
  point: GeoPoint;
  precision: 'APPROXIMATE' | 'EXACT';
  streetAddress: string | null;
}

export interface PropertyContact {
  phone: string | null;
  email: string | null;
  revealRequirement: 'NONE' | 'LOGIN_REQUIRED' | 'CONTACT_REQUIRED' | 'VISIT_REQUEST_REQUIRED';
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  roomType: RoomType | null;
  bhk: BhkType | null;
  rent: number;
  securityDeposit: number;
  maintenance: number | null;
  maintenanceIncluded: boolean;
  brokerage: number | null;
  brokerageApplicable: boolean;
  availabilityStatus: AvailabilityStatus;
  availableFrom: string | null;
  moveInDateNotBefore: string | null;
  tenantPreferences: TenantPreference[];
  furnishing: FurnishingType;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  areaUnit: 'SQFT' | 'SQM';
  floor: number | null;
  totalFloors: number | null;
  amenities: string[];
  images: PropertyImage[];
  location: PublicLocation;
  citySlug: string;
  localitySlug: string;
  listingStatus: ListingStatus;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  contact: PropertyContact;
  ownerId: string;
  viewsCount: number;
  favoritesCount: number;
  publishedAt: string | null;
  updatedAt: string;
  distanceMeters?: number;
  approximateDistanceLabel?: string;
}

export interface PropertyCard {
  id: string;
  slug: string;
  title: string;
  propertyType: PropertyType;
  roomType: RoomType | null;
  bhk: BhkType | null;
  rent: number;
  deposit: number;
  furnishing: FurnishingType;
  availableFrom: string | null;
  amenities: string[];
  image: { url: string; alt: string } | null;
  location: {
    locality: string;
    city: string;
    point: GeoPoint;
    precision: 'APPROXIMATE' | 'EXACT';
  };
  citySlug: string;
  localitySlug: string;
  verified: boolean;
  distanceMeters?: number;
  approximateDistanceLabel?: string;
  isFavorited?: boolean;
}

export interface PropertyDetailResponse {
  property: Property;
  related: PropertyCard[];
  isFavorited: boolean;
}

export interface PlaceSuggestion {
  name: string;
  slug: string;
  type: 'CITY' | 'LOCALITY' | 'LANDMARK' | 'COLLEGE' | 'OFFICE';
  citySlug: string;
  cityName: string;
  state: string;
  point: GeoPoint;
  displayName: string;
}

export interface LandingData {
  citySlug: string | null;
  localitySlug: string | null;
  rentStats: {
    total: number;
    minRent: number;
    averageRent: number;
    medianRent: number;
  } | null;
  localities: Array<{
    localitySlug: string;
    locality: string;
    count: number;
    minRent: number;
    maxRent: number;
    averageRent: number;
  }>;
  propertyTypes: Array<{
    propertyType: PropertyType;
    count: number;
    minRent: number;
    averageRent: number;
  }>;
  relatedLandings: Array<{ href: string; label: string; count: number }>;
  totalProperties: number;
}

export interface MapMarker {
  id: string;
  slug: string;
  title: string;
  rent: number;
  propertyType: string;
  point: GeoPoint;
  priceLabel: string;
  url: string;
}

export interface MapResult {
  markers: MapMarker[];
  bounds: {
    minLatitude: number;
    maxLatitude: number;
    minLongitude: number;
    maxLongitude: number;
  } | null;
  total: number;
  truncated: boolean;
}

export interface Visit {
  id: string;
  propertyId: string;
  propertySlug: string;
  propertyTitle: string;
  ownerId: string;
  tenantId: string;
  requestedDate: string;
  timeSlot: string;
  message: string | null;
  status: VisitStatus;
  rescheduledFrom: string | null;
  history: Array<{ status: VisitStatus; at: string; note: string | null }>;
  createdAt: string;
}

export interface Review {
  id: string;
  propertyId: string;
  propertySlug: string;
  authorId: string;
  rating: number;
  comment: string;
  status: 'PUBLISHED' | 'PENDING_REVIEW' | 'REJECTED' | 'REMOVED';
  editedAt: string | null;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: {
    url: string | null;
    propertyId: string | null;
    conversationId: string | null;
    visitId: string | null;
    reportId: string | null;
    savedSearchId: string | null;
  };
  read: boolean;
  createdAt: string;
}

export interface AuthSessionUser {
  user: PrivateUser;
  sessionId: string;
  accessToken?: string;
}
