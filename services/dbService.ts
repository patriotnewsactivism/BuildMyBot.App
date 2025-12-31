
import { supabase } from './supabaseClient';
import { Bot, Lead, Conversation, User, PlanType, WebsitePage, UserRole } from '../types';
import { edgeFunctions } from './edgeFunctions';
import { slugifyPageSlug } from './websiteService';

// Helper functions to convert between camelCase (TypeScript) and snake_case (PostgreSQL)
const toSnakeCase = (str: string): string =>
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const toCamelCase = (str: string): string =>
  str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const objectToSnakeCase = <T extends Record<string, any>>(obj: T): Record<string, unknown> => {
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
      console.log('SubscribeToBots - Fetching bots for user:', user?.id);
      const query = client.from('bots').select('*');
      const { data, error } = await (user ? query.eq('user_id', user.id) : query);
      console.log('SubscribeToBots - Fetched bots:', data, 'Error:', error);
      if (!error && data && !cancelled) {
        console.log('SubscribeToBots - Calling onUpdate with', data.length, 'bots');
        onUpdate(arrayToCamelCase<Bot>(data as Record<string, unknown>[]));
      }
    };
    fetchBots();

    // Subscribe to changes
    const channel = client.channel('public:bots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bots' }, (payload) => {
        console.log('SubscribeToBots - Change detected:', payload);
        fetchBots();
      })
      .subscribe();

    return () => {
      cancelled = true;
      client.removeChannel(channel);
    };
  },

  saveBot: async (bot: Bot) => {
    const client = supabase;
    if (!client) throw new Error("Supabase client not initialized");

    // Validate authentication
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError) {
        console.error("Authentication error:", authError);
        throw new Error("Authentication failed: " + (authError.message || "Please log in again"));
    }
    if (!user) {
        console.error("Cannot save bot: User not logged in");
        throw new Error("Cannot save bot: User not logged in");
    }

    // Validate required fields
    if (!bot.name || !bot.name.trim()) {
        throw new Error("Bot name is required");
    }
    if (!bot.systemPrompt || !bot.systemPrompt.trim()) {
        throw new Error("System prompt is required");
    }

    // Validate temperature range
    if (bot.temperature !== undefined && (bot.temperature < 0 || bot.temperature > 2)) {
        throw new Error("Temperature must be between 0 and 2");
    }

    const isNewBot = !bot.id || bot.id === 'new';

    // Convert bot to snake_case FIRST
    const botSnakeCase = objectToSnakeCase(bot);

    // Then add/override user_id (don't rely on conversion)
    const payload: Record<string, unknown> = {
        ...botSnakeCase,
        user_id: user.id
    };

    // CRITICAL: For new bots, remove 'id' so database generates UUID
    if (isNewBot) {
        delete payload.id;
    }

    console.log('SaveBot - Operation:', isNewBot ? 'INSERT' : 'UPDATE');
    console.log('SaveBot - User ID:', user.id);
    console.log('SaveBot - User Email:', user.email);
    console.log('SaveBot - Payload being sent:', payload);

    const { data, error } = await client
      .from('bots')
      .upsert(payload, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    console.log('SaveBot - Response data:', data);
    console.log('SaveBot - Response error:', error);

    if (error || !data) {
        console.error("Error saving bot to Supabase:", {
            error,
            code: error?.code,
            message: error?.message,
            details: error?.details,
            hint: error?.hint,
            userId: user.id,
            botId: bot.id
        });

        // Provide more detailed error messages
        if (error?.code === 'PGRST116') {
            throw new Error("Bot not found or you don't have permission to update it");
        }
        if (error?.code === '42501') {
            throw new Error("Permission denied. Please ensure you're logged in.");
        }
        if (error?.code === '23503') {
            throw new Error("User profile not found. Please refresh the page and try again.");
        }
        if (error?.code === '23505') {
            throw new Error("A bot with this ID already exists.");
        }

        // Extract meaningful error message from Supabase error object
        const errorMessage = error?.message
            || error?.details
            || error?.hint
            || (typeof error === 'string' ? error : 'Failed to save bot - no data returned');

        throw new Error(errorMessage);
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

  setUserRoleByEmail: async (email: string, role: UserRole): Promise<User | null> => {
    const client = supabase;
    if (!client) return null;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Email is required');
    }

    const { data: existingProfiles, error: fetchError } = await client
      .from('profiles')
      .select('*')
      .eq('email', normalizedEmail)
      .limit(1);

    if (fetchError) {
      throw fetchError;
    }

    const existingProfile = Array.isArray(existingProfiles) ? existingProfiles[0] : null;
    if (!existingProfile) {
      return null;
    }

    const { data, error } = await client
      .from('profiles')
      .update({ role })
      .eq('id', existingProfile.id)
      .select('*')
      .limit(1);

    if (error) {
      throw error;
    }

    const updatedProfile = Array.isArray(data) ? data[0] : null;
    return updatedProfile ? objectToCamelCase<User>(updatedProfile as Record<string, unknown>) : null;
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
  },

  // --- ANALYTICS ---

  /**
   * Get weekly analytics data for charts
   * Returns conversation and lead counts grouped by day for the last 7 days
   */
  getWeeklyAnalytics: async (userId: string): Promise<{ date: string; conversations: number; leads: number }[]> => {
    const client = supabase;
    if (!client) return [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    try {
      // Fetch conversations from the last 7 days
      const { data: conversations, error: convError } = await client
        .from('conversations')
        .select('created_at')
        .eq('owner_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (convError) {
        console.error('Error fetching conversations for analytics:', convError);
        return [];
      }

      // Fetch leads from the last 7 days
      const { data: leads, error: leadsError } = await client
        .from('leads')
        .select('created_at')
        .eq('owner_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (leadsError) {
        console.error('Error fetching leads for analytics:', leadsError);
        return [];
      }

      // Aggregate by day
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const aggregatedData: Record<string, { conversations: number; leads: number }> = {};

      // Initialize all 7 days with zero counts
      for (let i = 0; i < 7; i++) {
        const day = new Date(sevenDaysAgo);
        day.setDate(day.getDate() + i);
        const dayLabel = dayLabels[day.getDay()];
        aggregatedData[dayLabel] = { conversations: 0, leads: 0 };
      }

      // Count conversations by day
      conversations?.forEach((conv) => {
        const date = new Date(conv.created_at);
        const dayLabel = dayLabels[date.getDay()];
        if (aggregatedData[dayLabel]) {
          aggregatedData[dayLabel].conversations++;
        }
      });

      // Count leads by day
      leads?.forEach((lead) => {
        const date = new Date(lead.created_at);
        const dayLabel = dayLabels[date.getDay()];
        if (aggregatedData[dayLabel]) {
          aggregatedData[dayLabel].leads++;
        }
      });

      // Convert to array format for charts
      return Object.entries(aggregatedData).map(([date, counts]) => ({
        date,
        conversations: counts.conversations,
        leads: counts.leads,
      }));
    } catch (error) {
      console.error('Error in getWeeklyAnalytics:', error);
      return [];
    }
  },

  /**
   * Get real reseller statistics
   * Returns client count, revenue, commissions, etc.
   */
  getResellerStats: async (userId: string): Promise<{
    totalClients: number;
    totalRevenue: number;
    commissionRate: number;
    pendingPayout: number;
    addOnCommission: number;
    arrears: number;
  }> => {
    const client = supabase;
    if (!client) {
      return {
        totalClients: 0,
        totalRevenue: 0,
        commissionRate: 0.20,
        pendingPayout: 0,
        addOnCommission: 0,
        arrears: 0,
      };
    }

    try {
      // Fetch reseller clients
      const { data: clients, error: clientsError} = await client
        .from('reseller_clients')
        .select('*')
        .eq('reseller_id', userId);

      if (clientsError) {
        console.error('Error fetching reseller clients:', clientsError);
      }

      // Fetch commissions
      const { data: commissions, error: commissionsError } = await client
        .from('commissions')
        .select('*')
        .eq('reseller_id', userId);

      if (commissionsError) {
        console.error('Error fetching commissions:', commissionsError);
      }

      // Calculate stats
      const totalClients = clients?.length || 0;
      const allCommissions = commissions || [];

      const totalRevenue = allCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);
      const pendingPayout = allCommissions
        .filter(c => !c.paid)
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      const addOnCommission = allCommissions
        .filter(c => c.commission_type === 'addon')
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      // Get user's commission rate from profile
      const { data: profile } = await client
        .from('profiles')
        .select('reseller_tier')
        .eq('id', userId)
        .single();

      const commissionRate = profile?.reseller_tier || 0.20;

      return {
        totalClients,
        totalRevenue,
        commissionRate,
        pendingPayout,
        addOnCommission,
        arrears: 0, // TODO: Calculate arrears from failed payments
      };
    } catch (error) {
      console.error('Error in getResellerStats:', error);
      return {
        totalClients: 0,
        totalRevenue: 0,
        commissionRate: 0.20,
        pendingPayout: 0,
        addOnCommission: 0,
        arrears: 0,
      };
    }
  }
};
