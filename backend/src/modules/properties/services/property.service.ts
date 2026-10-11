import { Types } from 'mongoose';
import { NotFoundError, AuthorizationError, BadRequestError } from '../../../shared/errors';
import { slugify, withSlugSuffix } from '../../../shared/utils/slug';
import { shortId } from '../../../shared/utils/crypto';
import { LISTING_TTL_DAYS } from '../../../shared/constants/property';
import { propertyRepository } from '../repositories/property.repository';
import { FavoriteModel } from '../../favorites/models/favorite.model';
import type { Property } from '../models/property.model';
import type { ListingStatus } from '../../../shared/constants/property';

/** Serialises a raw Mongoose/lean document to the public API shape. */
export function toPropertyCard(doc: Record<string, unknown>) {
  const images = (doc.images as Array<{ url: string; alt: string; isCover: boolean }>) ?? [];
  const cover = images.find((img) => img.isCover) ?? images[0] ?? null;
  const location = doc.location as { coordinates: [number, number] } | null;
  const address = doc.address as {
    locality: string;
    city: string;
    postalCode?: string;
    state: string;
    country: string;
  };

  return {
    id: String(doc._id),
    slug: doc.slug as string,
    title: doc.title as string,
    propertyType: doc.propertyType as string,
    roomType: (doc.roomType as string) ?? null,
    bhk: (doc.bhk as string) ?? null,
    rent: doc.rent as number,
    deposit: doc.securityDeposit as number,
    furnishing: doc.furnishing as string,
    availableFrom: doc.availableFrom
      ? (doc.availableFrom as Date).toISOString()
      : null,
    amenities: (doc.amenities as string[]) ?? [],
    image: cover ? { url: cover.url, alt: cover.alt } : null,
    location: {
      locality: address.locality,
      city: address.city,
      point: location
        ? { latitude: location.coordinates[1], longitude: location.coordinates[0] }
        : { latitude: 0, longitude: 0 },
      precision: (doc.locationPrivacy as string) === 'EXACT' ? 'EXACT' : 'APPROXIMATE',
    },
    citySlug: doc.citySlug as string,
    localitySlug: doc.localitySlug as string,
    verified: doc.verificationStatus === 'VERIFIED',
    distanceMeters: (doc.distanceMeters as number) ?? undefined,
    approximateDistanceLabel: (doc.approximateDistanceLabel as string) ?? undefined,
  };
}

