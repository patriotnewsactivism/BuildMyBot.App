// ============================================================================
// BuildMyBot.app - Database Service
// Production-Ready Supabase Operations with Usage Tracking
// ============================================================================

import { supabase } from './supabaseClient';
import { Bot, Lead, User, PlanType, UsageLimitResult } from '../types';
import { PLANS } from '../constants';

// ============================================================================
// BOT OPERATIONS
// NOTE: Bots use TEXT IDs (e.g., "b174..."), not UUIDs
// ============================================================================

export const dbService = {
  // Real-time listener for bots (filtered by current user)
  subscribeToBots: (onUpdate: (bots: Bot[]) => void) => {
    const client = supabase;
    if (!client) return () => {};

    const fetchBots = async () => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;

      const { data, error } = await client
        .from('bots')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });

      if (!error && data) {
        onUpdate(data as Bot[]);
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

  saveBot: async (bot: Bot): Promise<Bot> => {
    const client = supabase;
    if (!client) throw new Error('Supabase not initialized');

    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Ensure userId is set and id exists (TEXT format)
    const payload = {
      ...bot,
      userId: user.id,
      // If id is missing, generate a TEXT-based ID (not UUID)
      id: bot.id || `b${Date.now()}`,
    };

    const { data, error } = await client
      .from('bots')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error saving bot to Supabase:', error);
      throw error;
    }

    return data as Bot;
  },

  getBotById: async (id: string): Promise<Bot | null> => {
    const client = supabase;
    if (!client) return null;

    const { data, error } = await client
      .from('bots')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching bot:', error);
      return null;
    }

    return data as Bot;
  },

  deleteBot: async (id: string): Promise<void> => {
    const client = supabase;
    if (!client) throw new Error('Supabase not initialized');

    const { error } = await client
      .from('bots')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting bot:', error);
      throw error;
    }
  },

  // ============================================================================
  // LEAD OPERATIONS
  // NOTE: source_bot_id is TEXT (references bots.id which is TEXT)
  // ============================================================================

  subscribeToLeads: (onUpdate: (leads: Lead[]) => void) => {
    const client = supabase;
    if (!client) return () => {};

    const fetchLeads = async () => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;

      const { data, error } = await client
        .from('leads')
        .select('*')
        .eq('userId', user.id)
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

  saveLead: async (lead: Lead): Promise<Lead> => {
    const client = supabase;
    if (!client) throw new Error('Supabase not initialized');

    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Ensure userId and proper TEXT source_bot_id
    const payload = {
      ...lead,
      userId: user.id,
      // sourceBotId must be TEXT (matches bots.id which is TEXT)
      sourceBotId: lead.sourceBotId,
    };

    const { data, error } = await client
      .from('leads')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error saving lead:', error);
      throw error;
    }

    return data as Lead;
  },

  // ============================================================================
  // USER & PROFILE OPERATIONS
  // ============================================================================

  getUserProfile: async (uid: string): Promise<User | null> => {
    const client = supabase;
    if (!client) return null;

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (error || !data) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as User;
  },

  saveUserProfile: async (user: User): Promise<void> => {
    const client = supabase;
    if (!client) throw new Error('Supabase not initialized');

    const now = new Date().toISOString();

    const userData = {
      ...user,
      status: user.status || 'Active',
      createdAt: user.createdAt || now,
      updatedAt: now,
    };

    const { error } = await client
      .from('profiles')
      .upsert(userData, { onConflict: 'id' });

    if (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  },

  updateUserPlan: async (uid: string, plan: PlanType): Promise<void> => {
    const client = supabase;
    if (!client) throw new Error('Supabase not initialized');

    const planDetails = PLANS[plan];
    const creditsLimit = planDetails?.conversations || 0;

    const { error } = await client
      .from('profiles')
      .update({
        plan: plan,
        credits_limit: creditsLimit,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', uid);

    if (error) {
      console.error('Error updating plan:', error);
      throw error;
    }
  },

  // ============================================================================
  // USAGE LIMIT CHECKING (Critical for Billing)
  // ============================================================================

  /**
   * Check if user has exceeded their conversation limit based on plan
   * Call this BEFORE allowing a chat to proceed
   */
  checkUsageLimit: async (userId: string): Promise<UsageLimitResult> => {
    const client = supabase;
    if (!client) {
      // If Supabase unavailable, allow (graceful degradation)
      return {
        allowed: true,
        creditsUsed: 0,
        creditsLimit: 9999,
        message: 'Usage tracking unavailable',
      };
    }

    try {
      const { data: profile, error } = await client
        .from('profiles')
        .select('plan, credits_used, credits_limit')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        console.error('Error fetching profile for usage check:', error);
        return {
          allowed: true,
          creditsUsed: 0,
          creditsLimit: 0,
          message: 'Unable to verify usage limits',
        };
      }

      const creditsUsed = profile.credits_used || 0;
      const planDetails = PLANS[profile.plan as PlanType];
      const creditsLimit = profile.credits_limit || planDetails?.conversations || 0;

      const allowed = creditsUsed < creditsLimit;

      return {
        allowed,
        creditsUsed,
        creditsLimit,
        message: allowed
          ? undefined
          : `You've reached your plan limit of ${creditsLimit} conversations. Please upgrade to continue.`,
      };
    } catch (error) {
      console.error('checkUsageLimit error:', error);
      return {
        allowed: true,
        creditsUsed: 0,
        creditsLimit: 0,
        message: 'Error checking usage limits',
      };
    }
  },

  /**
   * Increment usage counter after a successful conversation
   */
  incrementUsage: async (userId: string): Promise<void> => {
    const client = supabase;
    if (!client) return;

    try {
      const { error } = await client.rpc('increment_credits_used', {
        user_id: userId,
      });

      if (error) {
        console.error('Error incrementing usage:', error);
      }
    } catch (error) {
      console.error('incrementUsage error:', error);
    }
  },

  /**
   * Reset usage counter (for billing cycle reset)
   * Admin function or scheduled job
   */
  resetUsage: async (userId: string): Promise<void> => {
    const client = supabase;
    if (!client) throw new Error('Supabase not initialized');

    const { error } = await client
      .from('profiles')
      .update({
        credits_used: 0,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error resetting usage:', error);
      throw error;
    }
  },

  // ============================================================================
  // RESELLER OPERATIONS
  // ============================================================================

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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `referredBy=eq.${resellerCode}`,
        },
        () => {
          fetchReferrals();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  },

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================

  getAllUsers: async (): Promise<User[]> => {
    const client = supabase;
    if (!client) return [];

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    return data as User[];
  },

  updateUserStatus: async (uid: string, status: 'Active' | 'Suspended'): Promise<void> => {
    const client = supabase;
    if (!client) throw new Error('Supabase not initialized');

    const { error } = await client
      .from('profiles')
      .update({
        status,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', uid);

    if (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  },

  approvePartner: async (uid: string): Promise<void> => {
    const client = supabase;
    if (!client) throw new Error('Supabase not initialized');

    const { error } = await client
      .from('profiles')
      .update({
        status: 'Active',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', uid);

    if (error) {
      console.error('Error approving partner:', error);
      throw error;
    }
  },
};
