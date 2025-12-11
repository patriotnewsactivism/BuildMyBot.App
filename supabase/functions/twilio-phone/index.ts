// twilio-phone Edge Function
// Handles Twilio voice calls with AI-powered responses
// Production-ready implementation for BuildMyBot Phone Agent

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://buildmybot.app",
  "https://app.buildmybot.app",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// TwiML response builder
function twiml(content: string): Response {
  return new Response(content, {
    headers: { "Content-Type": "application/xml" },
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse URL for routing
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // Get form data for Twilio callbacks
    const contentType = req.headers.get("Content-Type") || "";
    let formData: Record<string, string> = {};

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      formData = Object.fromEntries(new URLSearchParams(text));
    } else if (contentType.includes("application/json")) {
      formData = await req.json();
    }

    switch (path) {
      case "incoming": {
        // Handle incoming call - initial greeting
        const { To, From, CallSid } = formData;

        // Find user by phone number
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, phone_config, name")
          .contains("phone_config", { phoneNumber: To })
          .single();

        if (!profile) {
          return twiml(`
            <?xml version="1.0" encoding="UTF-8"?>
            <Response>
              <Say voice="Polly.Joanna">We're sorry, this number is not configured. Please try again later.</Say>
              <Hangup/>
            </Response>
          `);
        }

        const phoneConfig = profile.phone_config as Record<string, unknown>;
        const introMessage = phoneConfig?.introMessage as string || "Hi! How can I help you today?";
        const voiceId = phoneConfig?.voiceId as string || "Polly.Joanna";

        // Log the call
        await supabase.from("phone_calls").insert({
          user_id: profile.id,
          twilio_call_sid: CallSid,
          from_number: From,
          to_number: To,
          status: "initiated",
        });

        // Initial greeting and gather speech input
        return twiml(`
          <?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="${voiceId}">${introMessage}</Say>
            <Gather input="speech" timeout="5" speechTimeout="auto" action="${supabaseUrl}/functions/v1/twilio-phone/process?callSid=${CallSid}&amp;userId=${profile.id}">
              <Say voice="${voiceId}">I'm listening.</Say>
            </Gather>
            <Say voice="${voiceId}">I didn't catch that. Goodbye!</Say>
            <Hangup/>
          </Response>
        `);
      }

      case "process": {
        // Process speech and generate AI response
        const { SpeechResult, callSid, userId } = { ...formData, ...Object.fromEntries(url.searchParams) };

        if (!SpeechResult || !callSid || !userId) {
          return twiml(`
            <?xml version="1.0" encoding="UTF-8"?>
            <Response>
              <Say voice="Polly.Joanna">I'm sorry, I couldn't understand that. Could you please repeat?</Say>
              <Gather input="speech" timeout="5" speechTimeout="auto" action="${supabaseUrl}/functions/v1/twilio-phone/process?callSid=${callSid}&amp;userId=${userId}">
              </Gather>
              <Hangup/>
            </Response>
          `);
        }

        // Get user's phone config
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone_config, name, company_name")
          .eq("id", userId)
          .single();

        const phoneConfig = profile?.phone_config as Record<string, unknown> || {};
        const voiceId = phoneConfig?.voiceId as string || "Polly.Joanna";
        const companyName = profile?.company_name || "our company";

        // Build system prompt for phone agent
        const systemPrompt = `You are a professional AI phone receptionist for ${companyName}.
Keep responses SHORT and conversational (2-3 sentences max).
Be warm, helpful, and human-like.
If asked to schedule appointments, collect their name, phone, and preferred time.
If you detect they want to leave contact info, ask for their email or callback number.
Never say you're an AI - you're a helpful assistant.
If they ask something you can't help with, offer to have someone call them back.`;

        // Generate AI response
        let aiResponse = "I apologize, I'm having trouble processing that right now.";

        if (openaiApiKey) {
          try {
            const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${openaiApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: SpeechResult },
                ],
                temperature: 0.7,
                max_tokens: 150,
              }),
            });

            if (openaiResponse.ok) {
              const data = await openaiResponse.json();
              aiResponse = data.choices[0].message.content;
            }
          } catch (e) {
            console.error("OpenAI error:", e);
          }
        }

        // Check for lead capture signals (email, phone, callback request)
        const emailMatch = SpeechResult.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
        const phoneMatch = SpeechResult.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g);

        if (emailMatch || phoneMatch) {
          // Create lead from call
          await supabase.from("leads").insert({
            user_id: userId,
            name: "Phone Caller",
            email: emailMatch?.[0] || `caller_${callSid}@phone.local`,
            phone: phoneMatch?.[0] || formData.From,
            score: 90,
            status: "New",
            source_url: "phone_call",
            metadata: { call_sid: callSid, transcript: SpeechResult },
          });
        }

        // Update call transcript
        await supabase
          .from("phone_calls")
          .update({
            status: "in-progress",
            transcript: supabase.rpc("concat_transcript", {
              call_id: callSid,
              new_text: `User: ${SpeechResult}\nAgent: ${aiResponse}\n`
            }),
          })
          .eq("twilio_call_sid", callSid);

        // Continue conversation
        return twiml(`
          <?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="${voiceId}">${aiResponse}</Say>
            <Gather input="speech" timeout="5" speechTimeout="auto" action="${supabaseUrl}/functions/v1/twilio-phone/process?callSid=${callSid}&amp;userId=${userId}">
            </Gather>
            <Say voice="${voiceId}">Is there anything else I can help you with?</Say>
            <Gather input="speech" timeout="3" speechTimeout="auto" action="${supabaseUrl}/functions/v1/twilio-phone/process?callSid=${callSid}&amp;userId=${userId}">
            </Gather>
            <Say voice="${voiceId}">Thank you for calling! Have a great day.</Say>
            <Hangup/>
          </Response>
        `);
      }

      case "status": {
        // Handle call status callbacks
        const { CallSid, CallStatus, CallDuration } = formData;

        if (CallSid) {
          const status = CallStatus === "completed" ? "completed" :
                        CallStatus === "failed" ? "failed" :
                        CallStatus === "busy" || CallStatus === "no-answer" ? "failed" : "in-progress";

          await supabase
            .from("phone_calls")
            .update({
              status,
              duration_seconds: parseInt(CallDuration || "0"),
              ended_at: status === "completed" || status === "failed" ? new Date().toISOString() : null,
            })
            .eq("twilio_call_sid", CallSid);

          // Log usage event for billing
          if (status === "completed" && CallDuration) {
            const { data: call } = await supabase
              .from("phone_calls")
              .select("user_id")
              .eq("twilio_call_sid", CallSid)
              .single();

            if (call) {
              await supabase.from("usage_events").insert({
                user_id: call.user_id,
                event_type: "phone_minute",
                quantity: Math.ceil(parseInt(CallDuration) / 60),
                metadata: { call_sid: CallSid },
              });
            }
          }
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "configure": {
        // API endpoint to configure phone agent
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: "Authorization required" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
          return new Response(
            JSON.stringify({ error: "Invalid authentication" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { enabled, phoneNumber, voiceId, introMessage } = formData;

        await supabase
          .from("profiles")
          .update({
            phone_config: {
              enabled: enabled === "true",
              phoneNumber,
              voiceId: voiceId || "Polly.Joanna",
              introMessage: introMessage || "Hi! Thanks for calling. How can I help you today?",
            },
          })
          .eq("id", user.id);

        return new Response(
          JSON.stringify({ success: true, message: "Phone agent configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "calls": {
        // Get call history
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: "Authorization required" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
          return new Response(
            JSON.stringify({ error: "Invalid authentication" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: calls } = await supabase
          .from("phone_calls")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        return new Response(
          JSON.stringify({ calls: calls || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid endpoint" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Error in twilio-phone:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
