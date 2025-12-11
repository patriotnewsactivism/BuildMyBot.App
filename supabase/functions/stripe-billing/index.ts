// stripe-billing Edge Function
// Handles Stripe checkout, webhooks, and subscription management
// Production-ready implementation for BuildMyBot SaaS billing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const ALLOWED_ORIGINS = [
  "https://buildmybot.app",
  "https://app.buildmybot.app",
  "http://localhost:8080",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Plan to Stripe Price ID mapping
const PLAN_PRICE_IDS: Record<string, string> = {
  STARTER: Deno.env.get("STRIPE_PRICE_STARTER") || "price_starter",
  PROFESSIONAL: Deno.env.get("STRIPE_PRICE_PROFESSIONAL") || "price_professional",
  EXECUTIVE: Deno.env.get("STRIPE_PRICE_EXECUTIVE") || "price_executive",
  ENTERPRISE: Deno.env.get("STRIPE_PRICE_ENTERPRISE") || "price_enterprise",
};

// Plan limits for validation
const PLAN_LIMITS = {
  FREE: { conversations: 60, bots: 1 },
  STARTER: { conversations: 750, bots: 1 },
  PROFESSIONAL: { conversations: 5000, bots: 5 },
  EXECUTIVE: { conversations: 15000, bots: 10 },
  ENTERPRISE: { conversations: 50000, bots: 9999 },
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a webhook event
    const signature = req.headers.get("stripe-signature");

    if (signature && webhookSecret) {
      // Handle Stripe webhook
      const body = await req.text();
      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response(
          JSON.stringify({ error: "Webhook signature verification failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Process webhook events
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const plan = session.metadata?.plan;

          if (userId && plan) {
            // Update user profile with new plan
            await supabase
              .from("profiles")
              .update({
                plan: plan,
                stripe_customer_id: session.customer as string,
              })
              .eq("id", userId);

            // Create/update billing account
            await supabase.from("billing_accounts").upsert({
              user_id: userId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              plan: plan,
              status: "active",
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });

            console.log(`User ${userId} upgraded to ${plan}`);
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          // Find user by Stripe customer ID
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (profile) {
            const status = subscription.status === "active" ? "active" :
                          subscription.status === "past_due" ? "past_due" :
                          subscription.status === "canceled" ? "canceled" : "active";

            await supabase
              .from("billing_accounts")
              .update({
                status,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: subscription.cancel_at_period_end,
              })
              .eq("user_id", profile.id);
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          // Find user and downgrade to FREE
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (profile) {
            await supabase
              .from("profiles")
              .update({ plan: "FREE" })
              .eq("id", profile.id);

            await supabase
              .from("billing_accounts")
              .update({ status: "canceled", plan: "FREE" })
              .eq("user_id", profile.id);

            console.log(`User ${profile.id} subscription canceled, downgraded to FREE`);
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;

          const { data: profile } = await supabase
            .from("profiles")
            .select("id, email")
            .eq("stripe_customer_id", customerId)
            .single();

          if (profile) {
            await supabase
              .from("billing_accounts")
              .update({ status: "past_due" })
              .eq("user_id", profile.id);

            // Could trigger email notification here
            console.log(`Payment failed for user ${profile.id}`);
          }
          break;
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Regular API request - requires authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "create-checkout": {
        const { plan, successUrl, cancelUrl } = body;

        if (!plan || !PLAN_PRICE_IDS[plan]) {
          return new Response(
            JSON.stringify({ error: "Invalid plan selected" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get or create Stripe customer
        const { data: profile } = await supabase
          .from("profiles")
          .select("stripe_customer_id, email, name")
          .eq("id", user.id)
          .single();

        let customerId = profile?.stripe_customer_id;

        if (!customerId) {
          const customer = await stripe.customers.create({
            email: profile?.email || user.email,
            name: profile?.name,
            metadata: { userId: user.id },
          });
          customerId = customer.id;

          await supabase
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", user.id);
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [
            {
              price: PLAN_PRICE_IDS[plan],
              quantity: 1,
            },
          ],
          success_url: successUrl || `${req.headers.get("Origin")}/billing?success=true`,
          cancel_url: cancelUrl || `${req.headers.get("Origin")}/billing?canceled=true`,
          metadata: {
            userId: user.id,
            plan: plan,
          },
          subscription_data: {
            metadata: {
              userId: user.id,
              plan: plan,
            },
          },
        });

        return new Response(
          JSON.stringify({ sessionId: session.id, url: session.url }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create-portal": {
        // Create customer portal session for managing subscription
        const { data: profile } = await supabase
          .from("profiles")
          .select("stripe_customer_id")
          .eq("id", user.id)
          .single();

        if (!profile?.stripe_customer_id) {
          return new Response(
            JSON.stringify({ error: "No subscription found" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const portalSession = await stripe.billingPortal.sessions.create({
          customer: profile.stripe_customer_id,
          return_url: body.returnUrl || `${req.headers.get("Origin")}/billing`,
        });

        return new Response(
          JSON.stringify({ url: portalSession.url }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get-subscription": {
        const { data: billingAccount } = await supabase
          .from("billing_accounts")
          .select("*")
          .eq("user_id", user.id)
          .single();

        const { data: profile } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .single();

        // Get current usage
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: conversationCount } = await supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", startOfMonth.toISOString());

        const { count: botCount } = await supabase
          .from("bots")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        const plan = profile?.plan || "FREE";
        const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.FREE;

        return new Response(
          JSON.stringify({
            subscription: billingAccount,
            plan: plan,
            usage: {
              conversations: conversationCount || 0,
              conversationLimit: limits.conversations,
              bots: botCount || 0,
              botLimit: limits.bots,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Error in stripe-billing:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
