// AI Service - Calls Supabase Edge Functions for chat completions
import { supabase } from './supabaseClient';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'model';
  content?: string;
  text?: string;
}

export interface AICompletionResponse {
  message: string;
  sessionId: string;
  usage?: {
    current: number;
    limit: number;
  };
}

export interface LeadCaptureRequest {
  botId: string;
  conversationId?: string;
  name?: string;
  email: string;
  phone?: string;
  company?: string;
  score?: number;
}

export interface KnowledgeBaseUpload {
  botId: string;
  content: string;
  sourceType: 'pdf' | 'url' | 'text';
  sourceUrl?: string;
  fileName?: string;
}

/**
 * Generate AI chat completion using Supabase Edge Function
 */
export const generateBotResponse = async (
  systemPrompt: string,
  history: ChatMessage[],
  lastMessage: string,
  modelName: string = 'gpt-4o-mini',
  context?: string,
  botId?: string
): Promise<string> => {
  if (!supabase) {
    console.warn('Supabase not initialized, using mock response');
    return 'I apologize, but the AI service is currently unavailable. Please check your Supabase configuration.';
  }

  try {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn('No active session, using direct OpenAI call');
      // Fallback to direct OpenAI call for unauthenticated users (public chat widgets)
      return await directOpenAICall(systemPrompt, history, lastMessage, modelName, context);
    }

    // Transform history format to match Edge Function expectations
    const conversationHistory = history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : msg.role,
      content: msg.text || msg.content || '',
    }));

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('ai-complete', {
      body: {
        botId: botId || 'test-bot',
        sessionId: `session-${Date.now()}`,
        message: lastMessage,
        conversationHistory,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    return data.message || 'No response generated';
  } catch (error) {
    console.error('AI completion error:', error);
    // Fallback to direct call
    return await directOpenAICall(systemPrompt, history, lastMessage, modelName, context);
  }
};

/**
 * Direct OpenAI API call (fallback for unauthenticated users or errors)
 */
async function directOpenAICall(
  systemPrompt: string,
  history: ChatMessage[],
  lastMessage: string,
  modelName: string,
  context?: string
): Promise<string> {
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

  if (!API_KEY) {
    return "Configuration Error: OpenAI API key is missing.";
  }

  try {
    // Inject context into system prompt if available
    let finalSystemPrompt = systemPrompt;
    if (context && context.trim().length > 0) {
      finalSystemPrompt += `\n\n[KNOWLEDGE BASE CONTEXT]\n${context}`;
    }

    // Transform to OpenAI format
    const messages = [
      { role: "system", content: finalSystemPrompt },
      ...history.map(h => ({
        role: h.role === 'model' ? 'assistant' : h.role,
        content: h.text || h.content || '',
      })),
      { role: "user", content: lastMessage },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("OpenAI API Error:", data.error);
      return "I'm having trouble connecting to the AI service right now.";
    }

    return data.choices[0]?.message?.content || "No response generated.";
  } catch (error) {
    console.error("OpenAI Network Error:", error);
    return "Network error. Please check your connection.";
  }
}

/**
 * Capture a lead from a conversation
 */
export const captureLead = async (leadData: LeadCaptureRequest): Promise<boolean> => {
  if (!supabase) {
    console.error('Supabase not initialized');
    return false;
  }

  try {
    const { data, error } = await supabase.functions.invoke('create-lead', {
      body: leadData,
    });

    if (error) {
      console.error('Lead capture error:', error);
      return false;
    }

    return data.success;
  } catch (error) {
    console.error('Lead capture failed:', error);
    return false;
  }
};

/**
 * Upload and embed knowledge base content
 */
export const uploadKnowledgeBase = async (uploadData: KnowledgeBaseUpload): Promise<boolean> => {
  if (!supabase) {
    console.error('Supabase not initialized');
    return false;
  }

  try {
    const { data, error } = await supabase.functions.invoke('embed-knowledge-base', {
      body: uploadData,
    });

    if (error) {
      console.error('Knowledge base upload error:', error);
      return false;
    }

    return data.success;
  } catch (error) {
    console.error('Knowledge base upload failed:', error);
    return false;
  }
};

/**
 * Check billing quota and usage
 */
export const checkBillingQuota = async (): Promise<{
  allowed: boolean;
  usage: any;
  plan: string;
} | null> => {
  if (!supabase) {
    console.error('Supabase not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase.functions.invoke('billing-overage-check');

    if (error) {
      console.error('Billing check error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Billing check failed:', error);
    return null;
  }
};

/**
 * Install a marketplace template
 */
export const installTemplate = async (templateId: string, customizations?: {
  name?: string;
  themeColor?: string;
}): Promise<any | null> => {
  if (!supabase) {
    console.error('Supabase not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase.functions.invoke('marketplace-install-template', {
      body: { templateId, customizations },
    });

    if (error) {
      console.error('Template installation error:', error);
      return null;
    }

    return data.bot;
  } catch (error) {
    console.error('Template installation failed:', error);
    return null;
  }
};

/**
 * Generate marketing content (keeps using direct OpenAI for now)
 */
export const generateMarketingContent = async (
  type: 'email' | 'social' | 'ad' | 'website' | 'viral-thread' | 'story',
  topic: string,
  tone: string
): Promise<string> => {
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

  if (!API_KEY) {
    return "Simulated Content: Please add OPENAI_API_KEY to your environment variables.";
  }

  try {
    let prompt = `Act as a world-class marketing copywriter. Write a ${tone} ${type} about ${topic}. Keep it engaging and conversion-focused.`;

    if (type === 'viral-thread') {
      prompt = `Write a viral Twitter/X thread about ${topic}. Use a hook in the first tweet, short punchy sentences, and a call to action at the end. Tone: ${tone}.`;
    } else if (type === 'story') {
      prompt = `Write a script for a 15-second Instagram/TikTok Story about ${topic}. Include visual cues in brackets [like this]. Tone: ${tone}.`;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || "Failed to generate content.";
  } catch (error) {
    console.error("Marketing Gen Error:", error);
    return "Error generating marketing content.";
  }
};

/**
 * Generate website structure (keeps using direct OpenAI for now)
 */
export const generateWebsiteStructure = async (businessName: string, description: string): Promise<string> => {
  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

  if (!API_KEY) return "{}";

  try {
    const prompt = `Create a single-page landing page structure for a business named "${businessName}".
    Description: ${description}.
    Return ONLY a JSON object (no markdown formatting) with keys: "headline", "subheadline", "features" (array of strings), "ctaText".`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || "{}";
  } catch (e) {
    return "{}";
  }
};
