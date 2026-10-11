import type { Metadata } from 'next';
import { siteUrl } from '../config/env';
import { absoluteUrl } from './canonical';

/**
 * Metadata builders.
 *
 * Every indexable page gets a unique title, description, canonical, Open Graph
 * and Twitter card built from real page data. Private/transactional pages get
 * `robots: noindex` so dashboards never enter the index.
 */

export const SITE_NAME = 'StayNearby';
export const SITE_TAGLINE = 'Your Next Home Is Closer.';
export const SITE_DESCRIPTION =
  'Find PGs, rooms, flats and houses near your preferred location.';
/** Brand suffix appended once by the root layout's title template. */
export const TITLE_SUFFIX = ` | ${SITE_NAME}`;

export interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  keywords?: string[];
  noIndex?: boolean;
  type?: 'website' | 'article';
  publishedTime?: string | null;
  modifiedTime?: string | null;
  canonicalPath?: string;
}

export function buildMetadata(input: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(input.canonicalPath ?? input.path);
  const image = input.image
    ? input.image.startsWith('http')
      ? input.image
      : absoluteUrl(input.image)
    : undefined;

  return {
    title: input.title,
    description: input.description,
    ...(input.keywords && input.keywords.length > 0 ? { keywords: input.keywords } : {}),
    alternates: { canonical },
    robots: input.noIndex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    openGraph: {
      type: input.type ?? 'website',
      title: input.title,
      description: input.description,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'en_IN',
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: input.title }] } : {}),
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: input.title,
      description: input.description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

// Titles are plain strings: the root layout's `%s | StayNearby` template appends
// the brand suffix once, so pages must never add it themselves.

/** Private pages: always noindex, never framed, never cached by intermediaries. */
export function privateMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    robots: { index: false, follow: false, nosnippet: true, nocache: true },
  };
}

export function notFoundMetadata(title = 'Page not found'): Metadata {
  return {
    title,
    description: 'The page you are looking for does not exist or is no longer available.',
    robots: { index: false, follow: false },
  };
}

export function rootMetadata(): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    applicationName: SITE_NAME,
    title: {
      default: `${SITE_NAME} — ${SITE_TAGLINE}`,
      template: `%s${TITLE_SUFFIX}`,
    },
    description: SITE_DESCRIPTION,
    formatDetection: { telephone: false, address: false, email: false },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_IN',
      url: siteUrl,
    },
    twitter: { card: 'summary' },
  };
}
