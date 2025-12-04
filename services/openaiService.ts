// ============================================================================
// BuildMyBot.app - OpenAI Service
// Production-Ready: Uses Supabase Edge Functions for Security
// ============================================================================

import { supabase } from './supabaseClient';
import { ConversationMessage } from '../types';

// ============================================================================
// Main Chat Completion Function
// SECURITY: Calls Supabase Edge Function (chat-completion) instead of OpenAI directly
// This hides the API key from the frontend
// ============================================================================
export const generateBotResponse = async (
  systemPrompt: string,
  history: { role: 'user' | 'model' | 'assistant'; text: string }[],
  lastMessage: string,
  modelName: string = 'gpt-4o-mini',
  context?: string
): Promise<string> => {
  if (!supabase) {
    return "Error: Supabase is not configured. Please check your environment variables.";
  }

  try {
    // Enhance system prompt with knowledge base context
    let enhancedSystemPrompt = systemPrompt;
    if (context) {
      enhancedSystemPrompt += `\n\n### KNOWLEDGE BASE:\n${context}\n\n### INSTRUCTIONS:\nAnswer strictly based on the provided Knowledge Base. If the answer is not in the text, state that you do not have that information.`;
    }

    // Convert history format to OpenAI format
    const formattedMessages = history.map((msg) => ({
      role: msg.role === 'model' ? 'assistant' : msg.role,
      content: msg.text,
    }));

    // Add the current user message
    formattedMessages.push({
      role: 'user',
      content: lastMessage,
    });

    // Call Supabase Edge Function (chat-completion)
    const { data, error } = await supabase.functions.invoke('chat-completion', {
      body: {
        systemPrompt: enhancedSystemPrompt,
        messages: formattedMessages,
        model: modelName,
      },
    });

    if (error) {
      console.error('Edge Function Error:', error);

      // User-friendly error messages
      if (error.message?.includes('quota')) {
        return "I'm currently experiencing high demand. Please try again in a moment.";
      }
      if (error.message?.includes('API')) {
        return "I'm having trouble connecting to my AI service. Please contact support if this persists.";
      }

      return "I apologize, but I'm unable to respond right now. Please try again.";
    }

    if (!data?.reply) {
      console.error('No reply in response:', data);
      return "I received your message but couldn't generate a response. Please try again.";
    }

    return data.reply;

  } catch (error) {
    console.error('generateBotResponse Error:', error);
    return "I'm experiencing technical difficulties. Please try again shortly.";
  }
};

// ============================================================================
// Website Scraping & Summarization
// Uses Jina AI reader + OpenAI for intelligent content extraction
// ============================================================================
export const scrapeWebsiteContent = async (url: string): Promise<string> => {
  if (!url) return "";

  try {
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    // Step 1: Scrape using Jina AI (via CORS proxy)
    const proxyUrl = 'https://corsproxy.io/?';
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;

    const scrapeResponse = await fetch(proxyUrl + encodeURIComponent(jinaUrl), {
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!scrapeResponse.ok) {
      throw new Error(`Failed to fetch website content (Status: ${scrapeResponse.status})`);
    }

    const rawText = await scrapeResponse.text();
    const truncatedText = rawText.substring(0, 20000); // Limit context window

    // Step 2: Summarize using Edge Function
    if (!supabase) {
      // Fallback: Return raw text if Supabase unavailable
      return truncatedText.substring(0, 2000);
    }

    const { data, error } = await supabase.functions.invoke('chat-completion', {
      body: {
        systemPrompt: 'You are a precise Data Extractor. Extract business facts from website content.',
        messages: [
          {
            role: 'user',
            content: `Analyze this content and extract:\n1. Business Name & Description\n2. Key Services/Products\n3. Contact Info\n4. Pricing/Hours (if available)\n\nCONTENT:\n${truncatedText}`,
          },
        ],
        model: 'gpt-4o-mini',
      },
    });

    if (error || !data?.reply) {
      // Fallback: Return truncated raw text
      return truncatedText.substring(0, 2000);
    }

    return data.reply;

  } catch (error) {
    console.error('scrapeWebsiteContent Error:', error);

    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error("Website took too long to respond. Please try a different URL.");
    }

    throw new Error("Failed to process website content. The site may be blocking automated access.");
  }
};

// ============================================================================
// Marketing Content Generator
// Generates viral posts, email campaigns, etc.
// ============================================================================
export const generateMarketingContent = async (
  type: string,
  topic: string,
  tone: string
): Promise<string> => {
  if (!supabase) {
    return "Error: Marketing generator requires Supabase configuration.";
  }

  try {
    const { data, error } = await supabase.functions.invoke('chat-completion', {
      body: {
        systemPrompt: `You are an expert Copywriter. Tone: ${tone}. Never include meta-commentary or explanations—only output the requested content.`,
        messages: [
          {
            role: 'user',
            content: `Write a ${type} about "${topic}". Return ONLY the content, no filler or introductions.`,
          },
        ],
        model: 'gpt-4o-mini',
      },
    });

    if (error || !data?.reply) {
      return "Unable to generate content. Please try again.";
    }

    return data.reply;

  } catch (error) {
    console.error('generateMarketingContent Error:', error);
    return "Failed to generate marketing content.";
  }
};

// ============================================================================
// Website Structure Generator
// Creates landing page structure for AI website builder
// ============================================================================
export const generateWebsiteStructure = async (
  businessName: string,
  description: string
): Promise<string> => {
  if (!supabase) {
    throw new Error("Website builder requires Supabase configuration.");
  }

  try {
    const { data, error } = await supabase.functions.invoke('chat-completion', {
      body: {
        systemPrompt: 'You are a Website Builder AI. Output JSON only with keys: headline, subheadline, features (array of strings), ctaText. Do not include any markdown code blocks or extra text.',
        messages: [
          {
            role: 'user',
            content: `Generate a landing page structure for "${businessName}". Description: ${description}. Return pure JSON only.`,
          },
        ],
        model: 'gpt-4o-mini',
      },
    });

    if (error || !data?.reply) {
      throw new Error("Failed to generate website structure.");
    }

    // Remove markdown code blocks if present
    let cleanedReply = data.reply.trim();
    if (cleanedReply.startsWith('```json')) {
      cleanedReply = cleanedReply.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedReply.startsWith('```')) {
      cleanedReply = cleanedReply.replace(/```\n?/g, '');
    }

    // Validate JSON
    JSON.parse(cleanedReply);

    return cleanedReply;

  } catch (error) {
    console.error('generateWebsiteStructure Error:', error);
    throw error;
  }
};

// ============================================================================
// Legacy Alias (for backwards compatibility)
// ============================================================================
export const simulateWebScrape = scrapeWebsiteContent;
