import { NextResponse } from 'next/server';
import { isSafeHttpUrl, normalizeUrl, sanitizeMessages, tryScrapeText } from '@/services/helpers';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type AiRequestBody = {
  action?:
    | 'generateBotResponse'
    | 'generateMarketingContent'
    | 'generateWebsiteStructure';
  payload?: Record<string, unknown>;
};

const OPENAI_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

async function requestOpenAiChat(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number; responseFormat?: { type: 'json_object' } }
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured on the server.');
  }

  const response = await fetch(OPENAI_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options?.model ?? 'gpt-4o-mini',
      messages: sanitizeMessages(messages),
      temperature: options?.temperature ?? 0.7,
      ...(options?.responseFormat ? { response_format: options.responseFormat } : {}),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const description = errorData.error?.message || response.statusText;
    throw new Error(`OpenAI request failed: ${description}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function handleScrapeWebsite(url: string): Promise<NextResponse> {
  if (!url || !isSafeHttpUrl(url)) {
    return NextResponse.json({ error: 'Invalid or unsafe URL.' }, { status: 400 });
  }

  const normalizedUrl = normalizeUrl(url);

  try {
    const raw = await tryScrapeText(normalizedUrl);
    const truncated = raw.substring(0, 4000);
    const summary = await requestOpenAiChat(
      [
        {
          role: 'system',
          content:
            'Summarize the website content clearly. Extract business purpose, services, contact info, pricing, hours, or key offerings.',
        },
        { role: 'user', content: truncated },
      ],
      { model: 'gpt-4o-mini', temperature: 0.2 }
    );

    return NextResponse.json({ content: summary });
  } catch (error) {
    console.error('Website scrape failed:', error);
    return NextResponse.json({ error: 'Failed to summarize website content.' }, { status: 502 });
  }
}

async function handleGenerateBotResponse(payload: Record<string, unknown>): Promise<NextResponse> {
  const messages = payload.messages as ChatMessage[] | undefined;
  const model = typeof payload.model === 'string' ? payload.model : 'gpt-4o-mini';

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Messages are required.' }, { status: 400 });
  }

  const content = await requestOpenAiChat(messages, { model });
  return NextResponse.json({ content });
}

async function handleGenerateMarketingContent(payload: Record<string, unknown>): Promise<NextResponse> {
  const type = typeof payload.type === 'string' ? payload.type : '';
  const topic = typeof payload.topic === 'string' ? payload.topic : '';
  const tone = typeof payload.tone === 'string' ? payload.tone : '';

  if (!type || !topic) {
    return NextResponse.json({ error: 'Type and topic are required.' }, { status: 400 });
  }

  const content = await requestOpenAiChat([
    { role: 'system', content: `You are an expert copywriter. Tone: ${tone || 'confident'}.` },
    {
      role: 'user',
      content: `Write a ${type} about ${topic}. Return only the content.`,
    },
  ]);

  return NextResponse.json({ content });
}

async function handleGenerateWebsiteStructure(payload: Record<string, unknown>): Promise<NextResponse> {
  const businessName = typeof payload.businessName === 'string' ? payload.businessName : '';
  const description = typeof payload.description === 'string' ? payload.description : '';

  if (!businessName || !description) {
    return NextResponse.json({ error: 'Business name and description are required.' }, { status: 400 });
  }

  const content = await requestOpenAiChat(
    [
      {
        role: 'system',
        content: 'You are a Website Builder AI. Output JSON with keys: headline, subheadline, features[], ctaText.',
      },
      { role: 'user', content: `Build a landing page structure for ${businessName}. Description: ${description}` },
    ],
    { responseFormat: { type: 'json_object' }, temperature: 0.2 }
  );

  return NextResponse.json({ content });
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server is missing OpenAI credentials.' }, { status: 500 });
  }

  let body: AiRequestBody;
  try {
    body = (await req.json()) as AiRequestBody;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const action = body.action;
  const payload = body.payload ?? {};

  try {
    switch (action) {
      case 'generateBotResponse':
        return await handleGenerateBotResponse(payload);
      case 'generateMarketingContent':
        return await handleGenerateMarketingContent(payload);
      case 'generateWebsiteStructure':
        return await handleGenerateWebsiteStructure(payload);
      default:
        return NextResponse.json({ error: 'Unsupported AI action.' }, { status: 400 });
    }
  } catch (error) {
    console.error('AI route error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
