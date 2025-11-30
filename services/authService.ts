// Supabase Auth Service
import { supabase } from './supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';

export const authService = {
  // Sign up with email and password
  signUp: async (email: string, password: string, metadata?: { name?: string; companyName?: string }) => {
    if (!supabase) {
      throw new Error('Supabase not initialized');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) throw error;

    // Create user profile
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          name: metadata?.name || email.split('@')[0],
          company_name: metadata?.companyName,
          role: 'owner',
          plan: 'free',
          status: 'active',
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }

    return data;
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase not initialized');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  // Sign out
  signOut: async () => {
    if (!supabase) {
      throw new Error('Supabase not initialized');
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current user
  getCurrentUser: async () => {
    if (!supabase) {
      return null;
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }

    return user;
  },

  // Listen for auth state changes
  onAuthStateChange: (callback: (user: SupabaseUser | null) => void) => {
    if (!supabase) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  },

  // Reset password
  resetPassword: async (email: string) => {
    if (!supabase) {
      throw new Error('Supabase not initialized');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  // Update password
  updatePassword: async (newPassword: string) => {
    if (!supabase) {
      throw new Error('Supabase not initialized');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },
};
