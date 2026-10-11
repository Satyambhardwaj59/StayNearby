import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/config/env';
import { PRIVATE_PATH_PREFIXES } from '@/lib/seo/sitemap';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [...PRIVATE_PATH_PREFIXES],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
