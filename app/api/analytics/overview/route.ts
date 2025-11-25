import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/auth';

/**
 * GET /api/analytics/overview
 *
 * Returns overview analytics for the authenticated user's account
 */
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  try {
    const supabase = createServerSupabaseClient();
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total bots
    const { count: totalBots } = await supabase
      .from('bots')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null);

    // Get total conversations
    const { count: totalConversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString());

    // Get total leads
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString());

    // Get average response time (mock for now - would need message timestamps)
    const avgResponseTime = 1.2; // seconds

    // Get conversation trend (daily)
    const { data: dailyStats } = await supabase
      .from('conversations')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Group by day
    const trendData = groupByDay(dailyStats || [], days);

    // Get top performing bots
    const { data: botStats } = await supabase
      .from('bots')
      .select(`
        id,
        name,
        conversations:conversations(count)
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null);

    return NextResponse.json({
      overview: {
        totalBots: totalBots || 0,
        totalConversations: totalConversations || 0,
        totalLeads: totalLeads || 0,
        avgResponseTime,
        period: `${days} days`,
      },
      trend: trendData,
      topBots: botStats?.map(bot => ({
        id: bot.id,
        name: bot.name,
        conversations: bot.conversations?.length || 0,
      })).sort((a, b) => b.conversations - a.conversations).slice(0, 5) || [],
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

/**
 * Group data by day
 */
function groupByDay(data: any[], days: number) {
  const result: { date: string; conversations: number }[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const count = data.filter(item => {
      const itemDate = new Date(item.created_at).toISOString().split('T')[0];
      return itemDate === dateStr;
    }).length;

    result.push({
      date: dateStr,
      conversations: count,
    });
  }

  return result;
}
