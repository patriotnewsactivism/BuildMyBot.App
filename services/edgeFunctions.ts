// Edge Functions Service
// Provides typed interfaces for calling Supabase Edge Functions

import { supabase } from './supabaseClient';

// Support both Next.js and Vite environment variable patterns
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AiCompleteResponse {
  message: string;
  conversationId: string;
  tokensUsed: number;
}

interface LeadResponse {
  message: string;
  lead?: {
    id: string;
    name: string;
    email: string;
    score: number;
    status: string;
  };
  leadId?: string;
  duplicate?: boolean;
}

interface EmbedKnowledgeBaseResponse {
  message: string;
  fileName: string;
  chunksProcessed: number;
  totalTokens: number;
}

interface BillingCheckResponse {
  allowed: boolean;
  plan: string;
  limit: number | 'unlimited';
  used: number;
  remaining: number | 'unlimited';
  requested?: number;
  reason?: string | null;
}

interface MarketplaceInstallResponse {
  message: string;
  bot: {
    id: string;
    name: string;
    type: string;
  };
  template: {
    id: string;
    name: string;
    category: string;
  };
}

interface ReferralTrackResponse {
  message: string;
  reseller?: {
    id: string;
    name: string;
  };
  userId?: string;
  referralCode?: string;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const session = await supabase?.auth.getSession();
  const accessToken = session?.data?.session?.access_token;

  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
  };
}

export const edgeFunctions = {
  /**
   * Generate AI chat completion
   * Uses RAG with knowledge base and tracks usage
   */
  aiComplete: async (
    botId: string,
    messages: ChatMessage[],
    sessionId: string
  ): Promise<AiCompleteResponse> => {
    const headers = await getAuthHeaders();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ botId, messages, sessionId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'AI completion failed');
    }

    return response.json();
  },

  /**
   * Create a new lead from chat interaction
   */
  createLead: async (
    botId: string,
    name: string,
    email: string,
    options?: {
      phone?: string;
      score?: number;
      sourceUrl?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<LeadResponse> => {
    const headers = await getAuthHeaders();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-lead`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        botId,
        name,
        email,
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create lead');
    }

    return response.json();
  },

  /**
   * Upload and embed knowledge base content
   * Automatically chunks text and generates embeddings
   */
  embedKnowledgeBase: async (
    botId: string,
    content: string,
    fileName: string,
    options?: {
      fileType?: string;
      fileUrl?: string;
      chunkSize?: number;
    }
  ): Promise<EmbedKnowledgeBaseResponse> => {
    const headers = await getAuthHeaders();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/embed-knowledge-base`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        botId,
        content,
        fileName,
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to embed knowledge base');
    }

    return response.json();
  },

  /**
   * Check if user is within their plan limits
   */
  checkBillingOverage: async (
    userId: string,
    eventType: 'api_call' | 'message' | 'lead_capture' | 'storage_mb',
    quantity?: number
  ): Promise<BillingCheckResponse> => {
    const headers = await getAuthHeaders();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/billing-overage-check`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId, eventType, quantity }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Billing check failed');
    }

    return response.json();
  },

  /**
   * Install a marketplace template as a new bot
   */
  installTemplate: async (
    templateId: string,
    botName?: string
  ): Promise<MarketplaceInstallResponse> => {
    const headers = await getAuthHeaders();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/marketplace-install-template`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ templateId, botName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to install template');
    }

    return response.json();
  },

  /**
   * Track a referral from a reseller code
   */
  trackReferral: async (
    referralCode: string,
    userId: string
  ): Promise<ReferralTrackResponse> => {
    const headers = await getAuthHeaders();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/reseller-track-referral`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ referralCode, userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to track referral');
    }

    return response.json();
  },
};

export default edgeFunctions;
