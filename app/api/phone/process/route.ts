import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth';
import { generateChatResponse } from '@/lib/openai';
import twilio from 'twilio';

/**
 * POST /api/phone/process
 *
 * Process recorded message and generate AI response
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const callId = url.searchParams.get('callId');

    if (!callId) {
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Sorry, an error occurred.');
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const formData = await request.formData();
    const recordingUrl = formData.get('RecordingUrl') as string;
    const digits = formData.get('Digits') as string;

    const supabase = createServerSupabaseClient();

    // Get call and bot details
    const { data: call } = await supabase
      .from('phone_calls')
      .select('*, bot:bots(*)')
      .eq('id', callId)
      .single();

    if (!call || !call.bot) {
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Sorry, an error occurred.');
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Wait a moment for transcription (if not available yet)
    if (!call.transcription) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Fetch again
      const { data: updatedCall } = await supabase
        .from('phone_calls')
        .select('transcription')
        .eq('id', callId)
        .single();

      if (updatedCall?.transcription) {
        call.transcription = updatedCall.transcription;
      }
    }

    const userMessage = call.transcription || 'Hello';

    // Generate AI response
    const aiMessages = [
      {
        role: 'system' as const,
        content: call.bot.system_prompt + '\n\nYou are responding via phone call. Keep your response concise and conversational, suitable for text-to-speech.',
      },
      {
        role: 'user' as const,
        content: userMessage,
      },
    ];

    const aiResponse = await generateChatResponse(
      aiMessages,
      call.bot.model,
      call.bot.temperature
    );

    // Save AI response
    await supabase
      .from('phone_calls')
      .update({
        ai_response: aiResponse,
        status: 'completed',
      })
      .eq('id', callId);

    // Extract lead info from transcription
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const email = call.transcription?.match(emailRegex)?.[0];

    if (email) {
      await supabase.from('leads').insert({
        bot_id: call.bot_id,
        user_id: call.user_id,
        phone: call.from_number,
        email,
        source_url: 'phone',
        status: 'new',
        score: 70,
      });
    }

    // Generate TwiML response
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna' }, aiResponse);

    // Ask if they want to continue
    const gather = twiml.gather({
      input: ['speech'],
      timeout: 3,
      action: `${process.env.NEXT_PUBLIC_APP_URL}/api/phone/continue?callId=${callId}`,
    });
    gather.say({ voice: 'Polly.Joanna' }, 'Is there anything else I can help you with?');

    // If no response, end call
    twiml.say({ voice: 'Polly.Joanna' }, 'Thank you for calling. Goodbye!');
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Process call error:', error);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, an error occurred. Please try again later.');
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
