// SEC-009 FIX: All Gemini AI calls now route through Edge Functions
// NO API keys are stored client-side - they're only in Supabase secrets
import { supabase } from './supabaseClient';

const getSupabaseUrl = () => process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

// Helper to get auth token for Edge Function calls
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }

  return headers;
};

export const generateBotResponse = async (
  systemPrompt: string,
  history: { role: 'user' | 'model'; text: string }[],
  lastMessage: string,
  modelName: string = 'gemini-2.5-flash',
  context?: string
): Promise<string> => {
  const supabaseUrl = getSupabaseUrl();

  if (!supabaseUrl) {
    return "Configuration Error: Supabase URL is missing.";
  }

  // Build messages array for the Edge Function
  const messages = [
    ...history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' as const : 'user' as const,
      content: msg.text
    })),
    { role: 'user' as const, content: lastMessage }
  ];

  try {
    const headers = await getAuthHeaders();

    // Route through ai-complete Edge Function with Gemini model
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        botId: 'gemini-direct',
        messages,
        sessionId: `gemini-${Date.now()}`,
        directConfig: {
          systemPrompt: context
            ? `${systemPrompt}\n\n### KNOWLEDGE BASE:\n${context}\n\n### INSTRUCTIONS:\nAnswer strictly based on the provided Knowledge Base.`
            : systemPrompt,
          model: modelName,
          temperature: 0.7,
          provider: 'gemini' // Signal to use Gemini instead of OpenAI
        }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Edge Function Error:", err);
      throw new Error(err.error || response.statusText);
    }

    const data = await response.json();
    return data.message || "I apologize, but I couldn't generate a response.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to the AI service right now. Please try again later.";
  }
};

export const scrapeWebsiteContent = async (url: string): Promise<string> => {
  if (!url) return "";

  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    throw new Error("Configuration missing");
  }

  try {
    const headers = await getAuthHeaders();

    // Route through scrape-url Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/scrape-url`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url, summarize: true }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to scrape website");
    }

    const data = await response.json();
    return data.content || "";
  } catch (error: any) {
    console.error("Scrape Error:", error);
    throw new Error("Failed to scrape website. " + (error.message || ""));
  }
};

export const generateMarketingContent = async (type: string, topic: string, tone: string): Promise<string> => {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return "Error: Configuration missing.";

  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${supabaseUrl}/functions/v1/ai-complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        botId: 'marketing-gemini',
        messages: [
          { role: 'user', content: `Write a ${type} about ${topic}. Return ONLY the content, no filler.` }
        ],
        sessionId: `marketing-${Date.now()}`,
        directConfig: {
          systemPrompt: `You are an expert Copywriter. Tone: ${tone}.`,
          model: 'gemini-2.5-flash',
          temperature: 0.8,
          provider: 'gemini'
        }
      })
    });

    if (!response.ok) {
      throw new Error("Failed to generate content");
    }

    const data = await response.json();
    return data.message || "";
  } catch (e) {
    console.error("Marketing content error:", e);
    return "Failed to generate content.";
  }
};

export const generateWebsiteStructure = async (businessName: string, description: string): Promise<string> => {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Configuration missing");

  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${supabaseUrl}/functions/v1/ai-complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        botId: 'website-gemini',
        messages: [
          { role: 'user', content: `Generate landing page structure for "${businessName}". Description: ${description}` }
        ],
        sessionId: `website-${Date.now()}`,
        directConfig: {
          systemPrompt: 'You are a Website Builder AI. Output JSON only.',
          model: 'gemini-2.5-flash',
          temperature: 0.7,
          responseFormat: 'json',
          provider: 'gemini'
        }
      })
    });

    if (!response.ok) {
      throw new Error("Failed to generate website structure");
    }

    const data = await response.json();
    return data.message || "{}";
  } catch (e) {
    console.error("Website structure error:", e);
    throw e;
  }
};
