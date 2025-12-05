// Edge Function: twilio-webhook
// Handles Twilio webhook events for phone calls

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { createChatCompletion, ChatMessage } from '../_shared/openai.ts';

interface TwilioCallEvent {
  CallSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  CallerName?: string;
  RecordingUrl?: string;
  RecordingDuration?: string;
  TranscriptionText?: string;
  SpeechResult?: string; // From <Gather> with speech recognition
  Digits?: string; // From <Gather> with DTMF
}

// Generate TwiML response
function twiml(content: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${content}</Response>`,
    {
      headers: {
        'Content-Type': 'application/xml',
      },
    }
  );
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Parse form data from Twilio
    const formData = await req.formData();
    const event: TwilioCallEvent = {
      CallSid: formData.get('CallSid') as string,
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      CallStatus: formData.get('CallStatus') as string,
      Direction: formData.get('Direction') as string,
      CallerName: formData.get('CallerName') as string || undefined,
      RecordingUrl: formData.get('RecordingUrl') as string || undefined,
      RecordingDuration: formData.get('RecordingDuration') as string || undefined,
      TranscriptionText: formData.get('TranscriptionText') as string || undefined,
      SpeechResult: formData.get('SpeechResult') as string || undefined,
      Digits: formData.get('Digits') as string || undefined,
    };

    const supabase = createSupabaseClient();

    // Get the action from URL path
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'incoming';
    const botId = url.searchParams.get('bot_id');

    console.log(`Twilio webhook: action=${action}, status=${event.CallStatus}, bot=${botId}`);

    switch (action) {
      case 'incoming': {
        // New incoming call - find bot by phone number
        if (!botId) {
          // Find bot associated with this phone number
          const { data: bot } = await supabase
            .from('bots')
            .select('id, owner_id, name, system_prompt, metadata')
            .eq('metadata->phone_number', event.To)
            .single();

          if (!bot) {
            return twiml(`
              <Say>Sorry, this number is not configured. Goodbye.</Say>
              <Hangup/>
            `);
          }

          // Get phone config from owner
          const { data: profile } = await supabase
            .from('profiles')
            .select('phone_config')
            .eq('id', bot.owner_id)
            .single();

          const phoneConfig = profile?.phone_config as {
            intro_message?: string;
            voice_id?: string;
          } | null;

          const introMessage = phoneConfig?.intro_message ||
            `Hello, you've reached ${bot.name}. How can I help you today?`;
          const voiceId = phoneConfig?.voice_id || 'Polly.Joanna';

          // Create phone call record
          await supabase.from('phone_calls').insert({
            owner_id: bot.owner_id,
            bot_id: bot.id,
            twilio_call_sid: event.CallSid,
            from_number: event.From,
            to_number: event.To,
            direction: event.Direction.toLowerCase(),
            status: 'completed',
            started_at: new Date().toISOString(),
            transcript_segments: [],
          });

          // Return TwiML to greet and gather speech
          return twiml(`
            <Say voice="${voiceId}">${introMessage}</Say>
            <Gather input="speech" timeout="5" speechTimeout="auto" action="/functions/v1/twilio-webhook?action=respond&amp;bot_id=${bot.id}">
              <Say voice="${voiceId}">Please speak after the tone.</Say>
            </Gather>
            <Say voice="${voiceId}">I didn't hear anything. Goodbye.</Say>
            <Hangup/>
          `);
        }
        break;
      }

      case 'respond': {
        // Process speech input and generate AI response
        if (!botId || !event.SpeechResult) {
          return twiml(`
            <Say>I didn't understand that. Goodbye.</Say>
            <Hangup/>
          `);
        }

        // Get bot configuration
        const { data: bot } = await supabase
          .from('bots')
          .select('id, owner_id, name, system_prompt, model, temperature')
          .eq('id', botId)
          .single();

        if (!bot) {
          return twiml(`
            <Say>System error. Goodbye.</Say>
            <Hangup/>
          `);
        }

        // Get existing transcript
        const { data: call } = await supabase
          .from('phone_calls')
          .select('id, transcript_segments')
          .eq('twilio_call_sid', event.CallSid)
          .single();

        const segments = (call?.transcript_segments as Array<{ role: string; text: string; timestamp: number }>) || [];

        // Add user's speech to transcript
        segments.push({
          role: 'user',
          text: event.SpeechResult,
          timestamp: Date.now(),
        });

        // Generate AI response
        const messages: ChatMessage[] = [
          {
            role: 'system',
            content: `${bot.system_prompt}\n\nYou are speaking on a phone call. Keep responses concise and conversational. Avoid using markdown, bullet points, or any formatting that doesn't work in speech.`,
          },
          ...segments.map(s => ({
            role: (s.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: s.text,
          })),
        ];

        const completion = await createChatCompletion(messages, {
          model: bot.model,
          temperature: parseFloat(String(bot.temperature)) || 0.7,
          max_tokens: 150, // Keep responses short for phone
        });

        // Add AI response to transcript
        segments.push({
          role: 'assistant',
          text: completion.content,
          timestamp: Date.now(),
        });

        // Update call record
        await supabase
          .from('phone_calls')
          .update({
            transcript_segments: segments,
            transcript: segments.map(s => `${s.role}: ${s.text}`).join('\n'),
          })
          .eq('twilio_call_sid', event.CallSid);

        // Log usage
        await supabase.from('usage_events').insert({
          owner_id: bot.owner_id,
          bot_id: bot.id,
          event_type: 'phone_ai_completion',
          tokens_used: completion.tokens.total,
          metadata: {
            call_sid: event.CallSid,
          },
        });

        // Get voice config
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone_config')
          .eq('id', bot.owner_id)
          .single();

        const voiceId = (profile?.phone_config as { voice_id?: string })?.voice_id || 'Polly.Joanna';

        // Return TwiML with AI response and continue gathering
        return twiml(`
          <Say voice="${voiceId}">${completion.content}</Say>
          <Gather input="speech" timeout="5" speechTimeout="auto" action="/functions/v1/twilio-webhook?action=respond&amp;bot_id=${botId}">
          </Gather>
          <Say voice="${voiceId}">Are you still there?</Say>
          <Gather input="speech" timeout="3" speechTimeout="auto" action="/functions/v1/twilio-webhook?action=respond&amp;bot_id=${botId}">
          </Gather>
          <Say voice="${voiceId}">Goodbye.</Say>
          <Hangup/>
        `);
      }

      case 'status': {
        // Call status callback
        if (event.CallStatus === 'completed') {
          const duration = parseInt(event.RecordingDuration || '0', 10);

          await supabase
            .from('phone_calls')
            .update({
              status: 'completed',
              duration_seconds: duration,
              recording_url: event.RecordingUrl || null,
              ended_at: new Date().toISOString(),
            })
            .eq('twilio_call_sid', event.CallSid);

          // Analyze sentiment from transcript
          const { data: call } = await supabase
            .from('phone_calls')
            .select('transcript, owner_id, bot_id')
            .eq('twilio_call_sid', event.CallSid)
            .single();

          if (call?.transcript) {
            try {
              const sentimentResult = await createChatCompletion([
                {
                  role: 'system',
                  content: 'Analyze the sentiment of this conversation transcript. Respond with exactly one word: Positive, Neutral, or Negative.',
                },
                { role: 'user', content: call.transcript },
              ], { max_tokens: 10 });

              const sentiment = sentimentResult.content.trim() as 'Positive' | 'Neutral' | 'Negative';
              if (['Positive', 'Neutral', 'Negative'].includes(sentiment)) {
                await supabase
                  .from('phone_calls')
                  .update({ sentiment })
                  .eq('twilio_call_sid', event.CallSid);
              }
            } catch (e) {
              console.error('Sentiment analysis failed:', e);
            }
          }
        } else if (['busy', 'failed', 'no-answer'].includes(event.CallStatus)) {
          await supabase
            .from('phone_calls')
            .update({
              status: event.CallStatus === 'no-answer' ? 'missed' : 'failed',
              ended_at: new Date().toISOString(),
            })
            .eq('twilio_call_sid', event.CallSid);
        }

        return new Response('OK', { status: 200 });
      }

      case 'transcription': {
        // Transcription callback from recording
        if (event.TranscriptionText) {
          await supabase
            .from('phone_calls')
            .update({ transcript: event.TranscriptionText })
            .eq('twilio_call_sid', event.CallSid);
        }

        return new Response('OK', { status: 200 });
      }

      default:
        return new Response('Unknown action', { status: 400 });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('twilio-webhook error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
