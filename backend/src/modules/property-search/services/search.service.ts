import { Types, type QueryFilter } from 'mongoose';
import { PropertyModel, type Property } from '../../properties/models/property.model';
import { toPropertyCard } from '../../properties/services/property.service';
import { FavoriteModel } from '../../favorites/models/favorite.model';
import type { SearchQuery } from '../schemas/search.schema';
import { getRedisClient } from '../../../infrastructure/redis/client';
import { logger } from '../../../shared/logger';
import { slugify } from '../../../shared/utils/slug';

export type PropertyCardView = ReturnType<typeof toPropertyCard> & { isFavorited?: boolean };

export interface SearchResult {
  items: PropertyCardView[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Marks which of the given cards the user has saved (one indexed query). */
async function decorateFavorites(
  items: PropertyCardView[],
  userId?: string,
): Promise<PropertyCardView[]> {
  if (!userId || !Types.ObjectId.isValid(userId) || items.length === 0) {
    return items;
  }
  const propertyIds = items
    .map((item) => item.id)
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  const favorites = await FavoriteModel.find({
    userId: new Types.ObjectId(userId),
    propertyId: { $in: propertyIds },
  })
    .select('propertyId')
    .lean()
    .exec();

  const saved = new Set(favorites.map((f) => String(f.propertyId)));
  return items.map((item) => ({ ...item, isFavorited: saved.has(item.id) }));
}

export const searchService = {
  async search(query: SearchQuery, userId?: string): Promise<SearchResult> {
    const redis = getRedisClient();
    const cacheKey = `search:${JSON.stringify(query)}`;

    // Cache the user-agnostic card list only; `isFavorited` is applied per
    // request so one user's saved state can never leak into another's response.
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as SearchResult;
          parsed.items = await decorateFavorites(parsed.items, userId);
          return parsed;
        }
      } catch (err) {
        logger.warn({ err }, 'Redis search cache read failed');
      }
    }

    const filter: QueryFilter<Property> = {
      listingStatus: 'PUBLISHED',
    };

    if (query.city) {
      filter.citySlug = slugify(query.city);
    }

    if (query.locality) {
      filter.localitySlug = slugify(query.locality);
    }

    if (query.type) {
      filter.propertyType = query.type;
    }

    if (query.roomType) {
      filter.roomType = query.roomType;
    }

    if (query.bhk) {
      filter.bhk = query.bhk;
    }

    if (query.furnishing) {
      filter.furnishing = query.furnishing;
    }

    if (query.tenantType) {
      filter.tenantPreferences = { $in: [query.tenantType, 'ANYONE'] };
    }

    if (query.amenities && query.amenities.length > 0) {
      filter.amenities = { $all: query.amenities };
    }

    if (query.minRent !== undefined || query.maxRent !== undefined) {
      filter.rent = {};
      if (query.minRent !== undefined) filter.rent.$gte = query.minRent;
      if (query.maxRent !== undefined) filter.rent.$lte = query.maxRent;
    }

    if (query.maxDeposit !== undefined) {
      filter.securityDeposit = { $lte: query.maxDeposit };
    }

    if (query.availabilityStatus) {
      filter.availabilityStatus = query.availabilityStatus as Property['availabilityStatus'];
    }

    // Geospatial search
    if (query.latitude !== undefined && query.longitude !== undefined) {
      const radiusMeters = query.radius || 10_000;
      filter.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [query.longitude, query.latitude],
          },
          $maxDistance: radiusMeters,
        },
      };
    }

    const sortOption: Record<string, 1 | -1> = {};
    if (query.sort === 'rent_asc') {
      sortOption.rent = 1;
    } else if (query.sort === 'rent_desc') {
      sortOption.rent = -1;
    } else {
      sortOption.publishedAt = -1;
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      PropertyModel.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      PropertyModel.countDocuments(filter).exec(),
    ]);

    // Serialise once to the public card shape: never leak internal fields
    // (contact PII, street address, owner id) through the search endpoint.
    const cards: PropertyCardView[] = docs.map((doc) =>
      toPropertyCard(doc as unknown as Record<string, unknown>),
    );

    const result: SearchResult = {
      items: cards,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };

    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 60);
      } catch (err) {
        logger.warn({ err }, 'Redis search cache set failed');
      }
    }

    result.items = await decorateFavorites(result.items, userId);
    return result;
  },

  async mapSearch(bounds: {
    swLat?: number;
    swLng?: number;
    neLat?: number;
    neLng?: number;
    limit?: number;
    city?: string;
  }) {
    const filter: QueryFilter<Property> = {
      listingStatus: 'PUBLISHED',
    };

    if (bounds.city) {
      filter.citySlug = slugify(bounds.city);
    }

    if (
      bounds.swLat !== undefined &&
      bounds.swLng !== undefined &&
      bounds.neLat !== undefined &&
      bounds.neLng !== undefined
    ) {
      filter.location = {
        $geoWithin: {
          $box: [
            [bounds.swLng, bounds.swLat],
            [bounds.neLng, bounds.neLat],
          ],
        },
      };
    }

    const limit = bounds.limit || 200;
    return PropertyModel.find(filter)
      .select('title slug propertyType rent bhk images location address availabilityStatus')
      .limit(limit)
      .lean()
      .exec();
  },
};
