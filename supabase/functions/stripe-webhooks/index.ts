import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null

serve(async (req) => {
  if (!stripe || !stripeSecretKey || !stripeWebhookSecret) {
    console.error('Missing Stripe configuration for webhook processing')
    return new Response('Server misconfiguration', { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    console.error('Missing stripe-signature header')
    return new Response('Missing signature', { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event

  // Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeWebhookSecret
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase configuration for Stripe webhook handler')
    return new Response('Server misconfiguration', { status: 500 })
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseServiceRoleKey
  )

  console.log('Processing webhook event:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const plan = session.metadata?.plan

        if (!userId || !plan) {
          console.error('Missing metadata in checkout session')
          break
        }

        // Null checks for required fields
        if (!session.subscription || !session.customer) {
          console.error('Missing subscription or customer in checkout session')
          break
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        )

        // Create or update billing account
        const { error: billingError } = await supabase
          .from('billing_accounts')
          .upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plan: plan,
            status: 'active',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          })

        if (billingError) {
          console.error('Failed to update billing account:', billingError)
        }

        // Update user plan in profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ plan: plan })
          .eq('id', userId)

        if (profileError) {
          console.error('Failed to update user plan:', profileError)
        } else {
          console.log(`Successfully upgraded user ${userId} to ${plan}`)
        }

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        // Null check for customer
        if (!subscription.customer) {
          console.error('Missing customer in subscription update')
          break
        }

        // Find user by customer ID
        const { data: profile, error: profileFetchError } = await supabase
          .from('profiles')
          .select('id, plan')
          .eq('stripe_customer_id', subscription.customer as string)
          .single()

        if (profileFetchError || !profile) {
          console.error('User not found for customer:', subscription.customer)
          break
        }

        // Map subscription status to billing status
        const statusMap: Record<string, string> = {
          'active': 'active',
          'past_due': 'past_due',
          'canceled': 'canceled',
          'unpaid': 'past_due',
          'incomplete': 'past_due',
        }
        const billingStatus = statusMap[subscription.status] || 'active'

        // Update billing account
        const { error: billingError } = await supabase
          .from('billing_accounts')
          .update({
            status: billingStatus,
            stripe_subscription_id: subscription.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', profile.id)

        if (billingError) {
          console.error('Failed to update billing status:', billingError)
        }

        console.log(`Updated subscription status for user ${profile.id}: ${billingStatus}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Null check for customer
        if (!subscription.customer) {
          console.error('Missing customer in subscription deletion')
          break
        }

        // Find user by customer ID
        const { data: profile, error: profileFetchError } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single()

        if (profileFetchError || !profile) {
          console.error('User not found for customer:', subscription.customer)
          break
        }

        // Update billing account status
        const { error: billingError } = await supabase
          .from('billing_accounts')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', profile.id)

        if (billingError) {
          console.error('Failed to cancel billing account:', billingError)
        }

        // Downgrade user to FREE plan
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ plan: 'FREE' })
          .eq('id', profile.id)

        if (profileError) {
          console.error('Failed to downgrade user to FREE:', profileError)
        } else {
          console.log(`Downgraded user ${profile.id} to FREE plan`)
        }

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        // Null check for customer
        if (!invoice.customer) {
          console.error('Missing customer in invoice payment_failed')
          break
        }

        // Find user by customer ID
        const { data: profile, error: profileFetchError } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', invoice.customer as string)
          .single()

        if (profileFetchError || !profile) {
          console.error('User not found for customer:', invoice.customer)
          break
        }

        // Mark billing account as past_due
        const { error: billingError } = await supabase
          .from('billing_accounts')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', profile.id)

        if (billingError) {
          console.error('Failed to mark account as past_due:', billingError)
        }

        console.log(`Payment failed for user ${profile.id}, marked as past_due`)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        // Null check for customer
        if (!invoice.customer) {
          console.error('Missing customer in invoice payment_succeeded')
          break
        }

        // Find user by customer ID
        const { data: profile, error: profileFetchError } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', invoice.customer as string)
          .single()

        if (profileFetchError || !profile) {
          console.error('User not found for customer:', invoice.customer)
          break
        }

        // Mark billing account as active (payment recovered)
        const { error: billingError } = await supabase
          .from('billing_accounts')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', profile.id)

        if (billingError) {
          console.error('Failed to mark account as active:', billingError)
        }

        console.log(`Payment succeeded for user ${profile.id}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
