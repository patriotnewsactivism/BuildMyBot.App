import posthog from 'posthog-js';

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

const posthogApiKey = getEnvVar('VITE_POSTHOG_API_KEY') || getEnvVar('NEXT_PUBLIC_POSTHOG_API_KEY');
const posthogHost = getEnvVar('VITE_POSTHOG_HOST') || getEnvVar('NEXT_PUBLIC_POSTHOG_HOST') || 'https://app.posthog.com';
const environment = getEnvVar('VITE_ENVIRONMENT') || getEnvVar('NEXT_PUBLIC_ENVIRONMENT') || 'development';

/**
 * Initialize PostHog for product analytics
 * This provides:
 * - User behavior tracking (page views, clicks, events)
 * - Feature flag management
 * - Session recordings (optional)
 * - Funnel analysis
 * - Retention tracking
 */
export function initPostHog() {
  // Only initialize if API key is configured
  if (!posthogApiKey) {
    if (environment !== 'development') {
      console.warn('PostHog API key not configured. Product analytics is disabled.');
    }
    return;
  }

  // Only run in browser environment
  if (typeof window === 'undefined') {
    return;
  }

  posthog.init(posthogApiKey, {
    api_host: posthogHost,

    // Enable session recording for debugging user flows
    autocapture: true, // Automatically capture clicks and pageviews
    capture_pageview: true, // Track page views
    capture_pageleave: true, // Track when users leave

    // Session recording configuration
    session_recording: {
      maskAllInputs: true, // Mask all input fields for privacy
      maskTextSelector: '[data-ph-mask]', // Custom masking selector
    },

    // Disable in development to avoid noise
    loaded: (posthog) => {
      if (environment === 'development') {
        posthog.opt_out_capturing(); // Don't send events in development
        console.log('PostHog initialized (dev mode - not capturing)');
      } else {
        console.log('PostHog initialized successfully');
      }
    },

    // Privacy settings
    persistence: 'localStorage', // Store user data in localStorage
    respect_dnt: true, // Respect Do Not Track browser setting
  });
}

/**
 * Track a custom event
 * @param eventName - The name of the event (e.g., 'bot_created', 'message_sent')
 * @param properties - Additional properties to track
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  posthog.capture(eventName, {
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Identify a user (call after login)
 * @param userId - Unique user identifier
 * @param properties - User properties (email, name, plan, etc.)
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  posthog.identify(userId, properties);
}

/**
 * Reset user identity (call on logout)
 */
export function resetUser() {
  if (typeof window === 'undefined') return;

  posthog.reset();
}

/**
 * Track a page view
 * @param pageName - Optional page name (auto-detected if not provided)
 */
export function trackPageView(pageName?: string) {
  if (typeof window === 'undefined') return;

  posthog.capture('$pageview', pageName ? { pageName } : undefined);
}

/**
 * Set user properties (without identifying)
 * Useful for updating user attributes after identification
 */
export function setUserProperties(properties: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  posthog.setPersonProperties(properties);
}

/**
 * Check if a feature flag is enabled
 * @param flagKey - The feature flag key
 * @returns boolean indicating if the flag is enabled
 */
export function isFeatureFlagEnabled(flagKey: string): boolean {
  if (typeof window === 'undefined') return false;

  return posthog.isFeatureEnabled(flagKey) || false;
}

/**
 * Get the variant of a multivariate feature flag
 * @param flagKey - The feature flag key
 * @returns The variant string or undefined
 */
export function getFeatureFlagVariant(flagKey: string): string | undefined {
  if (typeof window === 'undefined') return undefined;

  return posthog.getFeatureFlag(flagKey) as string | undefined;
}

/**
 * Manually start session recording
 */
export function startSessionRecording() {
  if (typeof window === 'undefined') return;

  posthog.startSessionRecording();
}

/**
 * Manually stop session recording
 */
export function stopSessionRecording() {
  if (typeof window === 'undefined') return;

  posthog.stopSessionRecording();
}

// Export the posthog instance for advanced usage
export { posthog };
