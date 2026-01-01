// Rate Limiting Utility for Edge Functions
// Prevents abuse and controls costs per plan tier

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitConfig {
  requests: number;  // Max requests per window
  window: number;    // Time window in seconds (default: 3600 = 1 hour)
}

// Plan-based rate limits
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  FREE: { requests: 10, window: 3600 },          // 10 requests/hour
  STARTER: { requests: 100, window: 3600 },      // 100 requests/hour
  PROFESSIONAL: { requests: 1000, window: 3600 }, // 1000 requests/hour
  EXECUTIVE: { requests: 5000, window: 3600 },   // 5000 requests/hour
  ENTERPRISE: { requests: 99999, window: 3600 }, // Unlimited
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number; // Unix timestamp when limit resets
  error?: string;
}

/**
 * Check rate limit for a user based on their plan
 * @param userId User ID to check
 * @param endpoint Endpoint being accessed (for granular tracking)
 * @param supabaseUrl Supabase project URL
 * @param supabaseKey Supabase service role key
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<RateLimitResult> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's plan
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      // Default to FREE plan if user not found
      return {
        allowed: true,
        remaining: RATE_LIMITS.FREE.requests,
        reset: Date.now() + RATE_LIMITS.FREE.window * 1000,
      };
    }

    const plan = profile.plan || "FREE";
    const limit = RATE_LIMITS[plan] || RATE_LIMITS.FREE;

    // Check usage in current window
    const windowStart = new Date(Date.now() - limit.window * 1000);

    const { count, error: countError } = await supabase
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "api_call")
      .gte("created_at", windowStart.toISOString())
      .eq("metadata->>endpoint", endpoint);

    if (countError) {
      console.error("Rate limit check error:", countError);
      // Allow on error (fail open)
      return {
        allowed: true,
        remaining: limit.requests,
        reset: Date.now() + limit.window * 1000,
      };
    }

    const used = count || 0;
    const remaining = Math.max(0, limit.requests - used);
    const allowed = used < limit.requests;

    return {
      allowed,
      remaining,
      reset: Date.now() + limit.window * 1000,
      error: allowed ? undefined : `Rate limit exceeded. You have ${remaining} requests remaining. Limit resets in ${Math.ceil(limit.window / 60)} minutes.`,
    };
  } catch (error) {
    console.error("Rate limit error:", error);
    // Fail open on error
    return {
      allowed: true,
      remaining: 10,
      reset: Date.now() + 3600000,
    };
  }
}

/**
 * Log usage event for billing and rate limiting
 * @param userId User ID
 * @param endpoint Endpoint accessed
 * @param quantity Usage quantity (e.g., tokens used)
 * @param supabaseUrl Supabase project URL
 * @param supabaseKey Supabase service role key
 */
export async function logUsage(
  userId: string,
  endpoint: string,
  quantity: number = 1,
  supabaseUrl: string,
  supabaseKey: string
): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("usage_events").insert({
      user_id: userId,
      event_type: "api_call",
      quantity: quantity,
      metadata: {
        endpoint,
        timestamp: new Date().toISOString(),
      },
      synced_to_stripe: false,
    });
  } catch (error) {
    console.error("Usage logging error:", error);
    // Don't fail the request if logging fails
  }
}
