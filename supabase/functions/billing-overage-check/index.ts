// Edge Function: billing-overage-check
// Checks plan limits and compares against current usage

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';

interface RequestBody {
  user_id?: string; // Optional: admin can check any user
  resource_type: 'ai_tokens' | 'conversations' | 'leads' | 'knowledge_items' | 'bots';
  requested_amount?: number; // How many more of this resource are being requested
}

interface UsageLimits {
  ai_tokens: { used: number; limit: number; remaining: number };
  conversations: { used: number; limit: number; remaining: number };
  leads: { used: number; limit: number; remaining: number };
  knowledge_items: { used: number; limit: number; remaining: number };
  bots: { used: number; limit: number; remaining: number };
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = await getUserFromAuth(authHeader);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    const { resource_type, requested_amount = 1 } = body;

    // Determine which user to check (self or specified)
    let targetUserId = user.id;

    if (body.user_id && body.user_id !== user.id) {
      // Check if requesting user is admin
      const supabase = createSupabaseClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'ADMIN') {
        return new Response(
          JSON.stringify({ error: 'Only admins can check other users\' usage' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      targetUserId = body.user_id;
    }

    const supabase = createSupabaseClient();

    // Get user's plan
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, status')
      .eq('id', targetUserId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.status !== 'Active') {
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: 'Account is suspended',
          usage: null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get plan limits
    const { data: planLimits, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('slug', profile.plan)
      .single();

    if (planError || !planLimits) {
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get monthly usage
    const { data: monthlyUsage } = await supabase.rpc('get_monthly_usage', { user_id: targetUserId });
    const usage = monthlyUsage?.[0] || { total_tokens: 0, total_conversations: 0, total_leads: 0 };

    // Get bot count
    const { count: botCount } = await supabase
      .from('bots')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', targetUserId);

    // Get knowledge base count (across all bots)
    const { count: kbCount } = await supabase
      .from('knowledge_base')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', targetUserId);

    // Build usage limits object
    const limits: UsageLimits = {
      ai_tokens: {
        used: usage.total_tokens || 0,
        limit: planLimits.max_ai_tokens,
        remaining: planLimits.max_ai_tokens === -1 ? Infinity : Math.max(0, planLimits.max_ai_tokens - (usage.total_tokens || 0)),
      },
      conversations: {
        used: usage.total_conversations || 0,
        limit: planLimits.max_conversations,
        remaining: planLimits.max_conversations === -1 ? Infinity : Math.max(0, planLimits.max_conversations - (usage.total_conversations || 0)),
      },
      leads: {
        used: usage.total_leads || 0,
        limit: planLimits.max_leads,
        remaining: planLimits.max_leads === -1 ? Infinity : Math.max(0, planLimits.max_leads - (usage.total_leads || 0)),
      },
      knowledge_items: {
        used: kbCount || 0,
        limit: planLimits.max_knowledge_items,
        remaining: planLimits.max_knowledge_items === -1 ? Infinity : Math.max(0, planLimits.max_knowledge_items - (kbCount || 0)),
      },
      bots: {
        used: botCount || 0,
        limit: planLimits.max_bots,
        remaining: planLimits.max_bots === -1 ? Infinity : Math.max(0, planLimits.max_bots - (botCount || 0)),
      },
    };

    // Check if specific resource request is allowed
    let allowed = true;
    let reason = '';

    if (resource_type && resource_type in limits) {
      const resourceLimits = limits[resource_type];

      if (resourceLimits.limit !== -1 && resourceLimits.remaining < requested_amount) {
        allowed = false;
        reason = `${resource_type} limit exceeded. Used: ${resourceLimits.used}, Limit: ${resourceLimits.limit}, Requested: ${requested_amount}`;
      }
    }

    return new Response(
      JSON.stringify({
        allowed,
        reason: reason || (allowed ? 'Within limits' : 'Limit exceeded'),
        plan: profile.plan,
        usage: limits,
        billing_period: {
          start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
          end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('billing-overage-check error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
