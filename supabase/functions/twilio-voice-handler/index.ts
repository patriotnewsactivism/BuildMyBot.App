import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { timingSafeEqual } from "https://deno.land/std@0.168.0/crypto/timing_safe_equal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "text/xml",
};

// Validate Twilio request signature to prevent spoofing
const validateTwilioSignature = async (req: Request, payload: Record<string, string>) => {
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!authToken) {
    // Fail closed - reject all requests if auth token not configured
    throw new Error("TWILIO_AUTH_TOKEN not configured");
  }

  const signatureHeader = req.headers.get("x-twilio-signature");
  if (!signatureHeader) return false;

  const url = new URL(req.url);
  const baseUrl = `${url.origin}${url.pathname}${url.search}`;
  const sortedKeys = Object.keys(payload).sort();
  const data = sortedKeys.reduce((acc, key) => `${acc}${key}${payload[key]}`, baseUrl);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const expectedBytes = new Uint8Array(signatureBuffer);
  const providedBytes = Uint8Array.from(atob(signatureHeader), (c) => c.charCodeAt(0));

  return timingSafeEqual(expectedBytes, providedBytes);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Say>Service temporarily unavailable</Say></Response>", {
      headers: corsHeaders,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const formData = await req.formData();
    const payload: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        payload[key] = value;
      }
    }

    // Validate Twilio signature before processing
    const isValid = await validateTwilioSignature(req, payload);
    if (!isValid) {
      console.error("Invalid Twilio signature - rejecting request");
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Unauthorized request</Say>
  <Hangup/>
</Response>`,
        { status: 401, headers: corsHeaders }
      );
    }

    const called = payload.To || payload.Called || "";
    const from = payload.From || "";
    const callSid = payload.CallSid || "";

    // Find the user profile by their configured phone number
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, phone_config")
      .eq("phone_config->>phoneNumber", called)
      .single();

    if (profileError || !profile) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for calling. This number is not configured. Please contact support.</Say>
  <Hangup/>
</Response>`,
        { headers: corsHeaders }
      );
    }

    const phoneConfig = profile.phone_config as Record<string, unknown> || {};
    const introMessage = (phoneConfig.introMessage as string) || "Hello! How can I help you today?";
    const voiceId = (phoneConfig.voiceId as string) || "alloy";

    // Get the WebSocket handler URL for streaming
    const websocketUrl = `wss://${new URL(supabaseUrl).hostname}/functions/v1/twilio-voice-stream`;

    // Build TwiML response with WebSocket streaming
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${introMessage}</Say>
  <Connect>
    <Stream url="${websocketUrl}">
      <Parameter name="userId" value="${profile.id}" />
      <Parameter name="callSid" value="${callSid}" />
      <Parameter name="voiceId" value="${voiceId}" />
      <Parameter name="from" value="${from}" />
    </Stream>
  </Connect>
</Response>`;

    return new Response(twiml, { headers: corsHeaders });
  } catch (error) {
    console.error("Error handling voice request:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We're experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`,
      { headers: corsHeaders }
    );
  }
});
