import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../app/api/ai/route';

describe('AI API route', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-api-key';
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalKey;
  });

  it('returns 400 for unsafe scrape URLs', async () => {
    global.fetch = vi.fn();

    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({ action: 'scrapeWebsite', payload: { url: 'http://127.0.0.1' } }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('summarizes website content securely', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (typeof input === 'string' && input.includes('api.openai.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ choices: [{ message: { content: 'summary' } }] }),
        }) as unknown as Promise<Response>;
      }

      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<html><body>example content</body></html>'),
      }) as unknown as Promise<Response>;
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({ action: 'scrapeWebsite', payload: { url: 'https://example.com' } }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.content).toBe('summary');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('api.openai.com'), expect.any(Object));
  });

  it('generates marketing copy via OpenAI', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'copy' } }] }),
      }) as unknown as Promise<Response>
    );

    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        action: 'generateMarketingContent',
        payload: { type: 'email', topic: 'bots', tone: 'upbeat' },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.content).toBe('copy');
  });
});
