import type { MetadataRoute } from 'next';

const DEFAULT_SITE_URL = 'https://buildmybot.app';

export type SitemapEntry = {
  path: string;
  changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority?: number;
  lastModified?: string | Date;
};

export const sitemapEntries: SitemapEntry[] = [
  {
    path: '/',
    changeFrequency: 'daily',
    priority: 1,
  },
];

export function getSiteUrl(): string {
  const candidate = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;

  if (candidate) {
    try {
      return new URL(candidate).origin;
    } catch (error) {
      console.warn('Invalid site URL provided in environment, falling back to default.', error);
    }
  }

  return DEFAULT_SITE_URL;
}

export function buildSiteUrl(path: string = '/'): string {
  const base = getSiteUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const trimmedPath = normalizedPath === '/' ? '/' : normalizedPath.replace(/\/$/, '');

  return `${base}${trimmedPath}`;
}
