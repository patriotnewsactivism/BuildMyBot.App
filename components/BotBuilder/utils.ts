import { Bot } from '../../types';

export type PreviewMessage = {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
};

const POSITIVE_KEYWORDS = ['great', 'helpful', 'thanks', 'appreciate', 'love', 'good'];
const NEGATIVE_KEYWORDS = ['angry', 'upset', 'bad', 'frustrated', 'hate', 'unhappy'];

export const deriveSentiment = (
  messages: PreviewMessage[]
): 'Positive' | 'Neutral' | 'Negative' => {
  if (messages.length === 0) return 'Neutral';

  const text = messages[messages.length - 1].text.toLowerCase();
  const positiveHits = POSITIVE_KEYWORDS.some((keyword) => text.includes(keyword));
  const negativeHits = NEGATIVE_KEYWORDS.some((keyword) => text.includes(keyword));

  if (positiveHits && !negativeHits) return 'Positive';
  if (negativeHits && !positiveHits) return 'Negative';
  return 'Neutral';
};

export const buildAiCompleteMessages = (
  bot: Bot,
  history: PreviewMessage[]
) => {
  const systemPrompt = bot.systemPrompt || 'You are a helpful assistant.';
  const knowledgeBase = bot.knowledgeBase?.filter(Boolean).join('\n\n') || '';
  const systemContent = knowledgeBase
    ? `${systemPrompt}\n\nReference Knowledge Base:\n${knowledgeBase}`
    : systemPrompt;

  return [
    { role: 'system' as const, content: systemContent },
    ...history.map((msg) => ({
      role: msg.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: msg.text,
    })),
  ];
};
