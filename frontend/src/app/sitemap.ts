import type { MetadataRoute } from 'next';
import { buildSitemap, staticSitemapEntries } from '@/lib/seo/sitemap';

/**
 * Dynamic sitemap generating search-engine indexable entries for:
 * - Core marketing pages
 * - Top cities and localized landing pages (PGs in Bangalore, flats in Mumbai, etc.)
 * - Verified public rental inventory listings
 *
 * Automatically falls back to static entries when building without active DB connection.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    return await buildSitemap();
  } catch {
    return staticSitemapEntries();
  }
}
