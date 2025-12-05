
import { supabase } from './supabaseClient';
import { Bot, Lead, Conversation, User, PlanType } from '../types';

// Transform bot from DB format to frontend format
const transformBot = (dbBot: Record<string, unknown>): Bot => ({
  id: dbBot.id as string,
  name: dbBot.name as string,
  type: dbBot.type as string,
  systemPrompt: dbBot.system_prompt as string,
  model: dbBot.model as string,
  temperature: Number(dbBot.temperature),
  knowledgeBase: [],
  active: dbBot.active as boolean,
  conversationsCount: (dbBot.conversations_count as number) || 0,
  themeColor: dbBot.theme_color as string,
  websiteUrl: dbBot.website_url as string | undefined,
  maxMessages: dbBot.max_messages as number | undefined,
  randomizeIdentity: dbBot.randomize_identity as boolean | undefined,
  avatar: dbBot.avatar as string | undefined,
  responseDelay: dbBot.response_delay as number | undefined,
  userId: dbBot.owner_id as string | undefined,
});

// Transform bot from frontend format to DB format
const transformBotForDb = (bot: Bot, ownerId: string): Record<string, unknown> => ({
  id: bot.id,
  owner_id: ownerId,
  name: bot.name,
  type: bot.type,
  system_prompt: bot.systemPrompt,
  model: bot.model,
  temperature: bot.temperature,
  theme_color: bot.themeColor,
  website_url: bot.websiteUrl || null,
  max_messages: bot.maxMessages || null,
  randomize_identity: bot.randomizeIdentity || false,
  avatar: bot.avatar || null,
  response_delay: bot.responseDelay || 0,
  active: bot.active,
});

// Transform lead from DB format to frontend format
const transformLead = (dbLead: Record<string, unknown>): Lead => ({
  id: dbLead.id as string,
  name: dbLead.name as string,
  email: dbLead.email as string,
  phone: dbLead.phone as string | undefined,
  score: dbLead.score as number,
  status: dbLead.status as Lead['status'],
  sourceBotId: dbLead.source_bot_id as string,
  createdAt: dbLead.created_at as string,
  userId: dbLead.owner_id as string | undefined,
});

// Transform user from DB format to frontend format
const transformUser = (dbUser: Record<string, unknown>): User => ({
  id: dbUser.id as string,
  name: dbUser.name as string || '',
  email: dbUser.email as string,
  role: dbUser.role as User['role'],
  plan: dbUser.plan as PlanType,
  companyName: dbUser.company_name as string || '',
  avatarUrl: dbUser.avatar_url as string | undefined,
  resellerCode: dbUser.reseller_code as string | undefined,
  customDomain: dbUser.custom_domain as string | undefined,
  referredBy: dbUser.referred_by as string | undefined,
  status: dbUser.status as User['status'],
  createdAt: dbUser.created_at as string | undefined,
});

