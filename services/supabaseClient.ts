import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Support both Next.js and Vite environment variable patterns, with runtime validation
type EnvShape = Record<string, string | undefined>;

const runtimeEnv: EnvShape | undefined =
  typeof import.meta !== 'undefined'
    ? (import.meta as unknown as { env?: EnvShape }).env
    : undefined;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  runtimeEnv?.NEXT_PUBLIC_SUPABASE_URL ||
  runtimeEnv?.VITE_SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  runtimeEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  runtimeEnv?.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;
let hasValidConfig = false;

if (supabaseUrl && supabaseAnonKey) {
  try {
    const parsed = new URL(supabaseUrl);
    const host = parsed.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const isSupabaseManaged = host.endsWith('supabase.co') || host.endsWith('supabase.net');

    if (!isLocal && !isSupabaseManaged) {
      console.error(
        'Supabase URL does not appear to be a valid Supabase endpoint. Please double-check your NEXT_PUBLIC_SUPABASE_URL / VITE_SUPABASE_URL value.'
      );
    } else {
      hasValidConfig = true;
    }
  } catch (error) {
    console.error('Supabase URL is not a valid URL. Please update your environment configuration.', error);
  }
}

if (hasValidConfig) {
  try {
    supabaseInstance = createClient(supabaseUrl as string, supabaseAnonKey as string);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
} else {
  if (typeof window !== 'undefined') {
    console.warn(
      'Supabase environment variables are missing or invalid. Features requiring Supabase will be disabled until configuration is corrected.'
    );
  }
}

export const supabase = supabaseInstance;
