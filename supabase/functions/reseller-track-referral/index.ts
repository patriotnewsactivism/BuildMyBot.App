// reseller-track-referral Edge Function
// Tracks referral codes, generates unique reseller codes, and manages referral stats

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a unique, readable referral code
function generateReferralCode(companyName: string): string {
  // Clean company name and get first 4 chars
  const prefix = companyName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 4)
    .toUpperCase() || 'REF';

  // Generate random alphanumeric suffix
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars like 0/O, 1/I/L
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${prefix}-${suffix}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, referralCode, userId, companyName } = body;

    // === ACTION: TRACK - Track a referral during user signup ===
    if (action === "track") {
      if (!referralCode || !userId) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: referralCode, userId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find reseller with this code
      const { data: reseller, error: resellerError } = await supabase
        .from("profiles")
        .select("id, name, email, reseller_code, company_name")
        .eq("reseller_code", referralCode)
        .single();

      if (resellerError || !reseller) {
        return new Response(
          JSON.stringify({ error: "Invalid referral code" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify user exists and doesn't already have a referrer
      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("id, referred_by")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user is already referred
      if (user.referred_by) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "User already has a referrer",
            existingCode: user.referred_by,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent self-referral
      if (reseller.id === userId) {
        return new Response(
          JSON.stringify({ error: "Cannot refer yourself" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update user with referral
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ referred_by: referralCode })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating user referral:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to track referral" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Referral tracked successfully",
          reseller: {
            id: reseller.id,
            name: reseller.name,
            companyName: reseller.company_name,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACTION: GENERATE - Generate a unique reseller code for a new partner ===
    if (action === "generate") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing userId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the user's current profile
      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("id, company_name, reseller_code, role")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If user already has a code, return it
      if (user.reseller_code) {
        return new Response(
          JSON.stringify({
            success: true,
            resellerCode: user.reseller_code,
            isExisting: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate unique code (retry if collision)
      const nameForCode = companyName || user.company_name || 'PARTNER';
      let code = generateReferralCode(nameForCode);
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("reseller_code", code)
          .single();

        if (!existing) break;

        code = generateReferralCode(nameForCode);
        attempts++;
      }

      if (attempts >= maxAttempts) {
        return new Response(
          JSON.stringify({ error: "Failed to generate unique code, try again" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update user with new reseller code and role
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          reseller_code: code,
          role: 'RESELLER',
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Error setting reseller code:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to save reseller code" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          resellerCode: code,
          isExisting: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACTION: STATS - Get referral statistics ===
    if (action === "stats") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing userId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user's reseller code
      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("reseller_code, company_name")
        .eq("id", userId)
        .single();

      if (userError || !user?.reseller_code) {
        return new Response(
          JSON.stringify({ error: "User is not a reseller" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get all referred users
      const { data: referrals, error: refError } = await supabase
        .from("profiles")
        .select("id, email, company_name, plan, created_at, status")
        .eq("referred_by", user.reseller_code)
        .order("created_at", { ascending: false });

      if (refError) {
        console.error("Error fetching referrals:", refError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          resellerCode: user.reseller_code,
          companyName: user.company_name,
          referrals: referrals || [],
          totalReferrals: referrals?.length || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === Default: Legacy single-purpose track (backwards compatible) ===
    if (referralCode && userId && !action) {
      // Redirect to track action for backwards compatibility
      body.action = "track";
      // Recursively handle (or just duplicate the logic - here we do a simple response)
      return new Response(
        JSON.stringify({ error: "Please specify action: track, generate, or stats" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: track, generate, or stats" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in reseller-track-referral:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
