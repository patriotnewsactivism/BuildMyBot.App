import type { MetadataRoute } from 'next';
import { buildSiteUrl, sitemapEntries } from '@/utils/siteMetadata';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return sitemapEntries.map((entry) => ({
    url: buildSiteUrl(entry.path),
    changefreq: entry.changeFrequency,
    priority: entry.priority,
    lastModified: entry.lastModified ? new Date(entry.lastModified) : lastModified,
  }));
}
