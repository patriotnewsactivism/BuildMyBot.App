// Edge Function: stripe-webhook
// Handles Stripe webhook events for subscription management

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';

// Stripe webhook event types we handle
type StripeEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed';

interface StripeEvent {
  id: string;
  type: StripeEventType;
  data: {
    object: Record<string, unknown>;
  };
}

// Map Stripe price IDs to plan slugs
const PRICE_TO_PLAN: Record<string, string> = {
  // Monthly prices
  'price_starter_monthly': 'STARTER',
  'price_professional_monthly': 'PROFESSIONAL',
  'price_executive_monthly': 'EXECUTIVE',
  'price_enterprise_monthly': 'ENTERPRISE',
  // Yearly prices
  'price_starter_yearly': 'STARTER',
  'price_professional_yearly': 'PROFESSIONAL',
  'price_executive_yearly': 'EXECUTIVE',
  'price_enterprise_yearly': 'ENTERPRISE',
};

// Verify Stripe webhook signature
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const sig = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !sig) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSig = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  const expectedSigHex = Array.from(new Uint8Array(expectedSig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return expectedSigHex === sig;
}

serve(async (req) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Missing signature or webhook secret' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.text();

    // Verify webhook signature
    const isValid = await verifyStripeSignature(payload, signature, webhookSecret);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const event: StripeEvent = JSON.parse(payload);
    const supabase = createSupabaseClient();

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          customer: string;
          subscription: string;
          client_reference_id: string; // user_id
          metadata?: { plan?: string };
        };

        if (session.client_reference_id) {
          // Update profile with Stripe customer ID
          await supabase
            .from('profiles')
            .update({ stripe_customer_id: session.customer })
            .eq('id', session.client_reference_id);

          // Create or update billing account
          await supabase.from('billing_accounts').upsert({
            owner_id: session.client_reference_id,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            status: 'active',
          }, {
            onConflict: 'owner_id',
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as {
          id: string;
          customer: string;
          status: string;
          items: { data: Array<{ price: { id: string } }> };
          current_period_start: number;
          current_period_end: number;
          cancel_at_period_end: boolean;
        };

        // Find user by Stripe customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .single();

        if (profile) {
          // Get plan from price ID
          const priceId = subscription.items.data[0]?.price?.id;
          const planSlug = PRICE_TO_PLAN[priceId] || 'FREE';

          // Update user's plan
          await supabase
            .from('profiles')
            .update({ plan: planSlug })
            .eq('id', profile.id);

          // Map Stripe status to our status
          let billingStatus = 'active';
          if (subscription.status === 'past_due') billingStatus = 'past_due';
          if (subscription.status === 'canceled') billingStatus = 'canceled';
          if (subscription.status === 'trialing') billingStatus = 'trialing';

          // Update billing account
          await supabase.from('billing_accounts').upsert({
            owner_id: profile.id,
            stripe_customer_id: subscription.customer,
            stripe_subscription_id: subscription.id,
            status: billingStatus,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          }, {
            onConflict: 'owner_id',
          });

          // Track reseller commission if applicable
          const { data: profileWithRef } = await supabase
            .from('profiles')
            .select('referred_by')
            .eq('id', profile.id)
            .single();

          if (profileWithRef?.referred_by && event.type === 'customer.subscription.created') {
            // Call reseller-track-referral function for conversion
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            await fetch(`${supabaseUrl}/functions/v1/reseller-track-referral`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'convert',
                referral_code: profileWithRef.referred_by,
                user_id: profile.id,
                metadata: {
                  payment_amount: 0, // Would need to get from invoice
                  source_event: 'subscription',
                },
              }),
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as {
          id: string;
          customer: string;
        };

        // Find user and downgrade to FREE
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ plan: 'FREE' })
            .eq('id', profile.id);

          await supabase
            .from('billing_accounts')
            .update({ status: 'canceled' })
            .eq('owner_id', profile.id);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as {
          customer: string;
          amount_paid: number;
          subscription: string;
        };

        // Find user
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, referred_by')
          .eq('stripe_customer_id', invoice.customer)
          .single();

        if (profile) {
          // Log usage event for payment
          await supabase.from('usage_events').insert({
            owner_id: profile.id,
            event_type: 'payment',
            cost_cents: invoice.amount_paid,
            metadata: {
              subscription_id: invoice.subscription,
            },
          });

          // Process reseller commission if referred
          if (profile.referred_by) {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            await fetch(`${supabaseUrl}/functions/v1/reseller-track-referral`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'convert',
                referral_code: profile.referred_by,
                user_id: profile.id,
                metadata: {
                  payment_amount: invoice.amount_paid,
                  source_event: 'renewal',
                },
              }),
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as {
          customer: string;
        };

        // Update billing status
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', invoice.customer)
          .single();

        if (profile) {
          await supabase
            .from('billing_accounts')
            .update({ status: 'past_due' })
            .eq('owner_id', profile.id);
        }
        break;
      }
    }

    return new Response(
      JSON.stringify({ received: true, type: event.type }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('stripe-webhook error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
