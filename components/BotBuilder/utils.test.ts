import { describe, expect, it } from 'vitest';
import { buildAiCompleteMessages, deriveSentiment, PreviewMessage } from './utils';
import { Bot } from '../../types';

const baseBot: Bot = {
  id: 'bot-test',
  name: 'Test Bot',
  type: 'Custom',
  systemPrompt: 'You are a helpful assistant.',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  knowledgeBase: [],
  active: true,
  conversationsCount: 0,
  themeColor: '#000000',
};

describe('deriveSentiment', () => {
  it('detects positive sentiment from final message', () => {
    const messages: PreviewMessage[] = [
      { role: 'assistant', text: 'How can I help?', timestamp: Date.now() },
      { role: 'user', text: 'Thanks that was great', timestamp: Date.now() },
    ];

    expect(deriveSentiment(messages)).toBe('Positive');
  });

  it('detects negative sentiment from final message', () => {
    const messages: PreviewMessage[] = [
      { role: 'assistant', text: 'Let me try again', timestamp: Date.now() },
      { role: 'user', text: 'This is bad and I am unhappy', timestamp: Date.now() },
    ];

    expect(deriveSentiment(messages)).toBe('Negative');
  });

  it('falls back to neutral when unclear', () => {
    const messages: PreviewMessage[] = [
      { role: 'assistant', text: 'Hello', timestamp: Date.now() },
    ];

    expect(deriveSentiment(messages)).toBe('Neutral');
  });
});

describe('buildAiCompleteMessages', () => {
  it('includes system prompt and converts history roles', () => {
    const messages = buildAiCompleteMessages(baseBot, [
      { role: 'user', text: 'Hello', timestamp: 0 },
      { role: 'assistant', text: 'Hi there!', timestamp: 1 },
    ]);

    expect(messages[0]).toEqual({
      role: 'system',
      content: 'You are a helpful assistant.',
    });
    expect(messages[1]).toEqual({ role: 'user', content: 'Hello' });
    expect(messages[2]).toEqual({ role: 'assistant', content: 'Hi there!' });
  });

  it('appends knowledge base content when available', () => {
    const botWithKb: Bot = {
      ...baseBot,
      knowledgeBase: ['Fact one', 'Fact two'],
    };

    const [system] = buildAiCompleteMessages(botWithKb, []);
    expect(system.content).toContain('Reference Knowledge Base');
    expect(system.content).toContain('Fact one');
    expect(system.content).toContain('Fact two');
  });
});
