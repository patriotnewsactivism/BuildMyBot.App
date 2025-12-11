// health Edge Function
// Provides health check endpoint for monitoring and orchestrators

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check database connectivity
    const dbStart = Date.now();
    const { error: dbError } = await supabase.from("profiles").select("id").limit(1);
    const dbLatency = Date.now() - dbStart;

    // Check if OpenAI key is configured
    const openaiConfigured = !!Deno.env.get("OPENAI_API_KEY");

    const healthy = !dbError && openaiConfigured;

    const response = {
      status: healthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      checks: {
        database: {
          status: dbError ? "unhealthy" : "healthy",
          latencyMs: dbLatency,
          error: dbError?.message,
        },
        openai: {
          status: openaiConfigured ? "configured" : "missing",
        },
      },
      totalLatencyMs: Date.now() - startTime,
    };

    return new Response(JSON.stringify(response), {
      status: healthy ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
        totalLatencyMs: Date.now() - startTime,
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
