import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { plan, successUrl, cancelUrl } = await req.json()

    // Validate plan
    const validPlans = ['STARTER', 'PROFESSIONAL', 'EXECUTIVE', 'ENTERPRISE']
    if (!validPlans.includes(plan)) {
      throw new Error('Invalid plan selected')
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    if (profileError) {
      throw new Error('Failed to fetch user profile')
    }

    let customerId = profile?.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: {
          supabase_user_id: user.id
        }
      })
      customerId = customer.id

      // Update profile with customer ID
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)

      if (updateError) {
        console.error('Failed to update profile with Stripe customer ID:', updateError)
      }
    }

    // Map plans to Stripe price IDs (from environment variables)
    const priceMap: Record<string, string | undefined> = {
      'STARTER': Deno.env.get('STRIPE_PRICE_STARTER'),
      'PROFESSIONAL': Deno.env.get('STRIPE_PRICE_PROFESSIONAL'),
      'EXECUTIVE': Deno.env.get('STRIPE_PRICE_EXECUTIVE'),
      'ENTERPRISE': Deno.env.get('STRIPE_PRICE_ENTERPRISE'),
    }

    const priceId = priceMap[plan]
    if (!priceId) {
      throw new Error(`Price ID not configured for plan: ${plan}`)
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        plan: plan,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: plan,
        },
      },
    })

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
