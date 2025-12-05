
import { supabase } from './supabaseClient';

// Use process.env provided by Vite define config to avoid import.meta issues
const getApiKey = () => process.env.VITE_OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const getSupabaseUrl = () => import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

// Check if we should use edge functions (when Supabase is configured)
const useEdgeFunctions = () => {
  return !!getSupabaseUrl() && !!supabase;
};

/**
 * Generate bot response - uses edge function when available for security
 */
export const generateBotResponse = async (
  systemPrompt: string,
  history: { role: 'user' | 'model'; text: string }[],
  lastMessage: string,
  modelName: string = 'gpt-4o-mini',
  context?: string,
  botId?: string,
  sessionId?: string
): Promise<string> => {
  // If we have a botId and Supabase is configured, use edge function
  if (botId && useEdgeFunctions()) {
    try {
      const session = await supabase?.auth.getSession();
      const supabaseUrl = getSupabaseUrl();

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.data?.session?.access_token && {
            'Authorization': `Bearer ${session.data.session.access_token}`,
          }),
        },
        body: JSON.stringify({
          bot_id: botId,
          messages: [...history, { role: 'user', text: lastMessage }],
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 402) {
          return error.error || "Usage limit exceeded. Please upgrade your plan.";
        }
        throw new Error(error.error || 'AI completion failed');
      }

      const data = await response.json();
      return data.response;
    } catch (error: unknown) {
      console.error("Edge function error, falling back to direct API:", error);
      // Fall through to direct API call
    }
  }

  // Direct OpenAI API call (fallback or demo mode)
  const apiKey = getApiKey();
  if (!apiKey) return "Error: API Key is missing. Please check your configuration.";

  // Construct messages
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt }
  ];

  if (context) {
    messages[0].content += `\n\n### KNOWLEDGE BASE:\n${context}\n\n### INSTRUCTIONS:\nAnswer strictly based on the provided Knowledge Base. If the answer is not in the text, state that you do not have that information.`;
  }

  history.forEach(msg => {
    messages.push({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.text
    });
  });

  messages.push({ role: 'user', content: lastMessage });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || response.statusText);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch (error: unknown) {
    console.error("OpenAI Error:", error);
    return "I'm having trouble connecting to the AI service right now. Please check your internet connection or API Key.";
  }
};

/**
 * Create lead from chat widget - uses edge function for public access
 */
export const createLeadFromChat = async (
  botId: string,
  name: string,
  email: string,
  phone?: string,
  conversationId?: string
): Promise<{ success: boolean; lead_id?: string; error?: string }> => {
  const supabaseUrl = getSupabaseUrl();

  if (!supabaseUrl) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/create-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bot_id: botId,
        name,
        email,
        phone,
        conversation_id: conversationId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create lead' };
    }

    return { success: true, lead_id: data.lead_id };
  } catch (error: unknown) {
    console.error("Create lead error:", error);
    return { success: false, error: 'Network error' };
  }
};

export const scrapeWebsiteContent = async (url: string): Promise<string> => {
  if (!url) return "";
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  try {
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    // 1. Scrape using Jina via CORS Proxy to avoid browser blocking
    // Using corsproxy.io to bypass Access-Control-Allow-Origin errors in browser
    const proxyUrl = 'https://corsproxy.io/?';
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;

    const scrapeResponse = await fetch(proxyUrl + encodeURIComponent(jinaUrl));

    if (!scrapeResponse.ok) throw new Error("Failed to scrape website.");

    const rawText = await scrapeResponse.text();
    const truncatedText = rawText.substring(0, 20000); // Limit context window

    // 2. Summarize using GPT-4o-mini
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a precise Data Extractor. Extract business facts.' },
          { role: 'user', content: `Analyze this content and extract:\n1. Business Name & Description\n2. Key Services\n3. Contact Info\n4. Pricing/Hours\n\nCONTENT:\n${truncatedText}` }
        ]
      })
    });

    if (!response.ok) throw new Error("Failed to summarize content.");
    const data = await response.json();
    return data.choices[0]?.message?.content || rawText.substring(0, 1000);

  } catch (error: unknown) {
    console.error("Scrape Error:", error);
    throw new Error("Failed to scrape website. " + ((error as Error).message || ""));
  }
};

export const generateMarketingContent = async (type: string, topic: string, tone: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "Error: API Key missing.";

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `You are an expert Copywriter. Tone: ${tone}.` },
          { role: 'user', content: `Write a ${type} about ${topic}. Return ONLY the content, no filler.` }
        ]
      })
    });
    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch {
    return "Failed to generate content.";
  }
};

export const generateWebsiteStructure = async (businessName: string, description: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: "json_object" },
        messages: [
          { role: 'system', content: 'You are a Website Builder AI. Output JSON only with keys: headline, subheadline, features (array of strings), ctaText.' },
          { role: 'user', content: `Generate landing page structure for "${businessName}". Description: ${description}` }
        ]
      })
    });
    const data = await response.json();
    return data.choices[0]?.message?.content || "{}";
  } catch (e) {
    console.error(e);
    throw e;
  }
};

// Legacy alias
export const simulateWebScrape = scrapeWebsiteContent;
