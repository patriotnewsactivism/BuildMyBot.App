import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Create a Supabase client for server-side operations
 * Uses service role key for admin operations
 */
export function createServerSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Get the current authenticated user from the request
 * Returns user object or null if not authenticated
 */
export async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const supabase = createServerSupabaseClient();

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

/**
 * Middleware to protect API routes
 * Returns user object if authenticated, otherwise returns 401 response
 *
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const user = await requireAuth(request);
 *   if (user instanceof NextResponse) return user; // Auth failed
 *
 *   // User is authenticated, proceed...
 * }
 * ```
 */
export async function requireAuth(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in.' },
      { status: 401 }
    );
  }

  return user;
}

/**
 * Check if user has required role
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
) {
  const user = await getAuthUser(request);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in.' },
      { status: 401 }
    );
  }

  const supabase = createServerSupabaseClient();
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData || !allowedRoles.includes(userData.role)) {
    return NextResponse.json(
      { error: 'Forbidden. Insufficient permissions.' },
      { status: 403 }
    );
  }

  return user;
}

/**
 * Get user's subscription info
 */
export async function getUserSubscription(userId: string) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Check if user has access to a feature based on their plan
 */
export async function hasFeatureAccess(
  userId: string,
  feature: 'bots' | 'knowledge_base' | 'phone_agent' | 'white_label' | 'api_access'
): Promise<boolean> {
  const subscription = await getUserSubscription(userId);

  if (!subscription) {
    // Free tier - limited features
    return feature === 'bots'; // Only bot creation in free tier
  }

  const planLimits: Record<string, string[]> = {
    free: ['bots'],
    starter: ['bots', 'knowledge_base'],
    professional: ['bots', 'knowledge_base', 'phone_agent'],
    executive: ['bots', 'knowledge_base', 'phone_agent', 'white_label'],
    enterprise: ['bots', 'knowledge_base', 'phone_agent', 'white_label', 'api_access'],
  };

  const plan = subscription.plan_type.toLowerCase();
  return planLimits[plan]?.includes(feature) || false;
}

/**
 * Check if user is within their plan limits
 */
export async function checkPlanLimits(userId: string, resource: 'bots' | 'conversations' | 'knowledge_files') {
  const supabase = createServerSupabaseClient();
  const subscription = await getUserSubscription(userId);

  const planLimits: Record<string, Record<string, number>> = {
    free: { bots: 1, conversations: 50, knowledge_files: 0 },
    starter: { bots: 3, conversations: 500, knowledge_files: 5 },
    professional: { bots: 10, conversations: 2000, knowledge_files: 20 },
    executive: { bots: 50, conversations: 10000, knowledge_files: 100 },
    enterprise: { bots: -1, conversations: -1, knowledge_files: -1 }, // Unlimited
  };

  const plan = subscription?.plan_type.toLowerCase() || 'free';
  const limit = planLimits[plan][resource];

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1 };
  }

  // Count current usage
  let current = 0;
  if (resource === 'bots') {
    const { count } = await supabase
      .from('bots')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null);
    current = count || 0;
  } else if (resource === 'conversations') {
    const { count } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    current = count || 0;
  } else if (resource === 'knowledge_files') {
    const { count } = await supabase
      .from('knowledge_base_files')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    current = count || 0;
  }

  return {
    allowed: current < limit,
    current,
    limit,
  };
}
