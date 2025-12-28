import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { generateBotResponse, generateMarketingContent } from '../services/openaiService';

describe('openaiService client helpers', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ content: 'mock-content' }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('posts marketing content requests to the AI API route', async () => {
    const content = await generateMarketingContent('email', 'new product', 'friendly');

    expect(content).toBe('mock-content');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const fetchMock = global.fetch as unknown as Mock;
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);

    expect(body.action).toBe('generateMarketingContent');
    expect(body.payload).toEqual({ type: 'email', topic: 'new product', tone: 'friendly' });
  });

  it('sends sanitized bot messages to the AI API route', async () => {
    await generateBotResponse('You are helpful', [{ role: 'user', text: 'Hi' }], 'How are you?');

    const fetchMock = global.fetch as unknown as Mock;
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);

    expect(body.action).toBe('generateBotResponse');
    expect(Array.isArray(body.payload.messages)).toBe(true);
    expect(body.payload.messages[0].role).toBe('system');
  });
});
