// Shared CORS utility for all Edge Functions
// Centralizes allowed origins for easy management

export const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173", // Vite dev server
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://app.buildmybot.com", // Production domain
  "https://buildmybot.vercel.app", // Vercel preview deployments
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  // If origin is in allowed list, use it; otherwise default to first allowed origin
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400", // 24 hours
    "Access-Control-Allow-Credentials": "true",
  };
}

export function createCorsResponse(status: number = 200, body: any = { ok: true }): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(null),
      "Content-Type": "application/json",
    },
  });
}
