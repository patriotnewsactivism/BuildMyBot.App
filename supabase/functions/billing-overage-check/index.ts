// Edge Function: billing-overage-check
// Purpose: Check if user has exceeded their plan limits

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile and plan
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    // Get plan limits
    const { data: planData } = await supabaseClient
      .from('plans')
      .select('limits')
      .eq('id', profile?.plan || 'free')
      .single()

    if (!planData) {
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get usage for current month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Count message usage
    const { count: messageCount } = await supabaseClient
      .from('usage_events')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('event_type', 'message')
      .gte('created_at', startOfMonth.toISOString())

    // Count bots
    const { count: botCount } = await supabaseClient
      .from('bots')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)

    const limits = planData.limits
    const messageLimit = limits.messages || 100
    const botLimit = limits.bots || 1

    const usage = {
      messages: {
        current: messageCount || 0,
        limit: messageLimit,
        exceeded: messageLimit !== -1 && (messageCount || 0) >= messageLimit,
      },
      bots: {
        current: botCount || 0,
        limit: botLimit,
        exceeded: botLimit !== -1 && (botCount || 0) >= botLimit,
      },
    }

    const canProceed = !usage.messages.exceeded && !usage.bots.exceeded

    return new Response(
      JSON.stringify({
        allowed: canProceed,
        usage,
        plan: profile?.plan || 'free',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Billing check error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
