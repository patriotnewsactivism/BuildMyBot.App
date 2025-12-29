import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type CallStatus = 'initiated' | 'in-progress' | 'completed' | 'failed';
type TwilioPayload = Record<string, string>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
};

const timingSafeEqual = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
};

const normalizeCallStatus = (status: string | null): CallStatus => {
  const normalized = (status || '').toLowerCase();
  if (["ringing", "queued", "initiated", "pending"].includes(normalized)) return "initiated";
  if (["in-progress", "answered", "bridged"].includes(normalized)) return "in-progress";
  if (["completed", "busy", "no-answer"].includes(normalized)) return "completed";
  if (["failed", "canceled", "declined"].includes(normalized)) return "failed";
  return "initiated";
};

const mergeTranscript = (existing?: string | null, incoming?: string | null) => {
  const current = existing?.trim();
  const next = incoming?.trim();
  if (current && next) return `${current}\n${next}`;
  return next || current || null;
};

const parsePayload = async (req: Request): Promise<TwilioPayload> => {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    return Object.fromEntries(Object.entries(body).map(([key, value]) => [key, String(value)]));
  }

  const formData = await req.formData();
  const payload: TwilioPayload = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      payload[key] = value;
    }
  }
  return payload;
};

const validateTwilioSignature = async (req: Request, payload: TwilioPayload, authToken: string) => {
  
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
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");

  if (!supabaseUrl || !supabaseServiceKey || !twilioAuthToken) {
    return new Response(JSON.stringify({ error: "Missing required server configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload = await parsePayload(req);
    const callSid = payload.CallSid?.trim();

    if (!callSid) {
      return new Response(JSON.stringify({ error: "Missing CallSid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signatureValid = await validateTwilioSignature(req, payload, twilioAuthToken);
    if (!signatureValid) {
      return new Response(JSON.stringify({ error: "Signature validation failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const calledSid = payload.CalledSid || payload.To || payload.Called || "";
    const targetBotId = payload.bot_id || payload.BotId || null;
    const status = normalizeCallStatus(payload.CallStatus || null);
    const transcriptText = payload.TranscriptionText || payload.SpeechResult || payload.transcript || null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone_config->>phoneNumber", calledSid)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "No matching profile for CalledSid" }), {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const durationSeconds = Number(payload.CallDuration);

    const metadata: Record<string, unknown> = {
      direction: payload.Direction,
      forwardedFrom: payload.ForwardedFrom,
      recordingSid: payload.RecordingSid,
      transcriptionSid: payload.TranscriptionSid,
      digits: payload.Digits,
      accountSid: payload.AccountSid,
      called: payload.Called,
    };

    const baseRecord = {
      user_id: profile.id,
      bot_id: targetBotId,
      twilio_call_sid: callSid,
      from_number: payload.From || null,
      to_number: payload.To || null,
      status,
      duration_seconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
      recording_url: payload.RecordingUrl || null,
      transcript: transcriptText,
      ended_at: status === "completed" || status === "failed" ? new Date().toISOString() : null,
      metadata,
    };

    const { data: existingCall } = await supabase
      .from("phone_calls")
      .select("id, transcript, metadata")
      .eq("twilio_call_sid", callSid)
      .maybeSingle();

    const callPayload = existingCall
      ? {
          ...baseRecord,
          transcript: mergeTranscript(existingCall.transcript as string | null, transcriptText),
          metadata: { ...(existingCall.metadata as Record<string, unknown> | null) ?? {}, ...metadata },
        }
      : baseRecord;

    const upsertQuery = existingCall
      ? supabase.from("phone_calls").update(callPayload).eq("id", existingCall.id)
      : supabase.from("phone_calls").insert(callPayload);

    const { error: callError } = await upsertQuery;
    if (callError) {
      console.error("Failed to upsert phone call", callError);
      return new Response(JSON.stringify({ error: "Failed to log call" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (baseRecord.duration_seconds && status === "completed") {
      const minutesUsed = Math.max(1, Math.ceil(baseRecord.duration_seconds / 60));
      await supabase.from("usage_events").insert({
        user_id: profile.id,
        event_type: "phone_minute",
        quantity: minutesUsed,
        metadata: { twilio_call_sid: callSid },
      });
    }

    return new Response(JSON.stringify({ message: "Call logged", status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error handling Twilio webhook", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
