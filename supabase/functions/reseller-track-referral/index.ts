// Reseller Track Referral Edge Function
// Associates a referral code with a new user signup

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  referralCode: string;
  newUserId?: string;
  email?: string;
}

// Calculate reseller tier based on client count
function calculateTier(clientCount: number): { tier: string; commissionRate: number } {
  if (clientCount >= 250) {
    return { tier: 'Platinum', commissionRate: 0.50 };
  } else if (clientCount >= 150) {
    return { tier: 'Gold', commissionRate: 0.40 };
  } else if (clientCount >= 50) {
    return { tier: 'Silver', commissionRate: 0.30 };
  } else {
    return { tier: 'Bronze', commissionRate: 0.20 };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { referralCode, newUserId, email }: RequestBody = await req.json();

    if (!referralCode) {
      throw new Error('Missing required field: referralCode');
    }

    // Find reseller account by referral code
    const { data: resellerAccount, error: resellerError } = await supabaseClient
      .from('reseller_accounts')
      .select('*')
      .eq('referral_code', referralCode)
      .single();

    if (resellerError || !resellerAccount) {
      throw new Error('Invalid referral code');
    }

    // Create or update referral record
    if (newUserId) {
      // User has completed signup - convert referral
      const { data: referral, error: referralError } = await supabaseClient
        .from('referrals')
        .insert({
          reseller_id: resellerAccount.id,
          referred_user_id: newUserId,
          referral_code: referralCode,
          email,
          status: 'converted',
          converted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (referralError) {
        console.error('Error creating referral:', referralError);
      }

      // Create reseller-client relationship
      const { error: clientError } = await supabaseClient
        .from('reseller_clients')
        .insert({
          reseller_id: resellerAccount.id,
          client_id: newUserId,
          status: 'active',
          lifetime_value: 0,
        });

      if (clientError) {
        console.error('Error creating client relationship:', clientError);
      }

      // Update reseller account stats
      const newClientCount = (resellerAccount.total_clients || 0) + 1;
      const { tier, commissionRate } = calculateTier(newClientCount);

      await supabaseClient
        .from('reseller_accounts')
        .update({
          total_clients: newClientCount,
          tier,
          commission_rate: commissionRate,
        })
        .eq('id', resellerAccount.id);

      // Update referred user's profile
      await supabaseClient
        .from('profiles')
        .update({
          referred_by: referralCode,
        })
        .eq('id', newUserId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Referral tracked successfully',
          reseller: {
            tier,
            commissionRate,
            totalClients: newClientCount,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      // Just tracking the referral (pending conversion)
      const { data: referral, error: referralError } = await supabaseClient
        .from('referrals')
        .insert({
          reseller_id: resellerAccount.id,
          referral_code: referralCode,
          email,
          status: 'pending',
        })
        .select()
        .single();

      if (referralError) {
        throw new Error(`Failed to track referral: ${referralError.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Referral code validated',
          referralId: referral.id,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error('Error in reseller-track-referral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