export function toPropertyDetail(doc: Record<string, unknown>, isFavorited = false) {
  const location = doc.location as { coordinates: [number, number] } | null;
  const address = doc.address as {
    locality: string;
    city: string;
    state: string;
    postalCode: string | null;
    country: string;
    street: string | null;
    landmark: string | null;
  };
  const contact = doc.contact as {
    phone: string | null;
    email: string | null;
    revealRequirement: string;
  } | null;

  const property = {
    id: String(doc._id),
    slug: doc.slug as string,
    title: doc.title as string,
    description: doc.description as string,
    propertyType: doc.propertyType as string,
    roomType: (doc.roomType as string) ?? null,
    bhk: (doc.bhk as string) ?? null,
    rent: doc.rent as number,
    securityDeposit: doc.securityDeposit as number,
    maintenance: (doc.maintenance as number) ?? null,
    maintenanceIncluded: Boolean(doc.maintenanceIncluded),
    brokerage: (doc.brokerage as number) ?? null,
    brokerageApplicable: Boolean(doc.brokerageApplicable),
    availabilityStatus: doc.availabilityStatus as string,
    availableFrom: doc.availableFrom ? (doc.availableFrom as Date).toISOString() : null,
    moveInDateNotBefore: doc.moveInDateNotBefore
      ? (doc.moveInDateNotBefore as Date).toISOString()
      : null,
    tenantPreferences: (doc.tenantPreferences as string[]) ?? [],
    furnishing: doc.furnishing as string,
    bedrooms: (doc.bedrooms as number) ?? null,
    bathrooms: (doc.bathrooms as number) ?? null,
    area: (doc.area as number) ?? null,
    areaUnit: (doc.areaUnit as string) ?? 'SQFT',
    floor: (doc.floor as number) ?? null,
    totalFloors: (doc.totalFloors as number) ?? null,
    amenities: (doc.amenities as string[]) ?? [],
    images: (doc.images as Array<{
      url: string;
      alt: string;
      width: number | null;
      height: number | null;
      isCover: boolean;
    }>) ?? [],
    location: {
      locality: address.locality,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode ?? null,
      country: address.country,
      point: location
        ? { latitude: location.coordinates[1], longitude: location.coordinates[0] }
        : { latitude: 0, longitude: 0 },
      precision: (doc.locationPrivacy as string) === 'EXACT' ? 'EXACT' : 'APPROXIMATE',
      streetAddress:
        (doc.locationPrivacy as string) === 'EXACT' ? (address.street ?? null) : null,
    },
    citySlug: doc.citySlug as string,
    localitySlug: doc.localitySlug as string,
    nearbyPlaces: (doc.nearbyPlaces as unknown[]) ?? [],
    listingStatus: doc.listingStatus as string,
    verificationStatus: doc.verificationStatus as string,
    contact: {
      phone: contact?.phone ?? null,
      email: contact?.email ?? null,
      revealRequirement: contact?.revealRequirement ?? 'LOGIN_REQUIRED',
    },
    ownerId: String(doc.ownerId),
    viewsCount: (doc.viewsCount as number) ?? 0,
    favoritesCount: (doc.favoritesCount as number) ?? 0,
    publishedAt: doc.publishedAt ? (doc.publishedAt as Date).toISOString() : null,
    updatedAt: (doc.updatedAt as Date).toISOString(),
  };

  return { property, isFavorited };
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  const suffix = shortId(6);
  const candidate = withSlugSuffix(base, suffix);
  const existing = await propertyRepository.findBySlug(candidate);
  if (existing) {
    // Collision — generate with a new suffix
    return withSlugSuffix(base, shortId(8));
  }
  return candidate;
}

export async function createDraft(
  ownerId: string,
  input: Partial<Property>,
): Promise<Record<string, unknown>> {
  const slug = await generateUniqueSlug(
    (input.title as string | undefined) ?? 'property',
  );
  const doc = await propertyRepository.create({
    ...input,
    ownerId: new Types.ObjectId(ownerId) as unknown as Types.ObjectId,
    slug,
    listingStatus: 'DRAFT',
    verificationStatus: 'UNVERIFIED',
  } as unknown as Partial<Property>);
  return doc.toObject() as unknown as Record<string, unknown>;
}

export async function updateDraft(
  propertyId: string,
  ownerId: string,
  patch: Partial<Property>,
): Promise<Record<string, unknown>> {
  const property = await propertyRepository.findByIdAndOwner(propertyId, ownerId);
  if (!property) {
    throw new NotFoundError('Property');
  }
  if (!['DRAFT', 'PENDING_REVIEW', 'REJECTED'].includes(property.listingStatus)) {
    throw new BadRequestError('Published properties cannot be edited directly — contact support');
  }

  // Prevent mass assignment of protected fields
  const {
    ownerId: _o,
    slug: _s,
    listingStatus: _l,
    viewsCount: _v,
    favoritesCount: _f,
    publishedAt: _p,
    ...safePatch
  } = patch as Partial<Property> & {
    ownerId?: unknown;
    slug?: unknown;
    listingStatus?: unknown;
    viewsCount?: unknown;
    favoritesCount?: unknown;
    publishedAt?: unknown;
  };

  const updated = await propertyRepository.update(propertyId, safePatch as Partial<Property>);
  return (updated?.toObject() ?? {}) as unknown as Record<string, unknown>;
}

