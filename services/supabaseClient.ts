import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Support both Vite (import.meta.env) and Next.js/Node (process.env) environment variable patterns
const getEnvVar = (key: string) => {
  // Vite exposes variables on import.meta.env at build time
  const metaEnv = typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    : undefined;

  if (metaEnv && key in metaEnv) {
    return metaEnv[key];
  }

  // Fallback for server-side contexts
  return (typeof process !== 'undefined' ? process.env[key] : undefined) ?? undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
} else {
  // Warn instead of crashing during build
  if (typeof window !== 'undefined') {
    console.warn('Supabase environment variables are missing. Features requiring Supabase will be disabled.');
  }
}

export const supabase = supabaseInstance;
