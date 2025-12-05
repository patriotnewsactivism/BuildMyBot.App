// Edge Function: reseller-track-referral
// Tracks referral codes and associates new users with resellers

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';

interface RequestBody {
  action: 'click' | 'signup' | 'convert';
  referral_code: string;
  user_id?: string; // Required for signup and convert actions
  email?: string; // For tracking before signup
  source?: string; // utm_source or custom tracking
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: RequestBody = await req.json();
    const { action, referral_code, user_id, email, source, metadata } = body;

    if (!referral_code) {
      return new Response(
        JSON.stringify({ error: 'referral_code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!action || !['click', 'signup', 'convert'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Valid action is required: click, signup, or convert' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseClient();

    // Find reseller by code
    const { data: reseller, error: resellerError } = await supabase
      .from('reseller_accounts')
      .select('id, owner_id, reseller_code, is_approved, commission_rate, tier')
      .eq('reseller_code', referral_code.toUpperCase())
      .single();

    if (resellerError || !reseller) {
      return new Response(
        JSON.stringify({ error: 'Invalid referral code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reseller.is_approved) {
      return new Response(
        JSON.stringify({ error: 'Reseller account is not approved' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();

    switch (action) {
      case 'click': {
        // Track referral link click
        const { data: referral, error: insertError } = await supabase
          .from('referrals')
          .insert({
            reseller_id: reseller.id,
            referral_code: referral_code.toUpperCase(),
            referred_email: email || null,
            clicked_at: now,
            source: source || null,
            metadata: metadata || {},
          })
          .select('id')
          .single();

        if (insertError) {
          throw new Error(`Failed to track click: ${insertError.message}`);
        }

        return new Response(
          JSON.stringify({
            success: true,
            action: 'click',
            referral_id: referral.id,
            reseller: {
              code: reseller.reseller_code,
              tier: reseller.tier,
            },
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'signup': {
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'user_id is required for signup action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update user profile with referrer
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ referred_by: referral_code.toUpperCase() })
          .eq('id', user_id);

        if (profileError) {
          throw new Error(`Failed to update profile: ${profileError.message}`);
        }

        // Create reseller-client relationship
        const { error: clientError } = await supabase
          .from('reseller_clients')
          .upsert({
            reseller_id: reseller.id,
            client_id: user_id,
            referred_at: now,
            is_active: true,
          }, {
            onConflict: 'reseller_id,client_id',
          });

        if (clientError) {
          console.error('Failed to create reseller-client relationship:', clientError);
        }

        // Update existing referral or create new one
        const { data: existingReferral } = await supabase
          .from('referrals')
          .select('id')
          .eq('reseller_id', reseller.id)
          .eq('referred_email', email || '')
          .is('signed_up_at', null)
          .order('clicked_at', { ascending: false })
          .limit(1)
          .single();

        if (existingReferral) {
          await supabase
            .from('referrals')
            .update({
              signed_up_at: now,
              client_id: user_id,
            })
            .eq('id', existingReferral.id);
        } else {
          await supabase
            .from('referrals')
            .insert({
              reseller_id: reseller.id,
              referral_code: referral_code.toUpperCase(),
              referred_email: email || null,
              clicked_at: now,
              signed_up_at: now,
              client_id: user_id,
              source: source || null,
              metadata: metadata || {},
            });
        }

        return new Response(
          JSON.stringify({
            success: true,
            action: 'signup',
            user_id,
            reseller: {
              code: reseller.reseller_code,
              tier: reseller.tier,
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'convert': {
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: 'user_id is required for convert action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get user's subscription info
        const { data: billing } = await supabase
          .from('billing_accounts')
          .select('*')
          .eq('owner_id', user_id)
          .single();

        // Update referral with conversion timestamp
        await supabase
          .from('referrals')
          .update({ converted_at: now })
          .eq('client_id', user_id)
          .eq('reseller_id', reseller.id);

        // Create commission record if there's a payment
        const paymentAmount = (metadata?.payment_amount as number) || 0;

        if (paymentAmount > 0) {
          const commissionAmount = Math.floor(paymentAmount * (reseller.commission_rate / 100));

          const { data: commission, error: commissionError } = await supabase
            .from('commissions')
            .insert({
              reseller_id: reseller.id,
              client_id: user_id,
              amount_cents: commissionAmount,
              commission_rate: reseller.commission_rate,
              source_event: (metadata?.source_event as string) || 'subscription',
              status: 'pending',
              metadata: {
                payment_amount: paymentAmount,
                plan: billing?.plan_id || null,
              },
            })
            .select('id')
            .single();

          if (commissionError) {
            console.error('Failed to create commission:', commissionError);
          }

          // Update reseller totals
          await supabase
            .from('reseller_accounts')
            .update({
              total_revenue_cents: reseller.total_revenue_cents + paymentAmount,
              pending_payout_cents: reseller.pending_payout_cents + commissionAmount,
            })
            .eq('id', reseller.id);

          // Update reseller client lifetime revenue
          await supabase
            .from('reseller_clients')
            .update({
              lifetime_revenue_cents: supabase.sql`lifetime_revenue_cents + ${paymentAmount}`,
            })
            .eq('reseller_id', reseller.id)
            .eq('client_id', user_id);

          return new Response(
            JSON.stringify({
              success: true,
              action: 'convert',
              user_id,
              commission: {
                id: commission?.id,
                amount_cents: commissionAmount,
                rate: reseller.commission_rate,
              },
              reseller: {
                code: reseller.reseller_code,
                tier: reseller.tier,
              },
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            action: 'convert',
            user_id,
            commission: null,
            reseller: {
              code: reseller.reseller_code,
              tier: reseller.tier,
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('reseller-track-referral error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
