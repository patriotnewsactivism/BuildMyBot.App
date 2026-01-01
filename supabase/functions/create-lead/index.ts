// create-lead Edge Function
// Creates lead records from chat interactions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, logUsage } from "../_shared/rateLimit.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Zod schema for input validation
const CreateLeadSchema = z.object({
  botId: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  score: z.number().int().min(0).max(100).optional(),
  sourceUrl: z.string().url().max(2048).optional(),
  metadata: z.record(z.unknown()).optional(),
});

interface RequestBody {
  botId: string;
  name: string;
  email: string;
  phone?: string;
  score?: number;
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.json();

    // Validate input
    const validation = CreateLeadSchema.safeParse(rawBody);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request format",
          details: validation.error.format()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { botId, name, email, phone, score, sourceUrl, metadata } = validation.data;

    // Fetch bot to get owner
    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("user_id")
      .eq("id", botId)
      .single();

    if (botError || !bot) {
      return new Response(
        JSON.stringify({ error: "Bot not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limiting for bot owner
    const rateLimitResult = await checkRateLimit(
      bot.user_id,
      "create-lead",
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

    // Check for duplicate lead (same email + bot)
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("email", email)
      .eq("bot_id", botId)
      .single();

    if (existingLead) {
      return new Response(
        JSON.stringify({
          message: "Lead already exists",
          leadId: existingLead.id,
          duplicate: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate lead score if not provided
    const leadScore = score ?? 50;

    // Create lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        user_id: bot.user_id,
        bot_id: botId,
        name,
        email,
        phone,
        score: leadScore,
        status: "New",
        source_url: sourceUrl,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (leadError) {
      console.error("Error creating lead:", leadError);
      return new Response(
        JSON.stringify({ error: "Failed to create lead" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log usage for rate limiting
    await logUsage(bot.user_id, "create-lead", 1, supabaseUrl, supabaseServiceKey);

    // Log usage event
    await supabase.from("usage_events").insert({
      user_id: bot.user_id,
      event_type: "lead_capture",
      quantity: 1,
      bot_id: botId,
      metadata: { lead_id: lead.id, source_url: sourceUrl },
    });

    return new Response(
      JSON.stringify({
        message: "Lead created successfully",
        lead: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          score: lead.score,
          status: lead.status,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-lead:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
