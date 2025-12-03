// Billing Overage Check Edge Function
// Validates if user has exceeded their plan limits

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  resourceType: 'bot' | 'conversation' | 'knowledge_base';
}

// Plan limits (matches constants.ts)
const PLAN_LIMITS: Record<string, { bots: number; conversations: number }> = {
  FREE: { bots: 1, conversations: 60 },
  STARTER: { bots: 1, conversations: 750 },
  PROFESSIONAL: { bots: 5, conversations: 5000 },
  EXECUTIVE: { bots: 10, conversations: 15000 },
  ENTERPRISE: { bots: 9999, conversations: 50000 },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { resourceType }: RequestBody = await req.json();

    if (!resourceType) {
      throw new Error('Missing required field: resourceType');
    }

    // Get user's current plan
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    const userPlan = profile?.plan || 'FREE';
    const limits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.FREE;

    let allowed = true;
    let message = '';
    let currentUsage = 0;
    let limit = 0;

    if (resourceType === 'bot') {
      // Check bot limit
      const { count } = await supabaseClient
        .from('bots')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      currentUsage = count || 0;
      limit = limits.bots;
      allowed = currentUsage < limit;
      message = allowed
        ? `You can create more bots (${currentUsage}/${limit})`
        : `Bot limit reached (${currentUsage}/${limit}). Please upgrade your plan.`;
    } else if (resourceType === 'conversation') {
      // Check conversation limit (monthly)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabaseClient
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      currentUsage = count || 0;
      limit = limits.conversations;
      allowed = currentUsage < limit;
      message = allowed
        ? `You can have more conversations this month (${currentUsage}/${limit})`
        : `Monthly conversation limit reached (${currentUsage}/${limit}). Please upgrade your plan.`;
    } else if (resourceType === 'knowledge_base') {
      // Knowledge base has no strict limit, but we can add one
      allowed = true;
      message = 'Knowledge base upload allowed';
    }

    // Get billing account info
    const { data: billingAccount } = await supabaseClient
      .from('billing_accounts')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    const billingStatus = billingAccount?.status || 'active';
    if (billingStatus !== 'active' && billingStatus !== 'trialing') {
      allowed = false;
      message = 'Your billing account is not active. Please update your payment method.';
    }

    return new Response(
      JSON.stringify({
        allowed,
        message,
        currentUsage,
        limit,
        plan: userPlan,
        billingStatus,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in billing-overage-check:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
