import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateChatResponse(
  messages: Array<{ role: string; content: string }>,
  model: string = 'gpt-4o-mini',
  temperature: number = 0.7
) {
  const response = await openai.chat.completions.create({
    model,
    messages: messages as any,
    temperature,
  });

  return response.choices[0]?.message?.content || '';
}
