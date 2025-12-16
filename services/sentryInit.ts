import * as Sentry from '@sentry/react';

// Support both Vite (import.meta.env) and Next.js/Node (process.env) environment variable patterns
const getEnvVar = (key: string) => {
  const metaEnv = typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    : undefined;

  if (metaEnv && key in metaEnv) {
    return metaEnv[key];
  }

  return (typeof process !== 'undefined' ? process.env[key] : undefined) ?? undefined;
};

const sentryDsn = getEnvVar('VITE_SENTRY_DSN') || getEnvVar('NEXT_PUBLIC_SENTRY_DSN');
const environment = getEnvVar('VITE_ENVIRONMENT') || getEnvVar('NEXT_PUBLIC_ENVIRONMENT') || 'development';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * This provides:
 * - Frontend error tracking (React Error Boundaries)
 * - Performance monitoring (Web Vitals)
 * - Session replay (optional)
 * - User feedback collection
 */
export function initSentry() {
  // Only initialize if DSN is configured
  if (!sentryDsn) {
    if (environment !== 'development') {
      console.warn('Sentry DSN not configured. Error tracking is disabled.');
    }
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production to a lower rate (e.g., 0.1 = 10%)
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Capture Replay for 10% of all sessions,
    // plus 100% of sessions with an error
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 0.5,
    replaysOnErrorSampleRate: 1.0,

    // Integrations
    integrations: [
      // React Router integration for better error context
      Sentry.browserTracingIntegration(),

      // Session replay for debugging
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),

      // Breadcrumbs for user actions
      Sentry.breadcrumbsIntegration({
        console: true,
        dom: true,
        fetch: true,
        history: true,
        sentry: true,
        xhr: true,
      }),
    ],

    // Before sending, filter out sensitive data
    beforeSend(event, hint) {
      // Filter out events from development
      if (environment === 'development') {
        console.log('Sentry event (dev mode):', event);
        return null; // Don't send in development
      }

      // Filter out noisy errors
      const ignoredErrors = [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        'Network request failed', // Too noisy, handled by monitoring
      ];

      const errorMessage = event.exception?.values?.[0]?.value || '';
      if (ignoredErrors.some(msg => errorMessage.includes(msg))) {
        return null;
      }

      return event;
    },

    // Track performance metrics
    beforeSendTransaction(event) {
      // Don't send transaction events in development
      if (environment === 'development') {
        return null;
      }
      return event;
    },
  });
}

/**
 * Set user context for Sentry tracking
 * Call this after successful authentication
 */
export function setSentryUser(user: { id: string; email?: string; name?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

/**
 * Clear user context (call on logout)
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Add custom context to Sentry events
 */
export function setSentryContext(context: string, data: Record<string, unknown>) {
  Sentry.setContext(context, data);
}

/**
 * Manually capture an exception
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value as Record<string, unknown>);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Manually capture a message
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category?: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    data,
    level: 'info',
  });
}
