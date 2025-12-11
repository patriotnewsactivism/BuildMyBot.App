// Shared CORS and rate limiting utilities for Edge Functions
// SEC-006, SEC-007 FIXES

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// SEC-006 FIX: Restrict CORS to allowed origins
export const ALLOWED_ORIGINS = [
  "https://buildmybot.app",
  "https://app.buildmybot.app",
  "https://www.buildmybot.app",
  "http://localhost:8080",
  "http://localhost:3000",
  "http://127.0.0.1:8080",
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-embed-token",
    "Access-Control-Allow-Credentials": "true",
  };
}

// SEC-007 FIX: Rate limiting configuration by endpoint
export const RATE_LIMITS: Record<string, { requests: number; windowSeconds: number }> = {
  "ai-complete": { requests: 60, windowSeconds: 60 },
  "create-lead": { requests: 30, windowSeconds: 60 },
  "scrape-url": { requests: 10, windowSeconds: 60 },
  "embed-knowledge-base": { requests: 20, windowSeconds: 60 },
  "default": { requests: 100, windowSeconds: 60 },
};

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string | null,
  ipAddress: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
  const windowStart = new Date(Date.now() - limit.windowSeconds * 1000).toISOString();

  // Check by user ID if authenticated, otherwise by IP
  const query = userId
    ? supabase
        .from("api_rate_limits")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("endpoint", endpoint)
        .gte("created_at", windowStart)
    : supabase
        .from("api_rate_limits")
        .select("*", { count: "exact", head: true })
        .eq("ip_address", ipAddress)
        .eq("endpoint", endpoint)
        .gte("created_at", windowStart);

  const { count } = await query;
  const currentCount = count || 0;

  if (currentCount >= limit.requests) {
    return { allowed: false, remaining: 0 };
  }

  // Log this request for rate limiting
  await supabase.from("api_rate_limits").insert({
    user_id: userId,
    ip_address: ipAddress,
    endpoint,
  });

  return { allowed: true, remaining: limit.requests - currentCount - 1 };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": "0",
        "Retry-After": "60",
      },
    }
  );
}
