import { supabase } from './supabaseClient';
import { Bot, Lead, Conversation, User, PlanType } from '../types';
import { PLANS } from '../constants';

const TABLES = {
  BOTS: 'bots',
  LEADS: 'leads',
  PROFILES: 'profiles',
  CONVERSATIONS: 'conversations',
  USAGE_EVENTS: 'usage_events',
};

export const dbService = {
  // --- BOTS ---

  // Real-time listener for bots
  subscribeToBots: (onUpdate: (bots: Bot[]) => void) => {
    if (!supabase) {
      console.warn('Supabase not initialized');
      return () => {};
    }

    const channel = supabase
      .channel('bots-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.BOTS,
        },
        async () => {
          // Fetch updated bots
          const { data, error } = await supabase
            .from(TABLES.BOTS)
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            // Transform snake_case to camelCase
            const bots = data.map(bot => ({
              id: bot.id,
              name: bot.name,
              type: bot.type,
              systemPrompt: bot.system_prompt,
              model: bot.model,
              temperature: bot.temperature,
              knowledgeBase: [], // Will be loaded separately if needed
              active: bot.active,
              conversationsCount: bot.conversations_count || 0,
              themeColor: bot.theme_color,
              maxMessages: bot.max_messages,
              randomizeIdentity: bot.randomize_identity,
            }));
            onUpdate(bots);
          }
        }
      )
      .subscribe();

    // Initial fetch
    supabase
      .from(TABLES.BOTS)
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          const bots = data.map(bot => ({
            id: bot.id,
            name: bot.name,
            type: bot.type,
            systemPrompt: bot.system_prompt,
            model: bot.model,
            temperature: bot.temperature,
            knowledgeBase: [],
            active: bot.active,
            conversationsCount: bot.conversations_count || 0,
            themeColor: bot.theme_color,
            maxMessages: bot.max_messages,
            randomizeIdentity: bot.randomize_identity,
          }));
          onUpdate(bots);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },

  saveBot: async (bot: Bot) => {
    if (!supabase) {
      console.error('Supabase not initialized');
      return bot;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Transform camelCase to snake_case
    const botData = {
      id: bot.id,
      owner_id: user.id,
      name: bot.name,
      type: bot.type,
      system_prompt: bot.systemPrompt,
      model: bot.model,
      temperature: bot.temperature,
      active: bot.active,
      theme_color: bot.themeColor,
      max_messages: bot.maxMessages,
      randomize_identity: bot.randomizeIdentity,
      conversations_count: bot.conversationsCount || 0,
    };

    const { error } = await supabase
      .from(TABLES.BOTS)
      .upsert(botData);

    if (error) {
      console.error('Error saving bot:', error);
      throw error;
    }

    return bot;
  },

  getBotById: async (id: string): Promise<Bot | undefined> => {
    if (!supabase) return undefined;

    const { data, error } = await supabase
      .from(TABLES.BOTS)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      systemPrompt: data.system_prompt,
      model: data.model,
      temperature: data.temperature,
      knowledgeBase: [],
      active: data.active,
      conversationsCount: data.conversations_count || 0,
      themeColor: data.theme_color,
      maxMessages: data.max_messages,
      randomizeIdentity: data.randomize_identity,
    };
  },

  // --- LEADS ---

  subscribeToLeads: (onUpdate: (leads: Lead[]) => void) => {
    if (!supabase) {
      console.warn('Supabase not initialized');
      return () => {};
    }

    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.LEADS,
        },
        async () => {
          const { data, error } = await supabase
            .from(TABLES.LEADS)
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            const leads = data.map(lead => ({
              id: lead.id,
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              company: lead.company,
              score: lead.score,
              status: lead.status,
              sourceBotId: lead.source_bot_id,
              notes: lead.notes,
              createdAt: lead.created_at,
            }));
            onUpdate(leads);
          }
        }
      )
      .subscribe();

    // Initial fetch
    supabase
      .from(TABLES.LEADS)
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          const leads = data.map(lead => ({
            id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            score: lead.score,
            status: lead.status,
            sourceBotId: lead.source_bot_id,
            notes: lead.notes,
            createdAt: lead.created_at,
          }));
          onUpdate(leads);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },

  saveLead: async (lead: Lead) => {
    if (!supabase) {
      console.error('Supabase not initialized');
      return lead;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const leadData = {
      id: lead.id,
      owner_id: user.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      score: lead.score,
      status: lead.status,
      source_bot_id: lead.sourceBotId,
      notes: lead.notes,
    };

    const { error } = await supabase
      .from(TABLES.LEADS)
      .upsert(leadData);

    if (error) {
      console.error('Error saving lead:', error);
      throw error;
    }

    return lead;
  },

  // --- USER & BILLING ---

  getUserProfile: async (uid: string): Promise<User | null> => {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', uid)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      plan: data.plan,
      companyName: data.company_name,
      customDomain: data.custom_domain,
      resellerCode: data.reseller_code,
      status: data.status,
      createdAt: data.created_at,
    };
  },

  saveUserProfile: async (user: User) => {
    if (!supabase) {
      console.error('Supabase not initialized');
      return;
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      company_name: user.companyName,
      custom_domain: user.customDomain,
      reseller_code: user.resellerCode,
      status: user.status || 'active',
    };

    const { error } = await supabase
      .from(TABLES.PROFILES)
      .upsert(userData);

    if (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  },

  updateUserPlan: async (uid: string, plan: PlanType) => {
    if (!supabase) return;

    const { error } = await supabase
      .from(TABLES.PROFILES)
      .update({ plan })
      .eq('id', uid);

    if (error) {
      console.error('Error updating user plan:', error);
      throw error;
    }
  },

  // --- RESELLER ---

  subscribeToReferrals: (resellerCode: string, onUpdate: (users: User[]) => void) => {
    if (!supabase) {
      console.warn('Supabase not initialized');
      return () => {};
    }

    const channel = supabase
      .channel('referrals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.PROFILES,
          filter: `referred_by=eq.${resellerCode}`,
        },
        async () => {
          const { data, error } = await supabase
            .from(TABLES.PROFILES)
            .select('*')
            .eq('referred_by', resellerCode);

          if (!error && data) {
            const users = data.map(u => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              plan: u.plan,
              companyName: u.company_name,
              status: u.status,
              createdAt: u.created_at,
            }));
            onUpdate(users);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // --- ADMIN FUNCTIONS ---

  getAllUsers: async (): Promise<User[]> => {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      plan: u.plan,
      companyName: u.company_name,
      status: u.status,
      createdAt: u.created_at,
    }));
  },

  updateUserStatus: async (uid: string, status: 'Active' | 'Suspended') => {
    if (!supabase) return;

    const { error } = await supabase
      .from(TABLES.PROFILES)
      .update({ status: status.toLowerCase() })
      .eq('id', uid);

    if (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  },

  approvePartner: async (uid: string) => {
    if (!supabase) return;

    const { error } = await supabase
      .from(TABLES.PROFILES)
      .update({ status: 'active' })
      .eq('id', uid);

    if (error) {
      console.error('Error approving partner:', error);
      throw error;
    }
  },
};
