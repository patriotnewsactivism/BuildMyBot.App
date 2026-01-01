// create-checkout-session Edge Function
// Creates a Stripe Checkout Session for plan upgrades

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, logUsage } from "../_shared/rateLimit.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Zod schema for input validation
const CreateCheckoutSchema = z.object({
  planId: z.enum(["FREE", "STARTER", "PROFESSIONAL", "EXECUTIVE", "ENTERPRISE"]),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// Stripe Price IDs (these should be configured in Stripe Dashboard)
const STRIPE_PRICE_IDS: Record<string, string> = {
  STARTER: Deno.env.get("STRIPE_PRICE_STARTER") || "",
  PROFESSIONAL: Deno.env.get("STRIPE_PRICE_PROFESSIONAL") || "",
  EXECUTIVE: Deno.env.get("STRIPE_PRICE_EXECUTIVE") || "",
  ENTERPRISE: Deno.env.get("STRIPE_PRICE_ENTERPRISE") || "",
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
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

    // Check rate limiting
    const rateLimitResult = await checkRateLimit(
      user.id,
      "create-checkout-session",
      supabaseUrl,
      supabaseServiceKey
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: rateLimitResult.error || "Rate limit exceeded",
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        }
      );
    }

    const rawBody = await req.json();

    // Validate input
    const validation = CreateCheckoutSchema.safeParse(rawBody);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request format",
          details: validation.error.format()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { planId, successUrl, cancelUrl } = validation.data;

    // FREE plan doesn't need checkout
    if (planId === "FREE") {
      return new Response(
        JSON.stringify({ error: "FREE plan does not require checkout" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const priceId = STRIPE_PRICE_IDS[planId];
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "Invalid plan or price not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's email and profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, plan")
      .eq("id", user.id)
      .single();

    // Prevent downgrade to same or lower plan
    const planOrder = { FREE: 0, STARTER: 1, PROFESSIONAL: 2, EXECUTIVE: 3, ENTERPRISE: 4 };
    const currentPlanLevel = planOrder[profile?.plan || "FREE"];
    const newPlanLevel = planOrder[planId];

    if (newPlanLevel <= currentPlanLevel) {
      return new Response(
        JSON.stringify({ error: "Cannot downgrade or switch to same plan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Stripe Checkout Session
    const checkoutSession = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "subscription",
        "customer_email": user.email || profile?.email || "",
        "client_reference_id": user.id,
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        "success_url": successUrl || `${origin}/billing?success=true&plan=${planId}`,
        "cancel_url": cancelUrl || `${origin}/billing?canceled=true`,
        "metadata[user_id]": user.id,
        "metadata[plan_id]": planId,
        "subscription_data[metadata][user_id]": user.id,
        "subscription_data[metadata][plan_id]": planId,
      }).toString(),
    });

    if (!checkoutSession.ok) {
      const errorText = await checkoutSession.text();
      console.error("Stripe checkout error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create checkout session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const session = await checkoutSession.json();

    // Log usage for rate limiting
    await logUsage(user.id, "create-checkout-session", 1, supabaseUrl, supabaseServiceKey);

    // Track checkout created event
    await supabase.from("usage_events").insert({
      user_id: user.id,
      event_type: "checkout_created",
      quantity: 1,
      metadata: { plan_id: planId, session_id: session.id },
    });

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-checkout-session:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
