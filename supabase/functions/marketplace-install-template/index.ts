// marketplace-install-template Edge Function
// Installs a marketplace template as a new bot for the user

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  templateId: string;
  botName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
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

    const body: RequestBody = await req.json();
    const { templateId, botName } = body;

    if (!templateId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: templateId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from("marketplace_templates")
      .select("*")
      .eq("id", templateId)
      .eq("approved", true)
      .single();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: "Template not found or not approved" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user's bot limit
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    const planLimits: Record<string, number> = {
      FREE: 1,
      STARTER: 3,
      PROFESSIONAL: 10,
      EXECUTIVE: 25,
      ENTERPRISE: 999,
    };

    const botLimit = planLimits[profile?.plan || "FREE"] || 1;

    const { count: currentBots } = await supabase
      .from("bots")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((currentBots || 0) >= botLimit) {
      return new Response(
        JSON.stringify({
          error: "Bot limit reached",
          limit: botLimit,
          current: currentBots,
          plan: profile?.plan,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract bot config from template
    const botConfig = template.bot_config || {};

    // Create new bot from template
    const { data: newBot, error: botError } = await supabase
      .from("bots")
      .insert({
        user_id: user.id,
        name: botName || `${template.name} Bot`,
        type: template.category || "general",
        system_prompt: botConfig.systemPrompt || "You are a helpful assistant.",
        model: botConfig.model || "gpt-4o-mini",
        temperature: botConfig.temperature || 0.7,
        active: true,
        theme_color: botConfig.themeColor || "#2563eb",
        knowledge_base: [],
      })
      .select()
      .single();

    if (botError) {
      console.error("Error creating bot:", botError);
      return new Response(
        JSON.stringify({ error: "Failed to create bot from template" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment template install count
    await supabase
      .from("marketplace_templates")
      .update({ install_count: (template.install_count || 0) + 1 })
      .eq("id", templateId);

    return new Response(
      JSON.stringify({
        message: "Template installed successfully",
        bot: {
          id: newBot.id,
          name: newBot.name,
          type: newBot.type,
        },
        template: {
          id: template.id,
          name: template.name,
          category: template.category,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in marketplace-install-template:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
