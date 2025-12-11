
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
  // LOGIC-003 FIX: Filter bots by current user
  subscribeToBots: (onUpdate: (bots: Bot[]) => void) => {
    const client = supabase;
    if (!client) return () => {};

    // Initial fetch with user filter
    const fetchBots = async () => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        onUpdate([]);
        return;
      }

      const { data, error } = await client
        .from('bots')
        .select('*')
        .eq('user_id', user.id);

      if (!error && data) {
        onUpdate(arrayToCamelCase<Bot>(data as Record<string, unknown>[]));
      }
    };
    fetchBots();

    // PERF-002 FIX: Use delta updates instead of re-fetching all data
    // Note: Since onUpdate takes an array (not a function), we re-fetch on changes
    // but the RLS filtering ensures we only get user's own data
    const channel = client.channel('public:bots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bots' }, () => {
        // Re-fetch on any change - RLS ensures only user's bots are returned
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

  // PUBLIC: Get bot for embedding/sharing (no auth required)
  getPublicBot: async (botId: string): Promise<Bot | undefined> => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return undefined;

    try {
      // Use Edge Function to fetch bot publicly
      const response = await fetch(`${supabaseUrl}/functions/v1/public-bot?botId=${botId}`);
      if (!response.ok) return undefined;

      const { bot } = await response.json();
      return bot ? objectToCamelCase<Bot>(bot as Record<string, unknown>) : undefined;
    } catch (e) {
      console.error('Failed to fetch public bot:', e);
      return undefined;
    }
  },

  // --- LEADS ---

  // LOGIC-003 FIX: Filter leads by current user
  subscribeToLeads: (onUpdate: (leads: Lead[]) => void) => {
    const client = supabase;
    if (!client) return () => {};

    const fetchLeads = async () => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        onUpdate([]);
        return;
      }

      const { data, error } = await client
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        onUpdate(arrayToCamelCase<Lead>(data as Record<string, unknown>[]));
      }
    };
    fetchLeads();

    // Subscribe to changes - RLS filtering ensures only user's leads are returned
    const channel = client.channel('public:leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        // Re-fetch on any change - RLS ensures only user's leads are returned
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
  // SEC-005, PERF-001 FIXES: Admin functions now use Edge Function with proper authorization

  // Get admin dashboard stats via Edge Function
  getAdminStats: async (): Promise<{
    totalMrr: number;
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    partnerCount: number;
    pendingPartners: number;
    totalBots: number;
    activeBots: number;
  } | null> => {
    const client = supabase;
    if (!client) return null;

    const { data: { session } } = await client.auth.getSession();
    if (!session?.access_token) return null;

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-stats?action=stats`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Admin stats error:', response.status);
        return null;
      }

      const { stats } = await response.json();
      return stats ? {
        totalMrr: stats.total_mrr || 0,
        totalUsers: stats.total_users || 0,
        activeUsers: stats.active_users || 0,
        suspendedUsers: stats.suspended_users || 0,
        partnerCount: stats.partner_count || 0,
        pendingPartners: stats.pending_partners || 0,
        totalBots: stats.total_bots || 0,
        activeBots: stats.active_bots || 0,
      } : null;
    } catch (e) {
      console.error('Admin stats fetch error:', e);
      return null;
    }
  },

  // Get paginated users via Edge Function
  getAdminUsers: async (page = 1, pageSize = 50, search?: string): Promise<User[]> => {
    const client = supabase;
    if (!client) return [];

    const { data: { session } } = await client.auth.getSession();
    if (!session?.access_token) return [];

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return [];

    try {
      const params = new URLSearchParams({
        action: 'users',
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set('search', search);

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-stats?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Admin users error:', response.status);
        return [];
      }

      const { users } = await response.json();
      return arrayToCamelCase<User>(users || []);
    } catch (e) {
      console.error('Admin users fetch error:', e);
      return [];
    }
  },

  // Legacy: Get ALL users for the Admin Dashboard (fallback)
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
