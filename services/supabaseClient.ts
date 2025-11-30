import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Support both Next.js and Vite environment variable patterns
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

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