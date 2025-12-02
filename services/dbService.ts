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

    // Supabase allows filtering on channels, but simpler to just listen to table and filter in fetch or usage
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
  },

  // --- CONVERSATIONS ---

  subscribeToConversations: (onUpdate: (conversations: Conversation[]) => void) => {
    const client = supabase;
    if (!client) return () => {};

    const fetchConversations = async () => {
      const { data, error } = await client
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        onUpdate(data as Conversation[]);
      }
    };
    fetchConversations();

    const channel = client.channel('public:conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  },

  saveConversation: async (conversation: Conversation, ownerId: string) => {
    const client = supabase;
    if (!client) return conversation;

    const convData = {
      id: conversation.id,
      bot_id: conversation.botId,
      owner_id: ownerId,
      messages: conversation.messages,
      sentiment: conversation.sentiment,
      session_id: conversation.id,
      created_at: new Date(conversation.timestamp).toISOString()
    };

    const { data, error } = await client
      .from('conversations')
      .upsert(convData)
      .select()
      .single();

    if (error) {
      console.error("Error saving conversation:", error);
      return conversation;
    }
    return conversation;
  },

  // --- ANALYTICS ---

  getAnalytics: async (ownerId: string, days: number = 7) => {
    const client = supabase;
    if (!client) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: conversations, error: convError } = await client
      .from('conversations')
      .select('created_at')
      .eq('owner_id', ownerId)
      .gte('created_at', startDate.toISOString());

    const { data: leads, error: leadsError } = await client
      .from('leads')
      .select('created_at')
      .eq('owner_id', ownerId)
      .gte('created_at', startDate.toISOString());

    if (convError || leadsError) {
      console.error("Error fetching analytics:", convError || leadsError);
      return [];
    }

    // Group by day
    const analytics: { [key: string]: { conversations: number; leads: number } } = {};
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Initialize all days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayName = dayNames[date.getDay()];
      analytics[dayName] = { conversations: 0, leads: 0 };
    }

    // Count conversations
    conversations?.forEach(conv => {
      const date = new Date(conv.created_at);
      const dayName = dayNames[date.getDay()];
      if (analytics[dayName]) {
        analytics[dayName].conversations++;
      }
    });

    // Count leads
    leads?.forEach(lead => {
      const date = new Date(lead.created_at);
      const dayName = dayNames[date.getDay()];
      if (analytics[dayName]) {
        analytics[dayName].leads++;
      }
    });

    return Object.entries(analytics).map(([date, data]) => ({
      date,
      conversations: data.conversations,
      leads: data.leads
    }));
  },

  // --- MARKETING CONTENT ---

  saveMarketingContent: async (ownerId: string, type: string, title: string, content: string, topic: string, tone: string) => {
    const client = supabase;
    if (!client) return;

    const { error } = await client
      .from('marketing_content')
      .insert({
        owner_id: ownerId,
        type,
        title,
        content,
        topic,
        tone
      });

    if (error) console.error("Error saving marketing content:", error);
  },

  getMarketingContent: async (ownerId: string) => {
    const client = supabase;
    if (!client) return [];

    const { data, error } = await client
      .from('marketing_content')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching marketing content:", error);
      return [];
    }
    return data;
  },

  deleteMarketingContent: async (id: string) => {
    const client = supabase;
    if (!client) return;

    await client
      .from('marketing_content')
      .delete()
      .eq('id', id);
  },

  // --- TEMPLATES ---

  getTemplates: async () => {
    const client = supabase;
    if (!client) return [];

    const { data, error } = await client
      .from('templates')
      .select('*')
      .order('featured', { ascending: false });

    if (error) {
      console.error("Error fetching templates:", error);
      return [];
    }
    return data;
  },

  // --- USAGE TRACKING ---

  trackUsage: async (ownerId: string, eventType: string, botId?: string, quantity: number = 1) => {
    const client = supabase;
    if (!client) return;

    await client
      .from('usage_events')
      .insert({
        owner_id: ownerId,
        event_type: eventType,
        bot_id: botId,
        quantity
      });
  },

  getUsageStats: async (ownerId: string) => {
    const client = supabase;
    if (!client) return null;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await client
      .from('usage_events')
      .select('quantity')
      .eq('owner_id', ownerId)
      .eq('event_type', 'conversation')
      .gte('created_at', startOfMonth.toISOString());

    if (error) {
      console.error("Error fetching usage:", error);
      return null;
    }

    const totalConversations = data?.reduce((sum, event) => sum + event.quantity, 0) || 0;
    return { conversationsUsed: totalConversations };
  },

  // --- ADMIN FUNCTIONS (Bypass RLS) ---

  getAllBots: async (): Promise<Bot[]> => {
    const client = supabase;
    if (!client) return [];
    const { data, error } = await client
      .from('bots')
      .select('*');

    if (error) {
      console.error("Error fetching all bots:", error);
      return [];
    }
    return data as Bot[];
  },

  getAllLeads: async (): Promise<Lead[]> => {
    const client = supabase;
    if (!client) return [];
    const { data, error } = await client
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching all leads:", error);
      return [];
    }
    return data as Lead[];
  },

  getAllConversations: async (): Promise<Conversation[]> => {
    const client = supabase;
    if (!client) return [];
    const { data, error } = await client
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching all conversations:", error);
      return [];
    }
    return data as Conversation[];
  },

  // Platform-wide statistics for admin dashboard
  getPlatformStats: async () => {
    const client = supabase;
    if (!client) return null;

    const { data: users } = await client.from('profiles').select('id', { count: 'exact' });
    const { data: bots } = await client.from('bots').select('id', { count: 'exact' });
    const { data: conversations } = await client.from('conversations').select('id', { count: 'exact' });
    const { data: leads } = await client.from('leads').select('id', { count: 'exact' });

    return {
      totalUsers: users?.length || 0,
      totalBots: bots?.length || 0,
      totalConversations: conversations?.length || 0,
      totalLeads: leads?.length || 0
    };
  }
};