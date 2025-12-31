import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Next.js environment variables (NEXT_PUBLIC_ prefix required for client-side access)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
