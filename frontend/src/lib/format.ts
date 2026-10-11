import type {
  BhkType,
  FurnishingType,
  ListingStatus,
  PropertyType,
  RoomType,
  TenantPreference,
  VisitStatus,
} from './api/types';

/** Formatting and label helpers shared by every feature (single source of truth). */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatRent(amount: number): string {
  return inrFormatter.format(amount);
}

/** Compact rent used in cards and map pins (₹12K, ₹1.2L). */
export function formatRentCompact(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${Math.round(amount / 1_000)}K`;
  return `₹${amount}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return '';
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function propertyTypeLabel(type: PropertyType): string {
  const labels: Record<PropertyType, string> = {
    PG: 'PG',
    ROOM: 'Room',
    FLAT: 'Flat',
    APARTMENT: 'Apartment',
    HOUSE: 'House',
    HOSTEL: 'Hostel',
    CO_LIVING: 'Co-living',
    INDEPENDENT_HOUSE: 'Independent house',
  };
  return labels[type];
}

export function roomTypeLabel(roomType: RoomType): string {
  const labels: Record<RoomType, string> = {
    SINGLE: 'Single sharing',
    DOUBLE: 'Double sharing',
    TRIPLE: 'Triple sharing',
    FOUR_PLUS: 'Four or more sharing',
  };
  return labels[roomType];
}

export function bhkLabel(bhk: BhkType): string {
  const labels: Record<BhkType, string> = {
    RK: '1 RK',
    '1_BHK': '1 BHK',
    '2_BHK': '2 BHK',
    '3_BHK': '3 BHK',
    '4_BHK': '4 BHK',
    '5_PLUS_BHK': '5+ BHK',
  };
  return labels[bhk];
}

export function furnishingLabel(furnishing: FurnishingType): string {
  const labels: Record<FurnishingType, string> = {
    UNFURNISHED: 'Unfurnished',
    SEMI_FURNISHED: 'Semi furnished',
    FULLY_FURNISHED: 'Fully furnished',
  };
  return labels[furnishing];
}

export function tenantPreferenceLabel(preference: TenantPreference): string {
  const labels: Record<TenantPreference, string> = {
    STUDENT: 'Students',
    BACHELOR: 'Bachelors',
    WORKING_PROFESSIONAL: 'Working professionals',
    FAMILY: 'Families',
    COUPLE: 'Couples',
    MALE: 'Male tenants',
    FEMALE: 'Female tenants',
    ANYONE: 'Anyone',
  };
  return labels[preference];
}

export function listingStatusLabel(status: ListingStatus): string {
  const labels: Record<ListingStatus, string> = {
    DRAFT: 'Draft',
    PENDING_REVIEW: 'In review',
    PUBLISHED: 'Published',
    RESERVED: 'Reserved',
    RENTED: 'Rented',
    EXPIRED: 'Expired',
    SUSPENDED: 'Suspended',
    REJECTED: 'Needs changes',
  };
  return labels[status];
}

export function visitStatusLabel(status: VisitStatus): string {
  const labels: Record<VisitStatus, string> = {
    REQUESTED: 'Requested',
    CONFIRMED: 'Confirmed',
    RESCHEDULED: 'Rescheduled',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    REJECTED: 'Declined',
  };
  return labels[status];
}

export function pluralise(count: number, singular: string, plural?: string): string {
  return `${count.toLocaleString('en-IN')} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

export const AMENITIES_CATALOG = [
  { key: 'WIFI', label: 'High Speed WiFi' },
  { key: 'WATER_SUPPLY_24X7', label: '24/7 Water Supply' },
  { key: 'POWER_BACKUP', label: '24/7 Power Backup' },
  { key: 'LIFT', label: 'Elevator / Lift' },
  { key: 'TWO_WHEELER_PARKING', label: 'Two Wheeler Parking' },
  { key: 'FOUR_WHEELER_PARKING', label: 'Car Parking' },
  { key: 'MEALS_INCLUDED', label: 'Food / Meals Included' },
  { key: 'HOUSEKEEPING', label: 'Daily Housekeeping' },
  { key: 'STUDY_TABLE', label: 'Study Table & Chair' },
  { key: 'ATTACHED_BATHROOM', label: 'Attached Washroom' },
  { key: 'CCTV', label: 'CCTV Surveillance' },
  { key: 'SECURITY_GUARD', label: '24/7 Security Guard' },
  { key: 'GYM', label: 'Gym & Fitness' },
  { key: 'REFRIGERATOR', label: 'Refrigerator' },
  { key: 'BALCONY', label: 'Private Balcony' },
  { key: 'PARK', label: 'Garden / Park Nearby' },
  { key: 'PET_FRIENDLY', label: 'Pet Friendly' },
  { key: 'LAUNDRY', label: 'Washing Machine / Laundry' },
] as const;

export function amenityLabel(key: string): string {
  const found = AMENITIES_CATALOG.find((a) => a.key === key);
  return found ? found.label : key.replace(/_/g, ' ');
}

