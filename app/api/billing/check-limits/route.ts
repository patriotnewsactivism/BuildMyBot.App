import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, requireAuth } from '@/lib/auth';

const PLAN_LIMITS: Record<string, { bots: number; conversations: number }> = {
  FREE: { bots: 1, conversations: 60 },
  STARTER: { bots: 1, conversations: 750 },
  PROFESSIONAL: { bots: 5, conversations: 5000 },
  EXECUTIVE: { bots: 10, conversations: 15000 },
  ENTERPRISE: { bots: 9999, conversations: 50000 },
};

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { resourceType } = await request.json();

    if (!resourceType || !['bot', 'conversation', 'knowledge_base'].includes(resourceType)) {
      return NextResponse.json(
        { error: 'Invalid resource type' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get user's plan
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const userPlan = profile.plan || 'FREE';
    const limits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.FREE;

    let allowed = true;
    let message = '';
    let currentUsage = 0;
    let limit = 0;

    if (resourceType === 'bot') {
      const { count } = await supabase
        .from('bots')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      currentUsage = count || 0;
      limit = limits.bots;
      allowed = currentUsage < limit;
      message = allowed
        ? `You can create more bots (${currentUsage}/${limit})`
        : `Bot limit reached (${currentUsage}/${limit}). Please upgrade your plan.`;
    } else if (resourceType === 'conversation') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      currentUsage = count || 0;
      limit = limits.conversations;
      allowed = currentUsage < limit;
      message = allowed
        ? `You can have more conversations this month (${currentUsage}/${limit})`
        : `Monthly conversation limit reached (${currentUsage}/${limit}). Please upgrade.`;
    } else if (resourceType === 'knowledge_base') {
      // Knowledge base has no strict limit for now
      allowed = true;
      message = 'Knowledge base upload allowed';
    }

    // Check billing account status
    const { data: billingAccount } = await supabase
      .from('billing_accounts')
      .select('status')
      .eq('owner_id', user.id)
      .single();

    const billingStatus = billingAccount?.status || 'active';
    if (billingStatus !== 'active' && billingStatus !== 'trialing') {
      allowed = false;
      message = 'Your billing account is not active. Please update your payment method.';
    }

    return NextResponse.json({
      allowed,
      message,
      currentUsage,
      limit,
      plan: userPlan,
      billingStatus,
    });
  } catch (error) {
    console.error('Limit check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Limit check failed' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
