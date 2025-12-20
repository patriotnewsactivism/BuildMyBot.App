import type { MetadataRoute } from 'next';
import { buildSiteUrl, getSiteUrl } from '@/utils/siteMetadata';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const sitemapUrl = `${buildSiteUrl('/sitemap.xml')}`;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: [sitemapUrl],
    host: siteUrl,
  };
}
