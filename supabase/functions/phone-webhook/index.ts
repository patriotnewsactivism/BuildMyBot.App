// Edge Function: phone-webhook
// Purpose: Handle incoming Twilio phone calls and voice responses

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TwilioWebhookRequest {
  CallSid: string
  From: string
  To: string
  CallStatus: string
  Direction: string
  SpeechResult?: string
  Digits?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse Twilio webhook data (form-urlencoded)
    const formData = await req.formData()
    const webhookData: any = {}

    for (const [key, value] of formData.entries()) {
      webhookData[key] = value
    }

    console.log('Twilio webhook received:', webhookData)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for webhooks
    )

    const {
      CallSid,
      From,
      To,
      CallStatus,
      Direction,
      SpeechResult,
      Digits,
    } = webhookData

    // Find bot associated with this phone number
    const { data: bot } = await supabaseClient
      .from('bots')
      .select('*, owner_id')
      .eq('metadata->phone_number', To)
      .single()

    if (!bot) {
      // Return generic TwiML response
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. This number is not configured yet.</Say>
</Response>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        }
      )
    }

    // Log the phone call
    const { data: phoneCall, error: callError } = await supabaseClient
      .from('phone_calls')
      .upsert({
        call_sid: CallSid,
        owner_id: bot.owner_id,
        bot_id: bot.id,
        from_number: From,
        to_number: To,
        direction: Direction.toLowerCase(),
        status: CallStatus.toLowerCase(),
        metadata: {
          speech_result: SpeechResult,
          digits: Digits,
        },
      }, {
        onConflict: 'call_sid'
      })
      .select()
      .single()

    if (callError) {
      console.error('Error logging call:', callError)
    }

    // Generate AI response if speech was detected
    let aiResponse = bot.system_prompt || 'Hello! How can I help you today?'

    if (SpeechResult) {
      // Call OpenAI for dynamic response
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        },
        body: JSON.stringify({
          model: bot.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: bot.system_prompt },
            { role: 'user', content: SpeechResult },
          ],
          temperature: 0.7,
          max_tokens: 200, // Keep responses concise for voice
        }),
      })

      const aiData = await openaiResponse.json()
      aiResponse = aiData.choices[0]?.message?.content || aiResponse

      // Save transcript
      await supabaseClient
        .from('phone_calls')
        .update({
          transcript: `User: ${SpeechResult}\nBot: ${aiResponse}`,
          updated_at: new Date().toISOString(),
        })
        .eq('call_sid', CallSid)
    }

    // Return TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(aiResponse)}</Say>
  <Gather input="speech" timeout="3" action="${Deno.env.get('SUPABASE_URL')}/functions/v1/phone-webhook" method="POST">
    <Say voice="alice">Please speak your question or press any key when finished.</Say>
  </Gather>
  <Say voice="alice">Thank you for calling. Goodbye!</Say>
</Response>`

    return new Response(twiml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    })

  } catch (error) {
    console.error('Phone webhook error:', error)

    // Return error TwiML
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We're sorry, but we're experiencing technical difficulties. Please try again later.</Say>
</Response>`,
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      }
    )
  }
})

// Helper to escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
