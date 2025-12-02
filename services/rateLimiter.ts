/**
 * Rate Limiter Service
 * Prevents API abuse by limiting requests per user/session
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private records: Map<string, RequestRecord> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Too many requests. Please try again later.',
      ...config
    };

    // Cleanup old records every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if a request should be allowed
   * @param identifier - Unique identifier (user ID, session ID, or IP)
   * @returns {allowed: boolean, remaining: number, resetTime: number}
   */
  checkLimit(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    message?: string;
  } {
    const now = Date.now();
    let record = this.records.get(identifier);

    // If no record or window expired, create new record
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + this.config.windowMs
      };
      this.records.set(identifier, record);
    }

    // Check if limit exceeded
    if (record.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        message: this.config.message
      };
    }

    // Increment count and allow request
    record.count++;
    return {
      allowed: true,
      remaining: this.config.maxRequests - record.count,
      resetTime: record.resetTime
    };
  }

  /**
   * Reset limits for a specific identifier
   */
  reset(identifier: string): void {
    this.records.delete(identifier);
  }

  /**
   * Cleanup expired records
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now > record.resetTime) {
        this.records.delete(key);
      }
    }
  }

  /**
   * Get current stats for an identifier
   */
  getStats(identifier: string): {
    requests: number;
    remaining: number;
    resetTime: number;
  } | null {
    const record = this.records.get(identifier);
    if (!record || Date.now() > record.resetTime) {
      return null;
    }

    return {
      requests: record.count,
      remaining: this.config.maxRequests - record.count,
      resetTime: record.resetTime
    };
  }
}

// Pre-configured rate limiters for different operations
export const scraperRateLimiter = new RateLimiter({
  maxRequests: 10, // 10 scrapes per window
  windowMs: 60000, // 1 minute window
  message: 'Too many scraping requests. Please wait before trying again.'
});

export const pdfRateLimiter = new RateLimiter({
  maxRequests: 5, // 5 PDF uploads per window
  windowMs: 60000, // 1 minute window
  message: 'Too many PDF uploads. Please wait before uploading again.'
});

export const aiGenerationRateLimiter = new RateLimiter({
  maxRequests: 20, // 20 AI generations per window
  windowMs: 60000, // 1 minute window
  message: 'Too many AI requests. Please wait before generating more content.'
});

export const chatRateLimiter = new RateLimiter({
  maxRequests: 30, // 30 messages per window
  windowMs: 60000, // 1 minute window
  message: 'Too many messages. Please slow down.'
});

/**
 * Create a custom rate limiter
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

/**
 * Generate a session-based identifier
 * Uses browser fingerprinting for anonymous users
 */
export function getSessionIdentifier(userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // For anonymous users, use session storage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    let sessionId = sessionStorage.getItem('bmb_session_id');
    if (!sessionId) {
      sessionId = `session:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('bmb_session_id', sessionId);
    }
    return sessionId;
  }

  // Fallback to timestamp-based ID
  return `anon:${Date.now()}`;
}

export default RateLimiter;
