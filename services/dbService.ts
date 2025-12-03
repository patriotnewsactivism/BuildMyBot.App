import { supabase } from './supabaseClient';
import { Bot, Lead, Conversation, User, PlanType } from '../types';

export const dbService = {
  // --- BOTS ---

  // Real-time listener for bots
  subscribeToBots: (onUpdate: (bots: Bot[]) => void) => {
    if (!supabase) {
      console.warn('Supabase not initialized');
      return () => {};
    }

    const client = supabase;

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
    const { data, error } = await client
      .from('bots')
      .upsert(bot)
      .select()
      .single();
      
    if (error) throw error;
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

  // --- LEADS ---

  subscribeToLeads: (onUpdate: (leads: Lead[]) => void) => {
    if (!supabase) {
      console.warn('Supabase not initialized');
      return () => {};
    }

    const client = supabase;

    // Initial fetch
    const fetchLeads = async () => {
      const { data, error } = await client
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        onUpdate(data as Lead[]);
      }
    };
    fetchLeads();

    // Subscribe to changes
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
    
    // Upsert handles duplicate ID or we can rely on unique constraints
    // Assuming 'id' is the primary key or we have a unique constraint on email + bot
    const { data, error } = await client
      .from('leads')
      .upsert(lead)
      .select()
      .single();

    if (error) {
      console.error("Error saving lead:", error);
      return lead;
    }
    return data as Lead;
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
    if (!supabase) {
      console.warn('Supabase not initialized');
      return () => {};
    }

    const client = supabase;

    // Initial fetch
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

    // Subscribe to changes
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