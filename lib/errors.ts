// Centralized error handling utilities

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        ...(this.metadata && { metadata: this.metadata }),
      },
    };
  }
}

/**
 * Authentication errors (401)
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_REQUIRED', 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization errors (403)
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, { field });
    this.name = 'ValidationError';
  }
}

/**
 * Resource not found errors (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, { resource, identifier });
    this.name = 'NotFoundError';
  }
}

/**
 * Plan limit exceeded errors (402)
 */
export class PlanLimitError extends AppError {
  constructor(message: string, currentUsage: number, limit: number) {
    super(message, 'PLAN_LIMIT_EXCEEDED', 402, { currentUsage, limit });
    this.name = 'PlanLimitError';
  }
}

/**
 * Rate limit errors (429)
 */
export class RateLimitError extends AppError {
  constructor(resetAt: Date) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, {
      resetAt: resetAt.toISOString(),
    });
    this.name = 'RateLimitError';
  }
}

/**
 * Conflict errors (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, conflictingField?: string) {
    super(message, 'CONFLICT', 409, { field: conflictingField });
    this.name = 'ConflictError';
  }
}

/**
 * External service errors (502)
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(
      `External service '${service}' is unavailable`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      { service, originalMessage: originalError?.message }
    );
    this.name = 'ExternalServiceError';
  }
}

/**
 * Error handler for API routes
 *
 * @example
 * try {
 *   // ... route logic
 * } catch (error) {
 *   return handleApiError(error);
 * }
 */
export function handleApiError(error: unknown): Response {
  // Log error for monitoring
  console.error('API Error:', error);

  // Handle known error types
  if (error instanceof AppError) {
    return new Response(JSON.stringify(error.toJSON()), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as any;

    // Common Supabase error codes
    switch (supabaseError.code) {
      case '23505': // Unique constraint violation
        return new Response(
          JSON.stringify({
            error: {
              message: 'A record with this value already exists',
              code: 'DUPLICATE_ENTRY',
            },
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );

      case 'PGRST116': // No rows returned
        return new Response(
          JSON.stringify({
            error: { message: 'Resource not found', code: 'NOT_FOUND' },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );

      case '23503': // Foreign key violation
        return new Response(
          JSON.stringify({
            error: {
              message: 'Referenced resource does not exist',
              code: 'INVALID_REFERENCE',
            },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
  }

  // Handle unknown errors
  return new Response(
    JSON.stringify({
      error: {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR',
      },
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Sanitizes error messages for client display
 * Removes sensitive information like file paths, IPs, etc.
 */
export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_REDACTED]') // Remove IP addresses
    .replace(/\/[a-zA-Z0-9_\-\/]+\.(ts|js|sql)/g, '[FILE_REDACTED]') // Remove file paths
    .replace(/key[_\s]*[:=][_\s]*["']?[a-zA-Z0-9]+["']?/gi, 'key=[KEY_REDACTED]') // Remove keys
    .replace(/password[_\s]*[:=][_\s]*["']?[a-zA-Z0-9]+["']?/gi, 'password=[REDACTED]'); // Remove passwords
}

/**
 * Logs error to monitoring service (e.g., Sentry)
 */
export async function logError(
  error: Error | AppError,
  context?: {
    userId?: string;
    endpoint?: string;
    metadata?: Record<string, any>;
  }
) {
  // TODO: Integrate with Sentry or other monitoring service
  console.error('Error logged:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString(),
  });

  // If Sentry is configured, send error
  // Sentry.captureException(error, { contexts: { custom: context } });
}
