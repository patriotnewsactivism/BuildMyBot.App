import { describe, expect, it, vi } from 'vitest';
import robots from '../app/robots';
import sitemap from '../app/sitemap';

vi.mock('@/utils/siteMetadata', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/siteMetadata')>();
  return {
    ...actual,
    getSiteUrl: () => 'https://example.com',
    buildSiteUrl: (path: string) => `https://example.com${path.startsWith('/') ? path : `/${path}`}`,
  };
});

describe('metadata routes', () => {
  it('builds robots.txt metadata with sitemap', () => {
    const robotsConfig = robots();
    expect(robotsConfig.host).toBe('https://example.com');
    expect(robotsConfig.sitemap?.[0]).toBe('https://example.com/sitemap.xml');
    expect(robotsConfig.rules?.[0]?.allow).toBe('/');
  });

  it('builds sitemap entries with defaults', () => {
    const entries = sitemap();
    expect(entries).toHaveLength(1);
    expect(entries[0].url).toBe('https://example.com/');
    expect(entries[0].changeFrequency).toBe('daily');
  });
});
