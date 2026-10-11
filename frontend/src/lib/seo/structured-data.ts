import { siteUrl } from '../config/env';
import { absoluteUrl } from './canonical';
import type { Property, PropertyCard, PublicUser } from '../api/types';

/**
 * schema.org builders.
 *
 * Only facts that are actually known are emitted: no invented aggregateRating,
 * no fabricated availability windows, no placeholder prices. When a listing has
 * no reviews we simply omit the rating rather than publishing a fake one.
 */

export interface JsonLdGraph {
  '@context': 'https://schema.org';
  '@graph': unknown[];
}

export function organizationSchema(): unknown {
  return {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'StayNearby',
    url: siteUrl,
    description:
      'Rental marketplace for PGs, rooms, flats and houses near your preferred location.',
  };
}

export function websiteSchema(): unknown {
  return {
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: 'StayNearby',
    publisher: { '@id': `${siteUrl}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?city={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>): unknown {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function itemListSchema(
  items: Array<{ name: string; path: string; image?: string | null }>,
): Record<string, unknown> {
  return {
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
      ...(item.image ? { image: item.image } : {}),
    })),
  };
}

export function faqSchema(faqs: Array<{ question: string; answer: string }>): unknown {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

const RESIDENCE_TYPES: Record<string, string> = {
  PG: 'Apartment',
  ROOM: 'Apartment',
  HOSTEL: 'Apartment',
  CO_LIVING: 'Apartment',
  FLAT: 'Apartment',
  APARTMENT: 'Apartment',
  HOUSE: 'House',
  INDEPENDENT_HOUSE: 'House',
};

/**
 * Property detail schema. Address detail follows the listing's own privacy
 * setting: an APPROXIMATE listing publishes only locality/city, never the street.
 */
export function propertySchema(
  property: Property,
  options: { rating?: { average: number; count: number } | null } = {},
): unknown {
  const residenceType = RESIDENCE_TYPES[property.propertyType] ?? 'Apartment';
  const images = property.images.slice(0, 10).map((image) => image.url);
  const exact = property.location.precision === 'EXACT';

  return {
    '@type': ['RealEstateListing', residenceType],
    '@id': `${absoluteUrl(`/properties/${property.slug}`)}#listing`,
    name: property.title,
    description: property.description.slice(0, 500),
    url: absoluteUrl(`/properties/${property.slug}`),
    ...(images.length > 0 ? { image: images } : {}),
    datePosted: property.publishedAt ?? property.updatedAt,
    dateModified: property.updatedAt,
    ...(property.availabilityStatus === 'AVAILABLE'
      ? { availability: 'https://schema.org/InStock' }
      : { availability: 'https://schema.org/OutOfStock' }),
    numberOfRooms: property.bedrooms ?? undefined,
    numberOfBathroomsTotal: property.bathrooms ?? undefined,
    floorSize:
      property.area !== null
        ? {
            '@type': 'QuantitativeValue',
            value: property.area,
            unitCode: property.areaUnit === 'SQFT' ? 'FTK' : 'MTK',
          }
        : undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: property.location.locality,
      addressRegion: property.location.state,
      addressCountry: property.location.country,
      ...(exact && property.location.postalCode ? { postalCode: property.location.postalCode } : {}),
      ...(exact && property.location.streetAddress
        ? { streetAddress: property.location.streetAddress }
        : {}),
    },
    ...(exact
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: property.location.point.latitude,
            longitude: property.location.point.longitude,
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      price: property.rent,
      priceCurrency: 'INR',
      availability:
        property.listingStatus === 'RESERVED'
          ? 'https://schema.org/LimitedAvailability'
          : 'https://schema.org/InStock',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: property.rent,
        priceCurrency: 'INR',
        unitText: 'MONTH',
      },
      ...(property.securityDeposit > 0 ? { securityDeposit: property.securityDeposit } : {}),
    },
    amenityFeature: property.amenities.map((amenity) => ({
      '@type': 'LocationFeatureSpecification',
      name: amenity.replace(/_/g, ' ').toLowerCase(),
      value: true,
    })),
    ...(options.rating && options.rating.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: options.rating.average,
            reviewCount: options.rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

export function sellerSchema(owner: PublicUser): unknown {
  return {
    '@type': 'Person',
    '@id': `${siteUrl}/users/${owner.id}#person`,
    name: owner.name,
    url: `${siteUrl}/users/${owner.id}`,
  };
}

/** ItemList for a results/landing page, anchored so pages never share an @id. */
export function propertyCardsItemList(cards: PropertyCard[], path: string): unknown {
  return {
    ...itemListSchema(
      cards.map((card) => ({
        name: card.title,
        path: `/properties/${card.slug}`,
        image: card.image?.url ?? null,
      })),
    ),
    '@id': `${siteUrl}${path}#list`,
  };
}

export function graph(nodes: unknown[]): JsonLdGraph {
  return { '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) };
}
