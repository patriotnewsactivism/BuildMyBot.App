import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth';

/**
 * Auth callback handler for OAuth and email confirmation
 * Handles redirects from Supabase authentication
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  // Handle authentication error
  if (error) {
    console.error('Auth callback error:', error, error_description);
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?error=${encodeURIComponent(error_description || error)}`
    );
  }

  // Exchange code for session
  if (code) {
    const supabase = createServerSupabaseClient();

    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        throw exchangeError;
      }

      // Successful authentication - redirect to dashboard
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`);

    } catch (err: any) {
      console.error('Session exchange error:', err);
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/error?error=${encodeURIComponent(err.message)}`
      );
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/auth/login`);
}
