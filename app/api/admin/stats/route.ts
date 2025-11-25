import { NextRequest, NextResponse } from 'next/server';
import { requireRole, createServerSupabaseClient } from '@/lib/auth';

/**
 * GET /api/admin/stats
 *
 * Get platform-wide statistics (admin only)
 */
export async function GET(request: NextRequest) {
  const user = await requireRole(request, ['admin']);
  if (user instanceof NextResponse) return user;

  try {
    const supabase = createServerSupabaseClient();

    // Get total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get total bots
    const { count: totalBots } = await supabase
      .from('bots')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Get total conversations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: totalConversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get total leads (last 30 days)
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get active subscriptions
    const { count: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get MRR (Monthly Recurring Revenue)
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('plan_type')
      .eq('status', 'active');

    const planPrices: Record<string, number> = {
      free: 0,
      starter: 29,
      professional: 99,
      executive: 199,
      enterprise: 499,
    };

    const mrr = (subscriptions || []).reduce((sum, sub) => {
      return sum + (planPrices[sub.plan_type.toLowerCase()] || 0);
    }, 0);

    return NextResponse.json({
      users: {
        total: totalUsers || 0,
        withSubscription: activeSubscriptions || 0,
      },
      bots: {
        total: totalBots || 0,
      },
      conversations: {
        last30Days: totalConversations || 0,
      },
      leads: {
        last30Days: totalLeads || 0,
      },
      revenue: {
        mrr,
        arr: mrr * 12,
      },
    });

  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
