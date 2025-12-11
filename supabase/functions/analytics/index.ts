// analytics Edge Function
// Tracks user events, page views, and bot interactions
// Production-ready analytics for BuildMyBot

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://buildmybot.app",
  "https://app.buildmybot.app",
  "http://localhost:8080",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  // Allow any origin for analytics tracking
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface AnalyticsEvent {
  event: string;
  botId?: string;
  sessionId?: string;
  url?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client info
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                      req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("User-Agent") || "";

    // Try to get user from auth header (optional for analytics)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body: AnalyticsEvent = await req.json();
    const { event, botId, sessionId, url, referrer, metadata } = body;

    if (!event) {
      return new Response(
        JSON.stringify({ error: "Event type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get bot owner ID if botId is provided
    let botOwnerId: string | null = null;
    if (botId) {
      const { data: bot } = await supabase
        .from("bots")
        .select("user_id")
        .eq("id", botId)
        .single();
      botOwnerId = bot?.user_id || null;
    }

    // Insert analytics event
    const { error: insertError } = await supabase.from("analytics_events").insert({
      user_id: botOwnerId || userId,
      bot_id: botId || null,
      event_type: event,
      event_data: metadata || {},
      session_id: sessionId,
      ip_address: ipAddress,
      user_agent: userAgent,
      page_url: url,
      referrer: referrer,
    });

    if (insertError) {
      console.error("Error inserting analytics:", insertError);
    }

    // Track specific events for usage billing
    if (event === "chat_message" && botOwnerId) {
      await supabase.from("usage_events").insert({
        user_id: botOwnerId,
        event_type: "message",
        quantity: 1,
        bot_id: botId,
        metadata: { session_id: sessionId },
      });
    }

    if (event === "widget_loaded" && botOwnerId) {
      // Count unique sessions for today
      const today = new Date().toISOString().split("T")[0];
      await supabase.rpc("increment_daily_visitors", {
        p_user_id: botOwnerId,
        p_bot_id: botId,
        p_date: today,
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analytics error:", error);
    // Don't fail silently for analytics - just return success to not break client
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
