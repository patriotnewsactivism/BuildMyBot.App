import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/auth';

/**
 * GET /api/analytics/leads
 *
 * Returns lead analytics and list for the authenticated user
 */
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  try {
    const supabase = createServerSupabaseClient();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Get leads with bot information
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        *,
        bot:bots(name, type),
        conversation:conversations(message_count, sentiment_score)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Calculate stats
    const stats = {
      total: totalLeads || 0,
      hot: leads?.filter(l => l.score >= 75).length || 0,
      warm: leads?.filter(l => l.score >= 50 && l.score < 75).length || 0,
      cold: leads?.filter(l => l.score < 50).length || 0,
    };

    return NextResponse.json({
      leads: leads || [],
      stats,
      pagination: {
        page,
        limit,
        total: totalLeads || 0,
        totalPages: Math.ceil((totalLeads || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
