import { sanitizeMessages } from './helpers';

type AiAction =
  | 'generateBotResponse'
  | 'generateMarketingContent'
  | 'generateWebsiteStructure'
  | 'scrapeWebsite';

type CompletionResponse = { content: string };

const AI_ROUTE = '/api/ai';

async function postToAiService<TResponse>(action: AiAction, payload: Record<string, unknown>): Promise<TResponse> {
  const response = await fetch(AI_ROUTE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, payload }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = typeof errorBody.error === 'string' ? errorBody.error : response.statusText;
    throw new Error(`AI service error: ${message}`);
  }

  return response.json() as Promise<TResponse>;
}

export const scrapeWebsite = async (url: string): Promise<string> => {
  const { content } = await postToAiService<CompletionResponse>('scrapeWebsite', { url });
  return content;
};

export const scrapeWebsiteContent = async (url: string) => {
  return await scrapeWebsite(url);
};

export const generateBotResponse = async (
  systemPromptOrMessages: string | { role: 'system' | 'user' | 'assistant'; content: string }[],
  history?: { role: string; text: string }[],
  userMessage?: string,
  model: string = 'gpt-4o-mini',
  context?: string
): Promise<string> => {
  let messages: { role: 'system' | 'user' | 'assistant'; content: string }[];

  if (Array.isArray(systemPromptOrMessages)) {
    messages = systemPromptOrMessages;
  } else {
    const systemPrompt = systemPromptOrMessages;
    let systemContent = systemPrompt;
    if (context) {
      systemContent += `\n\nRelevant Knowledge Base:\n${context}`;
    }

    messages = [{ role: 'system', content: systemContent }];

    if (history && history.length > 0) {
      for (const msg of history) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.text,
        });
      }
    }

    if (userMessage && (!history || history.length === 0 || history[history.length - 1]?.text !== userMessage)) {
      messages.push({ role: 'user', content: userMessage });
    }
  }

  const { content } = await postToAiService<CompletionResponse>('generateBotResponse', {
    messages: sanitizeMessages(messages),
    model,
  });

  return content;
};

export const generateMarketingContent = async (
  type: string,
  topic: string,
  tone: string
): Promise<string> => {
  const { content } = await postToAiService<CompletionResponse>('generateMarketingContent', { type, topic, tone });
  return content;
};

export const generateWebsiteStructure = async (
  businessName: string,
  description: string
): Promise<string> => {
  const { content } = await postToAiService<CompletionResponse>('generateWebsiteStructure', {
    businessName,
    description,
  });

  return content;
};
