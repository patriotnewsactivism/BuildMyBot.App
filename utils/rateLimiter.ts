/**
 * Simple client-side rate limiter for API calls
 * Prevents excessive API usage and costs
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RequestRecord {
  timestamp: number;
  count: number;
}

class RateLimiter {
  private records: Map<string, RequestRecord[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }) {
    this.config = config;
  }

  /**
   * Check if a request is allowed under rate limits
   */
  public isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get or create record for this key
    let records = this.records.get(key) || [];

    // Filter out old records outside the window
    records = records.filter(record => record.timestamp > windowStart);

    // Count total requests in window
    const totalRequests = records.reduce((sum, record) => sum + record.count, 0);

    // Check if under limit
    if (totalRequests >= this.config.maxRequests) {
      this.records.set(key, records);
      return false;
    }

    // Add new record
    records.push({ timestamp: now, count: 1 });
    this.records.set(key, records);

    return true;
  }

  /**
   * Get remaining requests for a key
   */
  public getRemaining(key: string): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const records = (this.records.get(key) || [])
      .filter(record => record.timestamp > windowStart);

    const totalRequests = records.reduce((sum, record) => sum + record.count, 0);

    return Math.max(0, this.config.maxRequests - totalRequests);
  }

  /**
   * Get time until next available request
   */
  public getResetTime(key: string): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    const records = (this.records.get(key) || [])
      .filter(record => record.timestamp > windowStart);

    if (records.length === 0) {
      return 0;
    }

    const oldestRecord = records[0];
    const resetTime = oldestRecord.timestamp + this.config.windowMs;

    return Math.max(0, resetTime - now);
  }

  /**
   * Reset rate limit for a key
   */
  public reset(key: string): void {
    this.records.delete(key);
  }

  /**
   * Clear all rate limit records
   */
  public clearAll(): void {
    this.records.clear();
  }
}

// Create singleton instances for different rate limits

// AI chat requests: 20 per minute
export const aiChatLimiter = new RateLimiter({
  maxRequests: 20,
  windowMs: 60000 // 1 minute
});

// Marketing content generation: 10 per minute
export const marketingLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60000
});

// Website generation: 5 per minute
export const websiteLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 60000
});

// Bot creation/updates: 30 per minute
export const botOperationsLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60000
});

/**
 * Helper function to handle rate-limited async operations
 */
export async function rateLimitedRequest<T>(
  limiter: RateLimiter,
  key: string,
  operation: () => Promise<T>,
  onRateLimited?: (resetTime: number) => void
): Promise<T> {
  if (!limiter.isAllowed(key)) {
    const resetTime = limiter.getResetTime(key);
    const resetSeconds = Math.ceil(resetTime / 1000);

    if (onRateLimited) {
      onRateLimited(resetTime);
    }

    throw new Error(
      `Rate limit exceeded. Please wait ${resetSeconds} seconds before trying again.`
    );
  }

  return await operation();
}

export default RateLimiter;
