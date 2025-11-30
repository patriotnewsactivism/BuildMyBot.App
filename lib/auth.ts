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
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData || !roles.includes(userData.role)) {
    throw new Error('Forbidden');
  }

  return user;
}

// Enforce subscription limits
export async function checkPlanLimits(userId: string, resource: string) {
  const supabase = createServerSupabaseClient();

  const { data: user } = await supabase
    .from('users')
    .select('plan')
    .eq('id', userId)
    .single();

  // Add plan limit checking logic here
  // Based on constants.ts PLANS

  return true;
}