export const dbService = {
  // --- BOTS ---

  // Real-time listener for bots
  subscribeToBots: (onUpdate: (bots: Bot[]) => void) => {
    const client = supabase;
    if (!client) return () => {};

    // Initial fetch
    const fetchBots = async () => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;

      const { data, error } = await client
        .from('bots')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        onUpdate(data.map(transformBot));
      }
    };
    fetchBots();

    // Subscribe to changes
    const channel = client.channel('public:bots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bots' }, () => {
        fetchBots();
      })
      .subscribe();

    return () => {
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

    const payload = transformBotForDb(bot, user.id);

    const { data, error } = await client
      .from('bots')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error saving bot to Supabase:", error);
      throw error;
    }
    return transformBot(data);
  },

  deleteBot: async (botId: string) => {
    const client = supabase;
    if (!client) return;

    const { error } = await client
      .from('bots')
      .delete()
      .eq('id', botId);

    if (error) {
      console.error("Error deleting bot:", error);
      throw error;
    }
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
    return transformBot(data);
  },

  // --- KNOWLEDGE BASE ---

  getKnowledgeBase: async (botId: string) => {
    const client = supabase;
    if (!client) return [];

    const { data, error } = await client
      .from('knowledge_base')
      .select('id, title, content, source_type, created_at')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching knowledge base:", error);
      return [];
    }

    return data;
  },

  addKnowledgeBase: async (botId: string, title: string, content: string, sourceType: string = 'text') => {
    const client = supabase;
    if (!client) return null;

    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    // Call edge function to generate embeddings
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
    const { data: session } = await client.auth.getSession();

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/embed-knowledge-base`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token}`,
        },
        body: JSON.stringify({
          bot_id: botId,
          title,
          content,
          source_type: sourceType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add knowledge base');
      }

      return await response.json();
    } catch (error) {
      console.error("Error adding knowledge base:", error);
      throw error;
    }
  },

  deleteKnowledgeBase: async (id: string) => {
    const client = supabase;
    if (!client) return;

    const { error } = await client
      .from('knowledge_base')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting knowledge base item:", error);
      throw error;
    }
  },

  // --- LEADS ---

  subscribeToLeads: (onUpdate: (leads: Lead[]) => void) => {
    const client = supabase;
    if (!client) return () => {};

    const fetchLeads = async () => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;

      const { data, error } = await client
        .from('leads')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        onUpdate(data.map(transformLead));
      }
    };
    fetchLeads();

    const channel = client.channel('public:leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  },

  saveLead: async (lead: Lead) => {
    const client = supabase;
    if (!client) return lead;

    const { data: { user } } = await client.auth.getUser();
    if (!user) return lead;

    const payload = {
      id: lead.id,
      owner_id: user.id,
      source_bot_id: lead.sourceBotId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone || null,
      score: lead.score,
      status: lead.status,
    };

    const { data, error } = await client
      .from('leads')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error saving lead:", error);
      return lead;
    }
    return transformLead(data);
  },

  updateLeadStatus: async (leadId: string, status: Lead['status']) => {
    const client = supabase;
    if (!client) return;

    const { error } = await client
      .from('leads')
      .update({ status })
      .eq('id', leadId);

    if (error) {
      console.error("Error updating lead status:", error);
    }
  },

  // --- CONVERSATIONS ---

  getConversations: async (botId?: string) => {
    const client = supabase;
    if (!client) return [];

    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];

    let query = client
      .from('conversations')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (botId) {
      query = query.eq('bot_id', botId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching conversations:", error);
      return [];
    }

    return data.map((c: Record<string, unknown>) => ({
      id: c.id,
      botId: c.bot_id,
      messages: c.messages,
      sentiment: c.sentiment,
      timestamp: new Date(c.created_at as string).getTime(),
    })) as Conversation[];
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
    return transformUser(data);
  },

  saveUserProfile: async (user: User) => {
    const client = supabase;
    if (!client) return;

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      company_name: user.companyName,
      avatar_url: user.avatarUrl || null,
      role: user.role,
      plan: user.plan,
      status: user.status || 'Active',
      reseller_code: user.resellerCode || null,
      custom_domain: user.customDomain || null,
      referred_by: user.referredBy || null,
    };

    const { error } = await client
      .from('profiles')
      .upsert(payload);

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

  // --- USAGE & BILLING ---

  checkUsageLimits: async (resourceType: string) => {
    const client = supabase;
    if (!client) return { allowed: true };

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
    const { data: session } = await client.auth.getSession();

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/billing-overage-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token}`,
        },
        body: JSON.stringify({ resource_type: resourceType }),
      });

      return await response.json();
    } catch (error) {
      console.error("Error checking usage limits:", error);
      return { allowed: true };
    }
  },

  getUsageStats: async () => {
    const client = supabase;
    if (!client) return null;

    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    const { data, error } = await client.rpc('get_monthly_usage', { user_id: user.id });

    if (error) {
      console.error("Error fetching usage stats:", error);
      return null;
    }

    return data?.[0] || null;
  },

  // --- RESELLER ---

  subscribeToReferrals: (resellerCode: string, onUpdate: (users: User[]) => void) => {
    const client = supabase;
    if (!client) return () => {};

    const fetchReferrals = async () => {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('referred_by', resellerCode);

      if (!error && data) {
        onUpdate(data.map(transformUser));
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

  getResellerStats: async () => {
    const client = supabase;
    if (!client) return null;

    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;

    const { data, error } = await client
      .from('reseller_stats')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (error) {
      console.error("Error fetching reseller stats:", error);
      return null;
    }

    return data;
  },

  trackReferral: async (action: 'click' | 'signup', referralCode: string, userId?: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/reseller-track-referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          referral_code: referralCode,
          user_id: userId,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error("Error tracking referral:", error);
      return null;
    }
  },

  // --- TEMPLATES / MARKETPLACE ---

  getTemplates: async (category?: string) => {
    const client = supabase;
    if (!client) return [];

    let query = client
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .order('rating', { ascending: false });

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching templates:", error);
      return [];
    }

    return data;
  },

  installTemplate: async (templateId: string, botName?: string) => {
    const client = supabase;
    if (!client) return null;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
    const { data: session } = await client.auth.getSession();

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/marketplace-install-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token}`,
        },
        body: JSON.stringify({
          template_id: templateId,
          bot_name: botName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to install template');
      }

      return await response.json();
    } catch (error) {
      console.error("Error installing template:", error);
      throw error;
    }
  },

  // --- ADMIN FUNCTIONS ---

  getAllUsers: async (): Promise<User[]> => {
    const client = supabase;
    if (!client) return [];
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      return [];
    }
    return data.map(transformUser);
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
      .update({ status: 'Active', role: 'RESELLER' })
      .eq('id', uid);

    await client
      .from('reseller_accounts')
      .update({ is_approved: true, approved_at: new Date().toISOString() })
      .eq('owner_id', uid);
  },

  getAdminMetrics: async () => {
    const client = supabase;
    if (!client) return null;

    const { data, error } = await client
      .from('admin_metrics')
      .select('*')
      .single();

    if (error) {
      console.error("Error fetching admin metrics:", error);
      return null;
    }

    return data;
  },
};
