// Rate limiting utility for Edge Functions
// Prevents abuse and DOS attacks

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetAt) {
      rateLimits.delete(key);
    }
  }
}, 60000); // Clean up every minute

export async function checkRateLimit(
  userId: string,
  endpoint: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  const limit = rateLimits.get(key);

  if (!limit || now > limit.resetAt) {
    const resetAt = now + windowMs;
    rateLimits.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (limit.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: limit.resetAt };
  }

  limit.count++;
  return { allowed: true, remaining: maxRequests - limit.count, resetAt: limit.resetAt };
}

// Plan-based rate limits
export const RATE_LIMITS: Record<string, { requestsPerMinute: number; aiCallsPerHour: number }> = {
  FREE: { requestsPerMinute: 10, aiCallsPerHour: 60 },
  STARTER: { requestsPerMinute: 30, aiCallsPerHour: 500 },
  PROFESSIONAL: { requestsPerMinute: 100, aiCallsPerHour: 3000 },
  EXECUTIVE: { requestsPerMinute: 300, aiCallsPerHour: 10000 },
  ENTERPRISE: { requestsPerMinute: 1000, aiCallsPerHour: 50000 },
};
