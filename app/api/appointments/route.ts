import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/auth';

/**
 * GET /api/appointments
 *
 * Get appointments for a bot (authenticated)
 */
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  try {
    const url = new URL(request.url);
    const botId = url.searchParams.get('botId');

    if (!botId) {
      return NextResponse.json(
        { error: 'Bot ID is required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    // Get appointments
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('bot_id', botId)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch appointments' },
        { status: 500 }
      );
    }

    return NextResponse.json({ appointments: appointments || [] });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/appointments
 *
 * Update appointment status
 */
export async function PATCH(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  try {
    const body = await request.json();
    const { appointmentId, status } = body;

    if (!appointmentId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Verify appointment ownership
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, user_id')
      .eq('id', appointmentId)
      .single();

    if (!appointment || appointment.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Update status
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update appointment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}
