// public-bot Edge Function
// Serves bot configuration for public embedding/sharing
// NO authentication required - this is intentionally public

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allow all origins for embed widget
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const botId = url.searchParams.get("botId");
    const embedCode = url.searchParams.get("embedCode");

    if (!botId && !embedCode) {
      return new Response(
        JSON.stringify({ error: "Missing botId or embedCode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch bot by ID or embed_code
    let query = supabase
      .from("bots")
      .select("id, name, system_prompt, model, temperature, theme_color, avatar, max_messages, response_delay, knowledge_base, active, embed_code, user_id");

    if (botId) {
      query = query.eq("id", botId);
    } else if (embedCode) {
      query = query.eq("embed_code", embedCode);
    }

    const { data: bot, error } = await query.eq("active", true).single();

    if (error || !bot) {
      return new Response(
        JSON.stringify({ error: "Bot not found or not active" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return safe bot data (exclude sensitive fields like full system prompt details)
    return new Response(
      JSON.stringify({
        bot: {
          id: bot.id,
          name: bot.name,
          systemPrompt: bot.system_prompt,
          model: bot.model,
          temperature: bot.temperature,
          themeColor: bot.theme_color,
          avatar: bot.avatar,
          maxMessages: bot.max_messages,
          responseDelay: bot.response_delay,
          knowledgeBase: bot.knowledge_base || [],
          active: bot.active,
          embedCode: bot.embed_code,
        },
        // Include embed token for AI calls
        embedToken: bot.embed_code,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in public-bot:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
