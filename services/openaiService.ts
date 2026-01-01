// OpenAI Service - Now routes through secure Edge Functions
// API keys are never exposed to the browser
import { supabase } from './supabaseClient';

const SUPABASE_FUNCTION_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') || 'https://qjwwkcoredotrjtstigt.supabase.co';

export const generateBotResponse = async (
  systemPrompt: string,
  history: { role: 'user' | 'model'; text: string }[],
  lastMessage: string,
  modelName: string = 'gpt-4o-mini',
  context?: string,
  botId?: string,
  userId?: string
): Promise<string> => {
  // Construct messages for Edge Function
  const messages: any[] = [
    { role: 'system', content: systemPrompt }
  ];

  if (context) {
    messages[0].content += `\n\n### KNOWLEDGE BASE (Use this to answer):\n${context}\n\n### INSTRUCTIONS:\nAnswer strictly based on the provided Knowledge Base. If the answer is not in the text, state that you do not have that information.`;
  }

  history.forEach(msg => {
    messages.push({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.text
    });
  });

  messages.push({ role: 'user', content: lastMessage });

  try {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Call Edge Function instead of OpenAI directly
    const response = await fetch(`${SUPABASE_FUNCTION_URL}/functions/v1/ai-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      },
      body: JSON.stringify({
        botId: botId || 'demo-bot',
        messages: messages,
        sessionId: `session-${Date.now()}`,
        userId: userId,
        skipLogging: !botId // Don't log if no botId (preview mode)
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error("Edge Function Error:", err);
      throw new Error(err.error || response.statusText);
    }

    const data = await response.json();
    return data.reply || data.message || "";
  } catch (error: any) {
    console.error("AI Service Error:", error);
    return "I'm having trouble connecting right now. Please try again in a moment.";
  }
};

export const scrapeWebsiteContent = async (url: string): Promise<string> => {
  if (!url) return "";

  try {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Call scrape-url Edge Function (server-side, no CORS issues)
    const response = await fetch(`${SUPABASE_FUNCTION_URL}/functions/v1/scrape-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      },
      body: JSON.stringify({
        url: url,
        summarize: true
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Scrape failed' }));
      throw new Error(err.error || "Failed to scrape website");
    }

    const data = await response.json();
    return data.content || data.summary || "";

  } catch (error: any) {
    console.error("Scrape Error:", error);
    throw new Error("Failed to scrape website. " + (error.message || ""));
  }
};

export const generateMarketingContent = async (type: string, topic: string, tone: string): Promise<string> => {
    try {
        // Get auth token
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
            return "Please sign in to generate marketing content.";
        }

        // Call ai-complete Edge Function in marketing mode
        const response = await fetch(`${SUPABASE_FUNCTION_URL}/functions/v1/ai-complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
            },
            body: JSON.stringify({
                mode: 'marketing',
                variant: type,
                topic: topic,
                tone: tone
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Generation failed' }));
            throw new Error(err.error || "Failed to generate content");
        }

        const data = await response.json();
        return data.content || "";
    } catch (e: any) {
        console.error("Marketing content error:", e);
        return "Failed to generate content. Please try again.";
    }
};

export const generateWebsiteStructure = async (businessName: string, description: string): Promise<string> => {
    try {
        // Get auth token
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
            throw new Error("Please sign in to generate website structure");
        }

        // Call ai-complete Edge Function for website generation
        const response = await fetch(`${SUPABASE_FUNCTION_URL}/functions/v1/ai-complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
            },
            body: JSON.stringify({
                mode: 'marketing',
                variant: 'website',
                topic: `${businessName}: ${description}`,
                tone: 'Professional'
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Generation failed' }));
            throw new Error(err.error || "Failed to generate structure");
        }

        const data = await response.json();
        return data.content || "{}";
    } catch (e) {
        console.error("Website generation error:", e);
        throw e;
    }
};

// Legacy alias
export const simulateWebScrape = scrapeWebsiteContent;