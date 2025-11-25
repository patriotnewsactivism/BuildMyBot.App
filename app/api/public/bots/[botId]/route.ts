import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth';

/**
 * GET /api/public/bots/[botId] - Get bot configuration (public endpoint)
 *
 * This endpoint is called by the embed widget to fetch bot settings.
 * No authentication required as it's accessed by website visitors.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: bot, error } = await supabase
      .from('bots')
      .select('id, name, type, theme_color, initial_greeting, initial_delay, active')
      .eq('id', params.botId)
      .eq('active', true)
      .is('deleted_at', null)
      .single();

    if (error || !bot) {
      return NextResponse.json(
        { error: 'Bot not found or inactive' },
        { status: 404 }
      );
    }

    // Return only public bot information (no system prompts or sensitive data)
    return NextResponse.json({ bot });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
