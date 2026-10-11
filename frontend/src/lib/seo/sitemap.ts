import type { MetadataRoute } from 'next';
import { safeServerRequest } from '../api/server';
import { LANDING_KINDS, absoluteUrl, type LandingKind } from './canonical';
import type { PlaceSuggestion, PropertyCard } from '../api/types';

/**
 * Sitemap generation.
 *
 * Static pages are always listed; cities, localities, curated landing pages and
 * published properties come from the API so the file reflects real inventory.
 * When the API is unreachable the static entries are still emitted.
 */

const SITEMAP_PAGE_SIZE = 2_000;

export interface SitemapSources {
  cities: PlaceSuggestion[];
  localities: PlaceSuggestion[];
  properties: Array<{ slug: string; updatedAt: string }>;
}

export async function loadSitemapSources(
  maxProperties = SITEMAP_PAGE_SIZE,
): Promise<SitemapSources> {
  const cities = await safeServerRequest<PlaceSuggestion[]>('/locations/cities', {
    next: { revalidate: 3_600 },
  });

  const cityList = cities.ok ? cities.data : [];

  const localityResults = await Promise.all(
    cityList.slice(0, 25).map((city) =>
      safeServerRequest<{ city: PlaceSuggestion; localities: PlaceSuggestion[] }>(
        `/locations/cities/${city.citySlug}`,
        { next: { revalidate: 3_600 } },
      ),
    ),
  );

  const localities = localityResults.flatMap((result) => (result.ok ? result.data.localities : []));

  const propertyEntries: Array<{ slug: string; updatedAt: string }> = [];
  let page = 1;
  while (propertyEntries.length < maxProperties) {
    const response = await safeServerRequest<PropertyCard[]>('/search', {
      query: { page, limit: 60, sort: 'newest' },
      next: { revalidate: 1_800 },
    });
    if (!response.ok || response.data.length === 0) {
      break;
    }
    for (const card of response.data) {
      propertyEntries.push({ slug: card.slug, updatedAt: new Date().toISOString() });
    }
    if (response.data.length < 60 || page >= 40) {
      break;
    }
    page += 1;
  }

  return { cities: cityList, localities, properties: propertyEntries };
}

export function staticSitemapEntries(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/search'), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
  ];
}

export async function buildSitemap(): Promise<MetadataRoute.Sitemap> {
  const { cities, localities, properties } = await loadSitemapSources();
  const now = new Date();

  const landingEntries: MetadataRoute.Sitemap = cities.flatMap((city) =>
    LANDING_KINDS.map((kind: LandingKind) => ({
      url: absoluteUrl(`/${kind}-in-${city.citySlug}`),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  );

  return [
    ...staticSitemapEntries(),
    ...cities.map((city) => ({
      url: absoluteUrl(`/city/${city.citySlug}`),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    })),
    ...localities.map((locality) => ({
      url: absoluteUrl(`/city/${locality.citySlug}/${locality.slug}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...landingEntries,
    ...properties.map((property) => ({
      url: absoluteUrl(`/properties/${property.slug}`),
      lastModified: new Date(property.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}

/** Large inventories are split into a sitemap index by the route handler. */
export function chunkSitemap(
  entries: MetadataRoute.Sitemap,
  size = 20_000,
): MetadataRoute.Sitemap[] {
  const chunks: MetadataRoute.Sitemap[] = [];
  for (let index = 0; index < entries.length; index += size) {
    chunks.push(entries.slice(index, index + size));
  }
  return chunks.length > 0 ? chunks : [[]];
}

/** Paths that must never be crawled (also enforced with noindex metadata). */
export const PRIVATE_PATH_PREFIXES = [
  '/dashboard',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify',
  '/tenant',
  '/owner',
  '/admin',
  '/account',
  '/chat',
  '/favorites',
  '/settings',
  '/api',
];

export function isPrivatePath(path: string): boolean {
  return PRIVATE_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
