// Edge Function: reseller-track-referral
// Purpose: Track referral codes and associate new users with resellers

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TrackReferralRequest {
  referralCode: string
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

    const { referralCode }: TrackReferralRequest = await req.json()

    // Find reseller by code
    const { data: referrer, error: referrerError } = await supabaseClient
      .from('profiles')
      .select('id, reseller_code, role')
      .eq('reseller_code', referralCode)
      .eq('role', 'reseller')
      .single()

    if (referrerError || !referrer) {
      return new Response(
        JSON.stringify({ error: 'Invalid referral code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update user profile with referral info
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ referred_by: referralCode })
      .eq('id', user.id)

    if (updateError) {
      throw updateError
    }

    // Get or create reseller account
    const { data: resellerAccount } = await supabaseClient
      .from('reseller_accounts')
      .select('id')
      .eq('user_id', referrer.id)
      .single()

    let resellerAccountId = resellerAccount?.id

    if (!resellerAccountId) {
      const { data: newAccount, error: accountError } = await supabaseClient
        .from('reseller_accounts')
        .insert({
          user_id: referrer.id,
          tier: 'bronze',
          commission_rate: 0.20,
          status: 'approved',
        })
        .select()
        .single()

      if (accountError) {
        throw accountError
      }

      resellerAccountId = newAccount.id
    }

    // Create referral record
    const { data: referral, error: referralError } = await supabaseClient
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referred_id: user.id,
        referral_code: referralCode,
        status: 'pending',
      })
      .select()
      .single()

    if (referralError) {
      throw referralError
    }

    // Create reseller-client relationship
    const { error: clientError } = await supabaseClient
      .from('reseller_clients')
      .insert({
        reseller_id: resellerAccountId,
        client_id: user.id,
      })

    if (clientError && clientError.code !== '23505') { // Ignore duplicate key errors
      throw clientError
    }

    // Update reseller total clients count
    const { count: clientCount } = await supabaseClient
      .from('reseller_clients')
      .select('*', { count: 'exact', head: true })
      .eq('reseller_id', resellerAccountId)

    await supabaseClient
      .from('reseller_accounts')
      .update({ total_clients: clientCount || 0 })
      .eq('id', resellerAccountId)

    return new Response(
      JSON.stringify({
        success: true,
        referralId: referral.id,
        message: 'Referral tracked successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Track referral error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
