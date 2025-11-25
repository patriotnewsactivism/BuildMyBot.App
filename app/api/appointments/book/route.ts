import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth';
import { createBooking } from '@/lib/calendar';

/**
 * POST /api/appointments/book
 *
 * Book an appointment (public endpoint for chat widget)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      botId,
      name,
      email,
      phone,
      notes,
      start,
      end,
      eventTypeId,
      conversationId,
    } = body;

    if (!botId || !name || !email || !start || !end) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get bot details
    const { data: bot } = await supabase
      .from('bots')
      .select('id, user_id, cal_com_event_type_id')
      .eq('id', botId)
      .single();

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    // Use bot's configured event type ID if not provided
    const finalEventTypeId = eventTypeId || bot.cal_com_event_type_id;

    if (!finalEventTypeId) {
      return NextResponse.json(
        { error: 'Appointment scheduling not configured for this bot' },
        { status: 400 }
      );
    }

    // Create booking in Cal.com
    let calComBooking;
    try {
      calComBooking = await createBooking({
        name,
        email,
        phone,
        notes,
        start,
        end,
        eventTypeId: finalEventTypeId,
      });
    } catch (error: any) {
      console.error('Cal.com booking error:', error);
      // Continue to save in database even if Cal.com fails
    }

    // Save appointment in database
    const { data: appointment, error: dbError } = await supabase
      .from('appointments')
      .insert({
        bot_id: botId,
        user_id: bot.user_id,
        conversation_id: conversationId,
        attendee_name: name,
        attendee_email: email,
        attendee_phone: phone,
        notes,
        start_time: start,
        end_time: end,
        status: calComBooking ? 'confirmed' : 'pending',
        cal_com_booking_id: calComBooking?.id,
        cal_com_data: calComBooking ? JSON.stringify(calComBooking) : null,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save appointment' },
        { status: 500 }
      );
    }

    // Create lead if email provided
    if (email) {
      await supabase.from('leads').insert({
        bot_id: botId,
        user_id: bot.user_id,
        conversation_id: conversationId,
        email,
        phone,
        source_url: 'appointment',
        status: 'new',
        score: 85, // High score for appointment bookers
      });
    }

    return NextResponse.json({
      appointment,
      message: 'Appointment booked successfully',
    }, { status: 201 });

  } catch (error: any) {
    console.error('Booking API error:', error);
    return NextResponse.json(
      { error: 'Failed to book appointment' },
      { status: 500 }
    );
  }
}
