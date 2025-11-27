/**
 * AI Routes
 * OpenAI integration for chat, marketing, and website generation
 */

import { Router, Request, Response } from 'express';
import OpenAI from 'openai';

const router = Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/ai/chat
 * Generate bot response using OpenAI
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { systemPrompt, history = [], lastMessage, modelName = 'gpt-4o-mini', context } = req.body;

    if (!systemPrompt || !lastMessage) {
      return res.status(400).json({ error: 'systemPrompt and lastMessage are required' });
    }

    // Inject context into system prompt if available
    let finalSystemPrompt = systemPrompt;
    if (context && context.trim().length > 0) {
      finalSystemPrompt += `\n\n[CONTEXT / KNOWLEDGE BASE]\nUse the following information to answer user questions. If the answer is not in this context, say you don't know, but offer to take their contact info.\n\n${context}`;
    }

    // Map internal roles to OpenAI roles
    const messages: any[] = [
      { role: 'system', content: finalSystemPrompt },
      ...history.map((h: any) => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.text,
      })),
      { role: 'user', content: lastMessage },
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || 'No response generated.';

    res.json({
      response: responseText,
      usage: completion.usage,
      model: completion.model,
    });
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({
      error: 'Failed to generate response',
      message: error.message,
    });
  }
});

/**
 * POST /api/ai/marketing
 * Generate marketing content
 */
router.post('/marketing', async (req: Request, res: Response) => {
  try {
    const { type, topic, tone } = req.body;

    if (!type || !topic || !tone) {
      return res.status(400).json({ error: 'type, topic, and tone are required' });
    }

    let prompt = `Act as a world-class marketing copywriter. Write a ${tone} ${type} about ${topic}. Keep it engaging and conversion-focused.`;

    if (type === 'viral-thread') {
      prompt = `Write a viral Twitter/X thread about ${topic}. Use a hook in the first tweet, short punchy sentences, and a call to action at the end. Tone: ${tone}.`;
    } else if (type === 'story') {
      prompt = `Write a script for a 15-second Instagram/TikTok Story about ${topic}. Include visual cues in brackets [like this]. Tone: ${tone}.`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
    });

    const content = completion.choices[0]?.message?.content || 'Failed to generate content.';

    res.json({ content, usage: completion.usage });
  } catch (error: any) {
    console.error('Marketing Generation Error:', error);
    res.status(500).json({
      error: 'Failed to generate marketing content',
      message: error.message,
    });
  }
});

/**
 * POST /api/ai/website
 * Generate website structure
 */
router.post('/website', async (req: Request, res: Response) => {
  try {
    const { businessName, description } = req.body;

    if (!businessName || !description) {
      return res.status(400).json({ error: 'businessName and description are required' });
    }

    const prompt = `Create a single-page landing page structure for a business named "${businessName}".
    Description: ${description}.
    Return ONLY a JSON object with keys: "headline", "subheadline", "features" (array of strings), "ctaText".`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const structure = completion.choices[0]?.message?.content || '{}';

    res.json({
      structure: JSON.parse(structure),
      usage: completion.usage,
    });
  } catch (error: any) {
    console.error('Website Generation Error:', error);
    res.status(500).json({
      error: 'Failed to generate website structure',
      message: error.message,
    });
  }
});

export default router;
