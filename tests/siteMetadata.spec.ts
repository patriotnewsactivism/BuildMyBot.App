import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSiteUrl, getSiteUrl, sitemapEntries } from '../utils/siteMetadata';

const DEFAULT_URL = 'https://buildmybot.app';

describe('siteMetadata utilities', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the default site URL when env vars are not set', () => {
    vi.unstubAllEnvs();
    expect(getSiteUrl()).toBe(DEFAULT_URL);
  });

  it('prefers SITE_URL when it is valid', () => {
    vi.stubEnv('SITE_URL', 'https://example.com');
    expect(getSiteUrl()).toBe('https://example.com');
  });

  it('falls back to default on invalid env value', () => {
    vi.stubEnv('SITE_URL', 'invalid-url');
    expect(getSiteUrl()).toBe(DEFAULT_URL);
  });

  it('builds a full URL with a leading slash', () => {
    vi.stubEnv('SITE_URL', 'https://example.com');
    expect(buildSiteUrl('/docs')).toBe('https://example.com/docs');
  });

  it('builds a full URL when missing a leading slash', () => {
    vi.stubEnv('SITE_URL', 'https://example.com');
    expect(buildSiteUrl('pricing')).toBe('https://example.com/pricing');
  });

  it('exposes sitemap entries with expected defaults', () => {
    const entry = sitemapEntries[0];
    expect(entry.path).toBe('/');
    expect(entry.changeFrequency).toBe('daily');
    expect(entry.priority).toBe(1);
  });
});
