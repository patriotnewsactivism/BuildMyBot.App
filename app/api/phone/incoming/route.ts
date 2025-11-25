import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth';
import twilio from 'twilio';

/**
 * POST /api/phone/incoming
 *
 * Twilio webhook for incoming calls
 * Returns TwiML to handle the call
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;

    // Find bot associated with this phone number
    const supabase = createServerSupabaseClient();
    const { data: bot } = await supabase
      .from('bots')
      .select('*, user_id')
      .eq('phone_number', to)
      .eq('active', true)
      .single();

    if (!bot) {
      // No bot found for this number
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Sorry, this number is not configured.');
      twiml.hangup();

      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Create call record
    const { data: call } = await supabase
      .from('phone_calls')
      .insert({
        bot_id: bot.id,
        user_id: bot.user_id,
        call_sid: callSid,
        from_number: from,
        to_number: to,
        direction: 'inbound',
        status: 'in-progress',
      })
      .select()
      .single();

    // Generate TwiML response
    const twiml = new twilio.twiml.VoiceResponse();

    // Play greeting if configured
    if (bot.phone_greeting) {
      twiml.say({ voice: 'Polly.Joanna' }, bot.phone_greeting);
    } else {
      twiml.say({ voice: 'Polly.Joanna' }, 'Hello! How can I help you today?');
    }

    // Start recording
    twiml.record({
      maxLength: 120,
      transcribe: true,
      transcribeCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/phone/transcribe?callId=${call?.id}`,
      action: `${process.env.NEXT_PUBLIC_APP_URL}/api/phone/process?callId=${call?.id}`,
    });

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Incoming call error:', error);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, an error occurred. Please try again later.');
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