export async function submitForReview(
  propertyId: string,
  ownerId: string,
): Promise<Record<string, unknown>> {
  const property = await propertyRepository.findByIdAndOwner(propertyId, ownerId);
  if (!property) throw new NotFoundError('Property');
  if (!['DRAFT', 'REJECTED'].includes(property.listingStatus)) {
    throw new BadRequestError('Only drafts can be submitted for review');
  }
  const updated = await propertyRepository.setListingStatus(propertyId, 'PENDING_REVIEW');
  return (updated?.toObject() ?? {}) as unknown as Record<string, unknown>;
}

export async function publishProperty(
  propertyId: string,
  moderatorId: string,
  role: string,
): Promise<Record<string, unknown>> {
  if (!['MODERATOR', 'ADMIN'].includes(role)) {
    throw new AuthorizationError();
  }
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LISTING_TTL_DAYS * 86_400_000);
  const updated = await propertyRepository.setListingStatus(propertyId, 'PUBLISHED', {
    publishedAt: now,
    expiresAt,
    verificationStatus: 'VERIFIED',
  });
  if (!updated) throw new NotFoundError('Property');
  void moderatorId;
  return (updated.toObject() ?? {}) as unknown as Record<string, unknown>;
}

export async function rejectProperty(
  propertyId: string,
  reason: string,
  role: string,
): Promise<Record<string, unknown>> {
  if (!['MODERATOR', 'ADMIN'].includes(role)) {
    throw new AuthorizationError();
  }
  const updated = await propertyRepository.setListingStatus(propertyId, 'REJECTED', {
    rejectionReason: reason,
  } as Partial<Property>);
  if (!updated) throw new NotFoundError('Property');
  return (updated.toObject() ?? {}) as unknown as Record<string, unknown>;
}

export async function deactivateProperty(
  propertyId: string,
  ownerId: string,
  role: string,
): Promise<Record<string, unknown>> {
  let property;
  if (['MODERATOR', 'ADMIN'].includes(role)) {
    property = await propertyRepository.findById(propertyId);
  } else {
    property = await propertyRepository.findByIdAndOwner(propertyId, ownerId);
  }
  if (!property) throw new NotFoundError('Property');

  const status: ListingStatus = ['MODERATOR', 'ADMIN'].includes(role) ? 'SUSPENDED' : 'RENTED';
  const updated = await propertyRepository.setListingStatus(propertyId, status);
  return (updated?.toObject() ?? {}) as unknown as Record<string, unknown>;
}

export async function getPropertyDetail(
  slug: string,
  options: { userId?: string; trackView?: boolean } = {},
): Promise<{ property: ReturnType<typeof toPropertyDetail>['property']; isFavorited: boolean; related: ReturnType<typeof toPropertyCard>[] }> {
  const property = await propertyRepository.findBySlug(slug);
  if (!property || property.listingStatus !== 'PUBLISHED') {
    throw new NotFoundError('Property');
  }

  if (options.trackView) {
    void propertyRepository.incrementViews(String(property._id));
  }

  const related = await propertyRepository.findRelated({
    citySlug: property.citySlug,
    propertyType: property.propertyType,
    excludeId: String(property._id),
  });

  // Reflect the current user's saved state so the detail page can render the
  // heart correctly instead of always showing "not saved".
  let isFavorited = false;
  if (options.userId && Types.ObjectId.isValid(options.userId)) {
    const favorited = await FavoriteModel.exists({
      userId: new Types.ObjectId(options.userId),
      propertyId: property._id,
    });
    isFavorited = Boolean(favorited);
  }

  const { property: propertyView } = toPropertyDetail(
    property.toObject() as unknown as Record<string, unknown>,
    isFavorited,
  );

  return {
    property: propertyView,
    isFavorited,
    related: related.map((r) => toPropertyCard(r as unknown as Record<string, unknown>)),
  };
}
