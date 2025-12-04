
import { supabase } from './supabaseClient';
import { Bot, Lead, Conversation, User, PlanType } from '../types';

export const dbService = {
  // --- BOTS ---

  // Real-time listener for bots
  subscribeToBots: (onUpdate: (bots: Bot[]) => void) => {
    const client = supabase;
    if (!client) return () => {};

    // Initial fetch
    const fetchBots = async () => {
      const { data, error } = await client.from('bots').select('*');
      if (!error && data) {
        onUpdate(data as Bot[]);
      }
    };
    fetchBots();

    // Subscribe to changes
    const channel = client.channel('public:bots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bots' }, () => {
        // Re-fetch on any change for simplicity
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

    // Prepare payload with userId
    const payload = {
        ...bot,
        userId: user.id
    };

    const { data, error } = await client
      .from('bots')
      .upsert(payload)
      .select()
      .single();

    if (error) {
        console.error("Error saving bot to Supabase:", error);
        throw error;
    }
    return data as Bot;
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
    return data as Bot;
  },

  // Public bot fetch (no auth required - for embed/share links)
  getPublicBotById: async (id: string): Promise<Bot | undefined> => {
    const client = supabase;
    if (!client) return undefined;

    const { data, error } = await client
      .from('bots')
      .select('id, name, systemPrompt, model, temperature, knowledgeBase, themeColor, maxMessages, randomizeIdentity, responseDelay, type, active')
      .eq('id', id)
      .eq('active', true)
      .single();

    if (error || !data) return undefined;
    return data as Bot;
  },

  // --- LEADS ---

  subscribeToLeads: (onUpdate: (leads: Lead[]) => void) => {
    const client = supabase;
    if (!client) return () => {};

    const fetchLeads = async () => {
      const { data, error } = await client
        .from('leads')
        .select('*')
        .order('createdAt', { ascending: false });

      if (!error && data) {
        onUpdate(data as Lead[]);
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
    if (!user) return lead; // Or handle as anonymous if capturing from public widget

    const payload = {
        ...lead,
        userId: user.id // Leads should belong to the bot owner
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
    return data as Lead;
  },

  // Save lead from public chat (uses bot owner's context)
  savePublicLead: async (lead: Lead, botId: string) => {
    const client = supabase;
    if (!client) return lead;

    // For public leads, we store them with the botId reference
    const payload = {
        ...lead,
        sourceBotId: botId
    };

    const { data, error } = await client
      .from('leads')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error saving public lead:", error);
      return lead;
    }
    return data as Lead;
  },

  // --- CONVERSATIONS ---

  saveConversation: async (conversation: Conversation) => {
    const client = supabase;
    if (!client) return conversation;

    const { data, error } = await client
      .from('conversations')
      .insert(conversation)
      .select()
      .single();

    if (error) {
      console.error("Error saving conversation:", error);
      return conversation;
    }
    return data as Conversation;
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
    return data as User;
  },

  saveUserProfile: async (user: User) => {
    const client = supabase;
    if (!client) return;
    const now = new Date().toISOString();

    const userData = {
        ...user,
        status: user.status || 'Active',
        createdAt: user.createdAt || now
    };

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
        .eq('referredBy', resellerCode);

      if (!error && data) {
        onUpdate(data as User[]);
      }
    };
    fetchReferrals();

    const channel = client.channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `referredBy=eq.${resellerCode}` }, () => {
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
    return data as User[];
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
  }
};
