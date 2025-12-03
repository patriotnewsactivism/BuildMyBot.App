import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Health Check Endpoint
 *
 * Used by monitoring services to verify application health
 * Returns 200 if all systems operational, 503 if any critical service is down
 */
export async function GET(request: NextRequest) {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string; latency?: number }> = {};

  // Check 1: Database connectivity
  try {
    const dbStart = Date.now();
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('profiles').select('count').limit(1).single();

    if (error && error.code !== 'PGRST116') {
      checks.database = { status: 'error', message: error.message };
    } else {
      checks.database = { status: 'ok', latency: Date.now() - dbStart };
    }
  } catch (error: any) {
    checks.database = { status: 'error', message: error.message };
  }

  // Check 2: Environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
  ];

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    checks.environment = {
      status: 'error',
      message: `Missing: ${missingEnvVars.join(', ')}`
    };
  } else {
    checks.environment = { status: 'ok' };
  }

  // Check 3: Stripe configuration (optional)
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
    checks.stripe = { status: 'ok' };
  } else {
    checks.stripe = { status: 'error', message: 'Stripe not configured' };
  }

  // Determine overall status
  const hasErrors = Object.values(checks).some(check => check.status === 'error');
  const overallStatus = hasErrors ? 'unhealthy' : 'healthy';
  const statusCode = hasErrors ? 503 : 200;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
    },
    { status: statusCode }
  );
}
