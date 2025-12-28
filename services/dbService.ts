
import { supabase } from './supabaseClient';
import { Bot, Lead, Conversation, User, PlanType, WebsitePage } from '../types';
import { edgeFunctions } from './edgeFunctions';
import { slugifyPageSlug } from './websiteService';
import { edgeFunctions } from './edgeFunctions';

// Helper functions to convert between camelCase (TypeScript) and snake_case (PostgreSQL)
const toSnakeCase = (str: string): string =>
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const toCamelCase = (str: string): string =>
  str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const objectToSnakeCase = <T extends Record<string, unknown>>(obj: T): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toSnakeCase(key)] = value;
  }
  return result;
};

const objectToCamelCase = <T>(obj: Record<string, unknown>): T => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toCamelCase(key)] = value;
  }
  return result as T;
};

const arrayToCamelCase = <T>(arr: Record<string, unknown>[]): T[] =>
  arr.map(item => objectToCamelCase<T>(item));

export const dbService = {
  // --- BOTS ---
  
  // Real-time listener for bots
  subscribeToBots: (onUpdate: (bots: Bot[]) => void) => {
    const client = supabase;
    if (!client) return () => {};

    let cancelled = false;

    // Initial fetch
    const fetchBots = async () => {
      const { data: { user } } = await client.auth.getUser();
      const query = client.from('bots').select('*');
      const { data, error } = await (user ? query.eq('user_id', user.id) : query);
      if (!error && data && !cancelled) {
        onUpdate(arrayToCamelCase<Bot>(data as Record<string, unknown>[]));
      }
    };
    fetchBots();

    // Subscribe to changes
    const channel = client.channel('public:bots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bots' }, fetchBots)
      .subscribe();

    return () => {
      cancelled = true;
      client.removeChannel(channel);
    };
  },

  saveBot: async (bot: Bot) => {
    const client = supabase;
    if (!client) return bot;

    const { data: { user } } = await client.auth.getUser();
    if (!user) {
        console.error("Cannot save bot: User not logged in");
        return bot;
    }

    // Prepare payload with user_id and convert to snake_case
    const payload = objectToSnakeCase({
        ...bot,
        userId: user.id
    });

    const { data, error } = await client
      .from('bots')
      .upsert(payload)
      .select()
      .single();

    if (error) {
        console.error("Error saving bot to Supabase:", error);
        throw error;
    }
    return objectToCamelCase<Bot>(data as Record<string, unknown>);
  },

  getBotById: async (id: string): Promise<Bot | undefined> => {
    const client = supabase;
    if (!client) return undefined;
    const { data, error } = await client
      .from('bots')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return objectToCamelCase<Bot>(data as Record<string, unknown>);
  },

  // --- LEADS ---

  subscribeToLeads: (onUpdate: (leads: Lead[]) => void) => {
    const client = supabase;
    if (!client) return () => {};

    let cancelled = false;

    const fetchLeads = async () => {
      const { data: { user } } = await client.auth.getUser();
      const query = client
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await (user ? query.eq('user_id', user.id) : query);

      if (!error && data && !cancelled) {
        onUpdate(arrayToCamelCase<Lead>(data as Record<string, unknown>[]));
      }
    };
    fetchLeads();

    const channel = client.channel('public:leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
      .subscribe();

    return () => {
      cancelled = true;
      client.removeChannel(channel);
    };
  },

  // Create lead through Edge Function to respect RLS
  createLead: async (params: { botId: string; name: string; email: string; phone?: string; score?: number; sourceUrl?: string }) => {
    const client = supabase;
    if (!client) return null;

    try {
      const response = await edgeFunctions.createLead(params.botId, params.name, params.email, {
        phone: params.phone,
        score: params.score,
        sourceUrl: params.sourceUrl,
      });

      if (response.lead) {
        return objectToCamelCase<Lead>(response.lead as Record<string, unknown>);
      }

      if (response.leadId) {
        const { data } = await client.from('leads').select('*').eq('id', response.leadId).single();
        if (data) return objectToCamelCase<Lead>(data as Record<string, unknown>);
      }

      return null;
    } catch (error) {
      console.error('Error creating lead via Edge Function:', error);
      return null;
    }
  },

  saveLead: async (lead: Lead) => {
    const client = supabase;
    if (!client) return lead;

    const { data: { user } } = await client.auth.getUser();
    if (!user) return lead; // Or handle as anonymous if capturing from public widget

    // Convert to snake_case for database
    const payload = objectToSnakeCase({
        ...lead,
        userId: user.id // Leads should belong to the bot owner
    });

    const { data, error } = await client
      .from('leads')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error saving lead:", error);
      return lead;
    }
    return objectToCamelCase<Lead>(data as Record<string, unknown>);
  },

  // --- CONVERSATIONS ---

  subscribeToConversations: (onUpdate: (conversations: Conversation[]) => void) => {
    const client = supabase;
    if (!client) return () => {};

    let cancelled = false;

    const fetchConversations = async () => {
      const { data: { user } } = await client.auth.getUser();
      const query = client
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      const { data, error } = await (user ? query.eq('user_id', user.id) : query);

      if (!error && data && !cancelled) {
        onUpdate(arrayToCamelCase<Conversation>(data as Record<string, unknown>[]));
      }
    };
    fetchConversations();

    const channel = client.channel('public:conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchConversations)
      .subscribe();

    return () => {
      cancelled = true;
      client.removeChannel(channel);
    };
  },

  subscribeToConversationSession: (sessionId: string, botId: string, onUpdate: (conversation: Conversation | null) => void) => {
    const client = supabase;
    if (!client) return () => {};

    let cancelled = false;

    const fetchSessionConversation = async () => {
      const { data, error } = await client
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('bot_id', botId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        if (!error && data) {
          onUpdate(objectToCamelCase<Conversation>(data as Record<string, unknown>));
        } else if (!data) {
          onUpdate(null);
        }
      }
    };

    fetchSessionConversation();

    const channel = client.channel(`public:conversations:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `session_id=eq.${sessionId}` }, fetchSessionConversation)
      .subscribe();

    return () => {
      cancelled = true;
      client.removeChannel(channel);
    };
  },

  appendConversationMessage: async ({ sessionId, botId, message, sentiment, leadId }: { sessionId: string; botId: string; message: Conversation['messages'][number]; sentiment?: Conversation['sentiment']; leadId?: string; }) => {
    const client = supabase;
    if (!client) return null;

    const now = new Date();
    const conversationId = `${botId}-${sessionId}`;

    try {
      const { data: existing } = await client
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .limit(1)
        .maybeSingle();

      const existingConversation = existing ? objectToCamelCase<Conversation>(existing as Record<string, unknown>) : null;
      const updatedMessages = [...(existingConversation?.messages || []), message];

      const payload = objectToSnakeCase({
        id: conversationId,
        botId,
        sessionId,
        messages: updatedMessages,
        sentiment: sentiment || existingConversation?.sentiment || 'Neutral',
        leadId: leadId || existingConversation?.leadId,
        timestamp: existingConversation?.timestamp || now.getTime(),
        createdAt: existingConversation?.createdAt || now.toISOString(),
        updatedAt: now.toISOString(),
      });

      const { data, error } = await client
        .from('conversations')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('Error saving conversation:', error);
        return existingConversation;
      }

      return objectToCamelCase<Conversation>(data as Record<string, unknown>);
    } catch (error) {
      console.error('Failed to append conversation message:', error);
      return null;
    }
  },

  // --- USER & BILLING ---

  getUserProfile: async (uid: string): Promise<User | null> => {
    const client = supabase;
    if (!client) return null;
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (error || !data) return null;
    return objectToCamelCase<User>(data as Record<string, unknown>);
  },

  saveUserProfile: async (user: User) => {
    const client = supabase;
    if (!client) return;
    const now = new Date().toISOString();

    // Convert to snake_case for database
    const userData = objectToSnakeCase({
        ...user,
        status: user.status || 'Active',
        createdAt: user.createdAt || now
    });

    const { error } = await client
      .from('profiles')
      .upsert(userData);

    if (error) console.error("Error saving profile:", error);
  },

  updateUserPlan: async (uid: string, plan: PlanType) => {
    const client = supabase;
    if (!client) return;
    const { error } = await client
      .from('profiles')
      .update({ plan: plan })
      .eq('id', uid);
      
    if (error) console.error("Error updating plan:", error);
  },

  // --- RESELLER ---

  // Listen to users who were referred by this reseller code
  subscribeToReferrals: (resellerCode: string, onUpdate: (users: User[]) => void) => {
    const client = supabase;
    if (!client) return () => {};

    const fetchReferrals = async () => {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('referred_by', resellerCode);

      if (!error && data) {
        onUpdate(arrayToCamelCase<User>(data as Record<string, unknown>[]));
      }
    };
    fetchReferrals();

    const channel = client.channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `referred_by=eq.${resellerCode}` }, () => {
        fetchReferrals();
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  },

  // --- ADMIN FUNCTIONS ---
  
  // Get ALL users for the Admin Dashboard
  getAllUsers: async (): Promise<User[]> => {
    const client = supabase;
    if (!client) return [];
    const { data, error } = await client
      .from('profiles')
      .select('*');

    if (error) {
      console.error("Error fetching users:", error);
      return [];
    }
    return arrayToCamelCase<User>(data as Record<string, unknown>[]);
  },

  updateUserStatus: async (uid: string, status: 'Active' | 'Suspended') => {
    const client = supabase;
    if (!client) return;
    await client
      .from('profiles')
      .update({ status })
      .eq('id', uid);
  },

  approvePartner: async (uid: string) => {
    const client = supabase;
    if (!client) return;
    await client
      .from('profiles')
      .update({ status: 'Active' })
      .eq('id', uid);
  },

  // --- WEBSITE PAGES ---
  getWebsitePages: async (): Promise<WebsitePage[]> => {
    const client = supabase;
    if (!client) return [];

    const { data: auth } = await client.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return [];

    const { data, error } = await client
      .from('website_pages')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error || !data) {
      if (error) console.error('Error fetching website pages:', error);
      return [];
    }

    return arrayToCamelCase<WebsitePage>(data as Record<string, unknown>[]);
  },

  saveWebsitePage: async (page: WebsitePage): Promise<WebsitePage | null> => {
    const client = supabase;
    if (!client) return null;

    const { data: auth } = await client.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      console.error('Cannot save website page: user not logged in');
      return null;
    }

    const payload = objectToSnakeCase({
      ...page,
      id: page.id,
      userId,
      slug: page.slug || slugifyPageSlug(page.title),
      published: page.published ?? false
    });

    const { data, error } = await client
      .from('website_pages')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error saving website page:', error);
      return null;
    }

    return objectToCamelCase<WebsitePage>(data as Record<string, unknown>);
  },

  setWebsitePagePublished: async (pageId: string, published: boolean) => {
    const client = supabase;
    if (!client) return;

    const { error } = await client
      .from('website_pages')
      .update({ published })
      .eq('id', pageId);

    if (error) {
      console.error('Error updating page publish state:', error);
    }
  }
};
