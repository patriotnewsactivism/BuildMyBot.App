import { supabase } from './supabaseClient';
import { Bot, Lead, Conversation, User, PlanType } from '../types';

export const dbService = {
  // --- BOTS ---
  
  // Real-time listener for bots
  subscribeToBots: (onUpdate: (bots: Bot[]) => void) => {
    if (!supabase) return () => {};

    // Initial fetch
    const fetchBots = async () => {
      const { data, error } = await supabase.from('bots').select('*');
      if (!error && data) {
        onUpdate(data as Bot[]);
      }
    };
    fetchBots();

    // Subscribe to changes
    const channel = supabase.channel('public:bots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bots' }, () => {
        // Re-fetch on any change for simplicity
        fetchBots();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  saveBot: async (bot: Bot) => {
    if (!supabase) return bot;
    const { data, error } = await supabase
      .from('bots')
      .upsert(bot)
      .select()
      .single();
      
    if (error) throw error;
    return data as Bot;
  },

  getBotById: async (id: string): Promise<Bot | undefined> => {
    if (!supabase) return undefined;
    const { data, error } = await supabase
      .from('bots')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error || !data) return undefined;
    return data as Bot;
  },

  // --- LEADS ---

  subscribeToLeads: (onUpdate: (leads: Lead[]) => void) => {
    if (!supabase) return () => {};

    const fetchLeads = async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('createdAt', { ascending: false });
        
      if (!error && data) {
        onUpdate(data as Lead[]);
      }
    };
    fetchLeads();

    const channel = supabase.channel('public:leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  saveLead: async (lead: Lead) => {
    if (!supabase) return lead;
    
    // Upsert handles duplicate ID or we can rely on unique constraints
    // Assuming 'id' is the primary key or we have a unique constraint on email + bot
    const { data, error } = await supabase
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
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
      
    if (error || !data) return null;
    return data as User;
  },

  saveUserProfile: async (user: User) => {
    if (!supabase) return;
    const now = new Date().toISOString();
    
    const userData = {
        ...user,
        status: user.status || 'Active',
        createdAt: user.createdAt || now
    };
    
    const { error } = await supabase
      .from('profiles')
      .upsert(userData);
      
    if (error) console.error("Error saving profile:", error);
  },

  updateUserPlan: async (uid: string, plan: PlanType) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('profiles')
      .update({ plan: plan })
      .eq('id', uid);
      
    if (error) console.error("Error updating plan:", error);
  },

  // --- RESELLER ---

  // Listen to users who were referred by this reseller code
  subscribeToReferrals: (resellerCode: string, onUpdate: (users: User[]) => void) => {
    if (!supabase) return () => {};

    const fetchReferrals = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('referredBy', resellerCode);
        
      if (!error && data) {
        onUpdate(data as User[]);
      }
    };
    fetchReferrals();

    // Supabase allows filtering on channels, but simpler to just listen to table and filter in fetch or usage
    const channel = supabase.channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `referredBy=eq.${resellerCode}` }, () => {
        fetchReferrals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // --- ADMIN FUNCTIONS ---
  
  // Get ALL users for the Admin Dashboard
  getAllUsers: async (): Promise<User[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
      
    if (error) {
      console.error("Error fetching users:", error);
      return [];
    }
    return data as User[];
  },

  updateUserStatus: async (uid: string, status: 'Active' | 'Suspended') => {
    if (!supabase) return;
    await supabase
      .from('profiles')
      .update({ status })
      .eq('id', uid);
  },

  approvePartner: async (uid: string) => {
    if (!supabase) return;
    await supabase
      .from('profiles')
      .update({ status: 'Active' })
      .eq('id', uid);
  }
};