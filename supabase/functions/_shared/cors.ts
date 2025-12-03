// Shared CORS utility for Edge Functions
// Validates origins against allowlist to prevent cross-site attacks

export function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigins = [
    Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000',
    'https://buildmybot.app',
    'https://www.buildmybot.app',
    // Allow staging/preview environments
    ...(Deno.env.get('VERCEL_URL') ? [`https://${Deno.env.get('VERCEL_URL')}`] : []),
  ];

  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    origin.endsWith('.buildmybot.app') ||
    origin.endsWith('.vercel.app')  // Allow Vercel preview deployments
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}
