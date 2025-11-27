// NOTE: Filename retained as geminiService.ts to prevent breaking imports in other files,
// but the implementation has been switched to OpenAI GPT-4o Mini as requested.

import { aiChatLimiter, marketingLimiter, websiteLimiter, rateLimitedRequest } from '../utils/rateLimiter';
import { sanitizeSystemPrompt, sanitizeText } from '../utils/sanitization';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''; 

export const generateBotResponse = async (
  systemPrompt: string,
  history: { role: 'user' | 'model'; text: string }[],
  lastMessage: string,
  modelName: string = 'gpt-4o-mini',
  context?: string, // New: Knowledge Base context
  userId: string = 'anonymous' // For rate limiting
): Promise<string> => {
  if (!API_KEY) return "Configuration Error: OPENAI_API_KEY is missing. Please check your cloud deployment settings.";

  // Sanitize inputs
  const sanitizedPrompt = sanitizeSystemPrompt(systemPrompt);
  const sanitizedMessage = sanitizeText(lastMessage);
  const sanitizedContext = context ? sanitizeText(context) : '';

  try {
    // Apply rate limiting
    return await rateLimitedRequest(
      aiChatLimiter,
      userId,
      async () => {
        // Inject Context into System Prompt if available
        let finalSystemPrompt = sanitizedPrompt;
        if (sanitizedContext && sanitizedContext.trim().length > 0) {
          finalSystemPrompt += `\n\n[CONTEXT / KNOWLEDGE BASE]\nUse the following information to answer user questions. If the answer is not in this context, say you don't know, but offer to take their contact info.\n\n${sanitizedContext}`;
        }

        // Map internal roles to OpenAI roles
        const messages = [
          { role: "system", content: finalSystemPrompt },
          ...history.map(h => ({
            role: h.role === 'model' ? 'assistant' : 'user',
            content: sanitizeText(h.text)
          })),
          { role: "user", content: sanitizedMessage }
        ];

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: messages,
            temperature: 0.7,
            max_tokens: 500
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          console.error("OpenAI API Error:", data.error);
          return "I'm having trouble connecting to the AI service right now.";
        }

        return data.choices[0]?.message?.content || "No response generated.";
      },
      (resetTime) => {
        console.warn(`Rate limit exceeded. Reset in ${Math.ceil(resetTime / 1000)}s`);
      }
    );
  } catch (error: any) {
    console.error("OpenAI Error:", error);

    if (error.message.includes('Rate limit')) {
      return error.message;
    }

    return "Network error. Please check your connection and try again.";
  }
};

export const generateMarketingContent = async (
  type: 'email' | 'social' | 'ad' | 'website' | 'viral-thread' | 'story',
  topic: string,
  tone: string,
  userId: string = 'anonymous'
): Promise<string> => {
  if (!API_KEY) return "Simulated Content: Please add OPENAI_API_KEY to your environment variables.";

  // Sanitize inputs
  const sanitizedTopic = sanitizeText(topic);
  const sanitizedTone = sanitizeText(tone);

  try {
    return await rateLimitedRequest(
      marketingLimiter,
      userId,
      async () => {
        let prompt = `Act as a world-class marketing copywriter. Write a ${sanitizedTone} ${type} about ${sanitizedTopic}. Keep it engaging and conversion-focused.`;

        if (type === 'viral-thread') {
            prompt = `Write a viral Twitter/X thread about ${sanitizedTopic}. Use a hook in the first tweet, short punchy sentences, and a call to action at the end. Tone: ${sanitizedTone}.`;
        } else if (type === 'story') {
            prompt = `Write a script for a 15-second Instagram/TikTok Story about ${sanitizedTopic}. Include visual cues in brackets [like this]. Tone: ${sanitizedTone}.`;
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "Failed to generate content.";
      }
    );
  } catch (error: any) {
    console.error("Marketing Gen Error:", error);

    if (error.message.includes('Rate limit')) {
      return error.message;
    }

    return "Error generating marketing content. Please try again.";
  }
};

export const generateWebsiteStructure = async (
  businessName: string,
  description: string,
  userId: string = 'anonymous'
): Promise<string> => {
   if (!API_KEY) return "{}";

   // Sanitize inputs
   const sanitizedName = sanitizeText(businessName);
   const sanitizedDesc = sanitizeText(description);

   try {
    return await rateLimitedRequest(
      websiteLimiter,
      userId,
      async () => {
        const prompt = `Create a single-page landing page structure for a business named "${sanitizedName}".
        Description: ${sanitizedDesc}.
        Return ONLY a JSON object (no markdown formatting) with keys: "headline", "subheadline", "features" (array of strings), "ctaText".`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              response_format: { type: "json_object" }
            })
          });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "{}";
      }
    );
   } catch (error: any) {
     console.error("Website generation error:", error);

     if (error.message.includes('Rate limit')) {
       throw error;
     }

     return "{}";
   }
}