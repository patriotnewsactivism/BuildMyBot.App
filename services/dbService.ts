
import { supabase } from './supabaseClient';
import { Bot, Lead, Conversation, User, PlanType } from '../types';

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

    // Initial fetch
    const fetchBots = async () => {
      const { data, error } = await client.from('bots').select('*');
      if (!error && data) {
        onUpdate(arrayToCamelCase<Bot>(data as Record<string, unknown>[]));
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

    const fetchLeads = async () => {
      const { data, error } = await client
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        onUpdate(arrayToCamelCase<Lead>(data as Record<string, unknown>[]));
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
  }
};
