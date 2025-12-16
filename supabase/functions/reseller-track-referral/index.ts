// reseller-track-referral Edge Function
// Tracks referral codes and associates new users with resellers

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  referralCode: string;
  userId: string;
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
    const { referralCode, userId } = body;

    if (!referralCode || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: referralCode, userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find reseller with this code
    const { data: reseller, error: resellerError } = await supabase
      .from("profiles")
      .select("id, name, email, reseller_code, reseller_client_count")
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

    // Create referral record
    const { error: referralError } = await supabase
      .from("referrals")
      .insert({
        reseller_id: reseller.id,
        referred_user_id: userId,
        code: referralCode,
        status: "active",
      });

    if (referralError) {
      console.error("Error creating referral record:", referralError);
      // Continue anyway - the profile was already updated
    }

    // Increment reseller client count
    await supabase
      .from("profiles")
      .update({
        reseller_client_count: (reseller.reseller_client_count || 0) + 1,
      })
      .eq("id", reseller.id);

    return new Response(
      JSON.stringify({
        message: "Referral tracked successfully",
        reseller: {
          id: reseller.id,
          name: reseller.name,
        },
        userId,
        referralCode,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in reseller-track-referral:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
