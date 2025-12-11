// admin-stats Edge Function
// SEC-005, PERF-001 FIXES Applied
// Provides admin statistics with proper authorization

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    // SEC-005 FIX: Verify user is an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_master_admin")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "ADMIN" && !profile.is_master_admin)) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit
    const rateCheck = await checkRateLimit(supabase, user.id, getClientIp(req), "admin-stats");
    if (!rateCheck.allowed) {
      return rateLimitResponse(corsHeaders);
    }

    // Parse request for action type
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "stats";

    if (action === "stats") {
      // PERF-001 FIX: Use server-side function for stats
      const { data: stats, error: statsError } = await supabase.rpc("get_admin_stats");

      if (statsError) {
        console.error("Stats error:", statsError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch stats" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ stats: stats[0] || {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "users") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const pageSize = parseInt(url.searchParams.get("pageSize") || "50");
      const search = url.searchParams.get("search") || null;

      // PERF-001 FIX: Use paginated server-side function
      const { data: users, error: usersError } = await supabase.rpc("get_admin_users", {
        p_page: page,
        p_page_size: pageSize,
        p_search: search,
      });

      if (usersError) {
        console.error("Users error:", usersError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch users" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ users, page, pageSize }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const corsHeaders = getCorsHeaders(req);
    console.error("Error in admin-stats:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
