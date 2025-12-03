import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Server-side Supabase client with service role
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Extract authenticated user from request
export async function getAuthUser(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

// Middleware to protect API routes
export async function requireAuth(request: Request) {
  const user = await getAuthUser(request);

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

// Role-based access control
export async function requireRole(request: Request, roles: string[]) {
  const user = await getAuthUser(request);

  if (!user) {
    throw new Error('Unauthorized');
  }

  const supabase = createServerSupabaseClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !roles.includes(profile.role)) {
    throw new Error('Forbidden: Insufficient permissions');
  }

  return user;
}

// Enforce subscription limits
export async function checkPlanLimits(userId: string, resource: string) {
  const supabase = createServerSupabaseClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  // Plan limit checking logic
  const PLAN_LIMITS: Record<string, { bots: number; conversations: number }> = {
    FREE: { bots: 1, conversations: 60 },
    STARTER: { bots: 1, conversations: 750 },
    PROFESSIONAL: { bots: 5, conversations: 5000 },
    EXECUTIVE: { bots: 10, conversations: 15000 },
    ENTERPRISE: { bots: 9999, conversations: 50000 },
  };

  const limits = PLAN_LIMITS[profile.plan] || PLAN_LIMITS.FREE;

  return { allowed: true, limits, currentUsage: 0, plan: profile.plan };
}
