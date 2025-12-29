import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CARTESIA_API_URL = "https://api.cartesia.ai/tts/bytes";
const CARTESIA_WEBSOCKET_URL = "wss://api.cartesia.ai/tts/websocket";

serve(async (req) => {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  const cartesiaApiKey = Deno.env.get("CARTESIA_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!cartesiaApiKey) {
    console.error("CARTESIA_API_KEY not configured");
    socket.close(1008, "Service not configured");
    return response;
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase credentials not configured");
    socket.close(1008, "Service not configured");
    return response;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let userId: string | null = null;
  let callSid: string | null = null;
  let voiceId = "79a125e8-cd45-4c13-8a67-188112f4dd22"; // Default Cartesia voice
  let streamSid: string | null = null;
  let conversationHistory: Array<{ role: string; content: string }> = [];
  let currentTranscript = "";
  let botSystemPrompt = "You are a helpful AI assistant answering phone calls.";

  socket.onopen = () => {
    console.log("WebSocket connection established with Twilio");
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.event) {
        case "start":
          {
            streamSid = data.start?.streamSid || null;
            const params = data.start?.customParameters || {};
            userId = params.userId || null;
            callSid = params.callSid || null;
            const customVoiceId = params.voiceId || "alloy";

            // Map common voice names to Cartesia voice IDs
            const voiceMap: Record<string, string> = {
              "alloy": "79a125e8-cd45-4c13-8a67-188112f4dd22",
              "echo": "a167e0f3-df7e-4d52-a9c3-f949145efdab",
              "fable": "bf991597-6c13-47e4-8411-91ec2de5c466",
              "onyx": "41534e16-2966-4c6b-9670-111411def906",
              "nova": "79a125e8-cd45-4c13-8a67-188112f4dd22",
              "shimmer": "a167e0f3-df7e-4d52-a9c3-f949145efdab",
            };

            voiceId = voiceMap[customVoiceId] || voiceMap["alloy"];

            if (userId) {
              // Load user's bot configuration for system prompt
              const { data: bots } = await supabase
                .from("bots")
                .select("system_prompt, name")
                .eq("user_id", userId)
                .limit(1);

              if (bots && bots.length > 0) {
                botSystemPrompt = bots[0].system_prompt || botSystemPrompt;
              }
            }

            console.log(`Call started: userId=${userId}, callSid=${callSid}, voiceId=${voiceId}`);
          }
          break;

        case "media":
          {
            // Twilio sends mulaw audio in base64
            // For a full implementation, you would:
            // 1. Decode base64 -> mulaw bytes
            // 2. Convert mulaw to PCM16
            // 3. Accumulate audio chunks
            // 4. Send to speech recognition (Deepgram or Cartesia's STT)
            // 5. Get transcript
            // 6. Send to LLM for response
            // 7. Send response text to Cartesia TTS
            // 8. Convert PCM16 back to mulaw
            // 9. Send audio back to Twilio

            // This is a placeholder - real implementation would use Deepgram for STT
            // and Cartesia for TTS, with proper audio conversion

            console.log("Received audio chunk");
          }
          break;

        case "stop":
          {
            console.log("Call ended");

            // Save conversation transcript
            if (userId && callSid && currentTranscript) {
              await supabase
                .from("phone_calls")
                .update({
                  transcript: currentTranscript,
                  ended_at: new Date().toISOString()
                })
                .eq("twilio_call_sid", callSid);
            }

            socket.close();
          }
          break;

        default:
          console.log(`Unknown event: ${data.event}`);
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");
  };

  return response;
});

/**
 * Helper function to send audio to Cartesia TTS
 */
async function synthesizeSpeech(text: string, voiceId: string, apiKey: string): Promise<Uint8Array> {
  const response = await fetch(CARTESIA_API_URL, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_id: "sonic-english",
      transcript: text,
      voice: {
        mode: "id",
        id: voiceId,
      },
      output_format: {
        container: "raw",
        encoding: "pcm_s16le",
        sample_rate: 8000,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Cartesia TTS failed: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Helper to convert mulaw to PCM16
 * This is a simplified version - production would use a proper codec
 */
function mulawToPcm16(mulaw: Uint8Array): Int16Array {
  const MULAW_BIAS = 33;
  const pcm = new Int16Array(mulaw.length);

  for (let i = 0; i < mulaw.length; i++) {
    let sample = ~mulaw[i];
    const sign = sample & 0x80;
    const exponent = (sample >> 4) & 0x07;
    const mantissa = sample & 0x0F;

    let value = ((mantissa << 3) + MULAW_BIAS) << exponent;
    if (sign !== 0) value = -value;

    pcm[i] = value;
  }

  return pcm;
}

/**
 * Helper to convert PCM16 to mulaw
 */
function pcm16ToMulaw(pcm: Int16Array): Uint8Array {
  const MULAW_BIAS = 33;
  const mulaw = new Uint8Array(pcm.length);

  for (let i = 0; i < pcm.length; i++) {
    let sample = pcm[i];
    const sign = sample < 0 ? 0x80 : 0;
    if (sign) sample = -sample;

    sample += MULAW_BIAS;
    let exponent = 7;
    for (let exp = 0; exp < 8; exp++) {
      if (sample <= (0xFF << exp)) {
        exponent = exp;
        break;
      }
    }

    const mantissa = (sample >> (exponent + 3)) & 0x0F;
    const encoded = ~(sign | (exponent << 4) | mantissa);
    mulaw[i] = encoded & 0xFF;
  }

  return mulaw;
}
