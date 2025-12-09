// billing-overage-check Edge Function
// Checks if user is within their plan limits

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan limits configuration
const PLAN_LIMITS = {
  FREE: {
    api_calls: 100,
    messages: 500,
    leads: 10,
    bots: 1,
    storage_mb: 10,
  },
  STARTER: {
    api_calls: 1000,
    messages: 5000,
    leads: 100,
    bots: 3,
    storage_mb: 100,
  },
  PROFESSIONAL: {
    api_calls: 10000,
    messages: 50000,
    leads: 1000,
    bots: 10,
    storage_mb: 500,
  },
  EXECUTIVE: {
    api_calls: 50000,
    messages: 250000,
    leads: 5000,
    bots: 25,
    storage_mb: 2000,
  },
  ENTERPRISE: {
    api_calls: -1, // Unlimited
    messages: -1,
    leads: -1,
    bots: -1,
    storage_mb: -1,
  },
};

interface RequestBody {
  userId: string;
  eventType: "api_call" | "message" | "lead_capture" | "storage_mb";
  quantity?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    const { userId, eventType, quantity = 1 } = body;

    if (!userId || !eventType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, eventType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile and plan
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("plan, status")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is suspended
    if (profile.status === "Suspended") {
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: "Account suspended",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const plan = profile.plan as keyof typeof PLAN_LIMITS;
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;

    // Map event type to limit key
    const limitKeyMap: Record<string, keyof typeof limits> = {
      api_call: "api_calls",
      message: "messages",
      lead_capture: "leads",
      storage_mb: "storage_mb",
    };

    const limitKey = limitKeyMap[eventType];
    if (!limitKey) {
      return new Response(
        JSON.stringify({ error: "Invalid event type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const limit = limits[limitKey];

    // Unlimited check
    if (limit === -1) {
      return new Response(
        JSON.stringify({
          allowed: true,
          plan,
          limit: "unlimited",
          used: 0,
          remaining: "unlimited",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current period usage (this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: usageData, error: usageError } = await supabase
      .from("usage_events")
      .select("quantity")
      .eq("user_id", userId)
      .eq("event_type", eventType)
      .gte("created_at", startOfMonth.toISOString());

    if (usageError) {
      console.error("Error fetching usage:", usageError);
      // Default to allowing on error
      return new Response(
        JSON.stringify({ allowed: true, plan, warning: "Could not verify usage" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalUsed = usageData.reduce((sum, e) => sum + (Number(e.quantity) || 1), 0);
    const remaining = limit - totalUsed;
    const allowed = remaining >= quantity;

    return new Response(
      JSON.stringify({
        allowed,
        plan,
        limit,
        used: totalUsed,
        remaining: Math.max(0, remaining),
        requested: quantity,
        reason: allowed ? null : `${eventType} limit exceeded for ${plan} plan`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in billing-overage-check:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
