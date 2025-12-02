// Edge Function: stripe-webhook
// Purpose: Handle Stripe webhook events for billing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('stripe-signature')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Missing signature or secret' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.text()

    // Verify Stripe signature
    const verified = await verifyStripeSignature(body, signature, webhookSecret)

    if (!verified) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const event = JSON.parse(body)
    console.log('Stripe event received:', event.type)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object

        // Update billing account
        const { error } = await supabaseClient
          .from('billing_accounts')
          .update({
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', subscription.customer)

        if (error) {
          console.error('Error updating subscription:', error)
        }

        // Update user's plan based on subscription
        const planMapping: Record<string, string> = {
          'price_starter': 'starter',
          'price_pro': 'pro',
          'price_enterprise': 'enterprise',
        }

        const priceId = subscription.items.data[0]?.price.id
        const planId = planMapping[priceId] || 'free'

        if (planId !== 'free') {
          const { data: billingAccount } = await supabaseClient
            .from('billing_accounts')
            .select('owner_id')
            .eq('stripe_customer_id', subscription.customer)
            .single()

          if (billingAccount) {
            await supabaseClient
              .from('profiles')
              .update({ plan: planId })
              .eq('id', billingAccount.owner_id)
          }
        }

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object

        // Downgrade to free plan
        const { data: billingAccount } = await supabaseClient
          .from('billing_accounts')
          .select('owner_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (billingAccount) {
          await supabaseClient
            .from('profiles')
            .update({ plan: 'free' })
            .eq('id', billingAccount.owner_id)

          await supabaseClient
            .from('billing_accounts')
            .update({
              status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id)
        }

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object

        // Record successful payment
        await supabaseClient
          .from('billing_accounts')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', invoice.customer)

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object

        // Mark account as past_due
        await supabaseClient
          .from('billing_accounts')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', invoice.customer)

        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Stripe webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Verify Stripe webhook signature
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const signatureParts = signature.split(',')
    const timestamp = signatureParts.find(part => part.startsWith('t='))?.split('=')[1]
    const signatures = signatureParts.filter(part => part.startsWith('v1='))

    if (!timestamp || signatures.length === 0) {
      return false
    }

    const signedPayload = `${timestamp}.${payload}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature_bytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    )

    const expectedSignature = Array.from(new Uint8Array(signature_bytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return signatures.some(sig => sig.split('=')[1] === expectedSignature)
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}
