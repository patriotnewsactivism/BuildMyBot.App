import { describe, it, expect } from 'vitest';
import { buildMarketingTitle, mapMarketingContentRow } from '../marketingService';
import { MarketingContentType } from '../../types';

describe('marketingService helpers', () => {
  it('maps marketing content rows to camelCase keys', () => {
    const row = {
      id: '123',
      user_id: 'user-1',
      content_type: 'email' as MarketingContentType,
      title: 'Test Title',
      content: 'Hello world',
      metadata: { tone: 'Friendly', topic: 'Launch' },
      created_at: '2025-01-01T00:00:00Z',
    };

    const mapped = mapMarketingContentRow(row);
    expect(mapped).toEqual({
      id: '123',
      userId: 'user-1',
      contentType: 'email',
      title: 'Test Title',
      content: 'Hello world',
      metadata: { tone: 'Friendly', topic: 'Launch' },
      createdAt: '2025-01-01T00:00:00Z',
    });
  });

  it('builds bounded, descriptive titles for marketing drafts', () => {
    const longTopic = 'A'.repeat(200);
    const title = buildMarketingTitle('social', longTopic);

    expect(title.startsWith('Social:')).toBe(true);
    expect(title.length).toBeLessThanOrEqual(120);
  });
});
