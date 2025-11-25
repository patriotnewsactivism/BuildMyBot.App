import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/auth';

/**
 * GET /api/phone/calls
 *
 * Get call logs for a bot
 */
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  try {
    const url = new URL(request.url);
    const botId = url.searchParams.get('botId');

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Verify bot ownership
    const { data: bot } = await supabase
      .from('bots')
      .select('id')
      .eq('id', botId)
      .eq('user_id', user.id)
      .single();

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Get call logs
    const { data: calls, error } = await supabase
      .from('phone_calls')
      .select('*')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
    }

    return NextResponse.json({ calls: calls || [] });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
  }
}
