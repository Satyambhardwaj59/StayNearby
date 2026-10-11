import { siteUrl } from '../config/env';

/**
 * Canonical URL policy.
 *
 * Indexable pages (home, city, locality, property, curated landing pages) always
 * point at their clean path. Filtered search results canonicalise to the clean
 * search path so crawlers never explode the URL space.
 */

export function absoluteUrl(path: string): string {
  const normalised = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl}${normalised === '/' ? '' : normalised}`;
}

export interface SearchParamsInput {
  [key: string]: string | string[] | undefined;
}

/** Ordered, stable query string so the same filters always produce one URL. */
export function canonicalQuery(params: SearchParamsInput): string {
  const search = new URLSearchParams();
  const keys = Object.keys(params).sort();

  for (const key of keys) {
    if (key === 'page' || key === 'cursor' || key === 'landing') {
      continue;
    }
    const value = params[key];
    if (value === undefined || value === '') {
      continue;
    }
    if (Array.isArray(value)) {
      const items = [...value].filter((item) => item !== '').sort();
      if (items.length > 0) {
        search.set(key, items.join(','));
      }
      continue;
    }
    search.set(key, value);
  }

  const serialised = search.toString();
  return serialised.length > 0 ? `?${serialised}` : '';
}

export function searchCanonicalPath(): string {
  // Paginated or filtered views canonicalise to the unfiltered search path.
  return absoluteUrl('/search');
}

export function cityPath(citySlug: string): string {
  return `/city/${citySlug}`;
}

export function localityPath(citySlug: string, localitySlug: string): string {
  return `/city/${citySlug}/${localitySlug}`;
}

export function propertyPath(slug: string): string {
  return `/properties/${slug}`;
}

/** Curated landing page paths. */
export const LANDING_KINDS = [
  'pg',
  'rooms',
  'hostels',
  'co-living',
  'flats',
  'apartments',
  'houses',
  'independent-houses',
] as const;
export type LandingKind = (typeof LANDING_KINDS)[number];

export const LANDING_AUDIENCES = [
  'students',
  'bachelors',
  'working-professionals',
  'families',
  'couples',
] as const;
export type LandingAudience = (typeof LANDING_AUDIENCES)[number];

export const LANDING_BHK = ['1bhk', '2bhk', '3bhk', '4bhk'] as const;
export type LandingBhk = (typeof LANDING_BHK)[number];

export interface ParsedLanding {
  kind: LandingKind;
  audience: LandingAudience | null;
  bhk: LandingBhk | null;
  citySlug: string;
}

/**
 * Parses SEO URLs without a query string:
 *   /pg-in-patna
 *   /pg-for-students-in-patna
 *   /1bhk-for-rent-in-patna
 *   /flats-for-families-in-patna
 */
export function parseLandingSlug(slug: string): ParsedLanding | null {
  // BHK landings: /1bhk-for-rent-in-patna
  const bhkMatch = /^(?<bhk>[1-4]bhk)-for-(?:rent-)?in-(?<city>[a-z0-9-]+)$/.exec(slug);
  if (bhkMatch?.groups) {
    return {
      kind: 'flats',
      audience: null,
      bhk: bhkMatch.groups.bhk as LandingBhk,
      citySlug: bhkMatch.groups.city as string,
    };
  }

  // Kind + optional audience: /pg-in-patna, /pg-for-students-in-patna,
  // /rooms-for-rent-in-patna (the "rent" token is not an audience).
  const forMatch = /^(?<kind>[a-z-]+)-for-(?:(?<audience>[a-z-]+)-)?(?:rent-)?in-(?<city>[a-z0-9-]+)$/.exec(
    slug,
  );
  if (forMatch?.groups) {
    const kind = forMatch.groups.kind as string;
    if (!(LANDING_KINDS as readonly string[]).includes(kind)) {
      return null;
    }
    let audience = (forMatch.groups.audience as string | undefined) ?? null;
    if (audience === 'rent') {
      audience = null;
    }
    if (audience && !(LANDING_AUDIENCES as readonly string[]).includes(audience)) {
      return null;
    }
    return {
      kind: kind as LandingKind,
      audience: audience as LandingAudience | null,
      bhk: null,
      citySlug: forMatch.groups.city as string,
    };
  }

  // Plain kind-in-city: /pg-in-patna, /co-living-in-patna
  const plainMatch = /^(?<kind>[a-z-]+)-in-(?<city>[a-z0-9-]+)$/.exec(slug);
  if (plainMatch?.groups) {
    const kind = plainMatch.groups.kind as string;
    if (!(LANDING_KINDS as readonly string[]).includes(kind)) {
      return null;
    }
    return {
      kind: kind as LandingKind,
      audience: null,
      bhk: null,
      citySlug: plainMatch.groups.city as string,
    };
  }

  return null;
}

export function landingPath(input: {
  kind: LandingKind;
  audience?: LandingAudience | null;
  bhk?: LandingBhk | null;
  citySlug: string;
}): string {
  if (input.bhk) {
    return `/${input.bhk}-for-rent-in-${input.citySlug}`;
  }
  if (input.audience) {
    return `/${input.kind}-for-${input.audience}-in-${input.citySlug}`;
  }
  return `/${input.kind}-in-${input.citySlug}`;
}
