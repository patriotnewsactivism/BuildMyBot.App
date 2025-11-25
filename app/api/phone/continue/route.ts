import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth';
import { generateChatResponse } from '@/lib/openai';
import twilio from 'twilio';

/**
 * POST /api/phone/continue
 *
 * Continue conversation after user responds
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const callId = url.searchParams.get('callId');

    const formData = await request.formData();
    const speechResult = formData.get('SpeechResult') as string;

    if (!callId || !speechResult) {
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Thank you for calling. Goodbye!');
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

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

    // Get conversation history
    const previousTranscription = call.transcription || '';
    const previousResponse = call.ai_response || '';

    // Generate AI response with conversation context
    const aiMessages = [
      {
        role: 'system' as const,
        content: call.bot.system_prompt + '\n\nYou are responding via phone call. Keep your response concise and conversational.',
      },
      {
        role: 'user' as const,
        content: previousTranscription,
      },
      {
        role: 'assistant' as const,
        content: previousResponse,
      },
      {
        role: 'user' as const,
        content: speechResult,
      },
    ];

    const aiResponse = await generateChatResponse(
      aiMessages,
      call.bot.model,
      call.bot.temperature
    );

    // Update call with new conversation turn
    const updatedTranscription = `${previousTranscription}\n\nUser: ${speechResult}`;
    const updatedResponse = `${previousResponse}\n\nAssistant: ${aiResponse}`;

    await supabase
      .from('phone_calls')
      .update({
        transcription: updatedTranscription,
        ai_response: updatedResponse,
      })
      .eq('id', callId);

    // Generate TwiML response
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna' }, aiResponse);

    // Ask if they want to continue again
    const gather = twiml.gather({
      input: ['speech'],
      timeout: 3,
      action: `${process.env.NEXT_PUBLIC_APP_URL}/api/phone/continue?callId=${callId}`,
    });
    gather.say({ voice: 'Polly.Joanna' }, 'Anything else?');

    // End call
    twiml.say({ voice: 'Polly.Joanna' }, 'Thank you for calling. Goodbye!');
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Continue call error:', error);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, an error occurred. Goodbye!');
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
