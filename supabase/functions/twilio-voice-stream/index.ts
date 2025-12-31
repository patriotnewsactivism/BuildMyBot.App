import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEEPGRAM_API_URL = "https://api.deepgram.com/v1/listen";
const CARTESIA_WEBSOCKET_URL = "wss://api.cartesia.ai/tts/websocket";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Voice mapping for Cartesia
const VOICE_MAP: Record<string, string> = {
  "alloy": "79a125e8-cd45-4c13-8a67-188112f4dd22",
  "echo": "a167e0f3-df7e-4d52-a9c3-f949145efdab",
  "fable": "bf991597-6c13-47e4-8411-91ec2de5c466",
  "onyx": "41534e16-2966-4c6b-9670-111411def906",
  "nova": "79a125e8-cd45-4c13-8a67-188112f4dd22",
  "shimmer": "a167e0f3-df7e-4d52-a9c3-f949145efdab",
};

serve(async (req) => {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  const cartesiaApiKey = Deno.env.get("CARTESIA_API_KEY");
  const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY");
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!cartesiaApiKey) {
    console.error("CARTESIA_API_KEY not configured");
    socket.close(1008, "TTS service not configured");
    return response;
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase credentials not configured");
    socket.close(1008, "Database not configured");
    return response;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let userId: string | null = null;
  let callSid: string | null = null;
  let voiceId = VOICE_MAP["alloy"];
  let streamSid: string | null = null;
  let conversationHistory: Array<{ role: string; content: string }> = [];
  let currentTranscript = "";
  let botSystemPrompt = "You are a helpful AI assistant answering phone calls. Be concise and natural in your responses.";
  let audioBuffer: Uint8Array[] = [];
  let processingAudio = false;
  let lastResponseTime = Date.now();

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
            voiceId = VOICE_MAP[customVoiceId] || VOICE_MAP["alloy"];

            if (userId) {
              // Load user's bot configuration for system prompt
              const { data: bots } = await supabase
                .from("bots")
                .select("system_prompt, name")
                .eq("user_id", userId)
                .eq("active", true)
                .limit(1);

              if (bots && bots.length > 0) {
                botSystemPrompt = bots[0].system_prompt || botSystemPrompt;
              }
            }

            conversationHistory.push({
              role: "system",
              content: botSystemPrompt
            });

            console.log(`Call started: userId=${userId}, callSid=${callSid}, voiceId=${voiceId}`);
          }
          break;

        case "media":
          {
            // Twilio sends mulaw audio in base64
            const payload = data.media?.payload;
            if (!payload) break;

            try {
              // Decode base64 to mulaw bytes
              const mulawBytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));

              // Add to buffer
              audioBuffer.push(mulawBytes);

              // Process audio in chunks (every ~500ms worth of audio)
              // Twilio sends 20ms packets at 8kHz = 160 bytes per packet
              // 500ms = 25 packets = 4000 bytes
              if (audioBuffer.length >= 25 && !processingAudio) {
                processAudioChunk();
              }
            } catch (error) {
              console.error("Error processing audio:", error);
            }
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
                  ended_at: new Date().toISOString(),
                  metadata: {
                    conversationHistory: conversationHistory.slice(1), // Exclude system prompt
                  }
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

  const processAudioChunk = async () => {
    if (processingAudio || audioBuffer.length === 0) return;
    processingAudio = true;

    try {
      // Concatenate audio buffer
      const totalLength = audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedAudio = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of audioBuffer) {
        combinedAudio.set(chunk, offset);
        offset += chunk.length;
      }
      audioBuffer = []; // Clear buffer

      // Convert mulaw to PCM16 for Deepgram
      const pcmAudio = mulawToPcm16(combinedAudio);

      // Transcribe with Deepgram (if available) or fallback to OpenAI Whisper
      let transcript = "";

      if (deepgramApiKey) {
        transcript = await transcribeWithDeepgram(pcmAudio, deepgramApiKey);
      } else if (openaiApiKey) {
        // Fallback to silence detection if no STT configured
        console.log("No STT service configured - silence detection only");
      }

      if (transcript && transcript.trim().length > 5) {
        console.log(`User said: ${transcript}`);

        // Add to conversation history
        conversationHistory.push({
          role: "user",
          content: transcript
        });

        currentTranscript += `\nUser: ${transcript}`;

        // Generate AI response
        const aiResponse = await generateAIResponse(conversationHistory, openaiApiKey);

        if (aiResponse) {
          console.log(`AI responding: ${aiResponse}`);

          conversationHistory.push({
            role: "assistant",
            content: aiResponse
          });

          currentTranscript += `\nAssistant: ${aiResponse}`;

          // Synthesize and send audio response
          await speakResponse(aiResponse);
        }

        lastResponseTime = Date.now();
      }
    } catch (error) {
      console.error("Error in processAudioChunk:", error);
    } finally {
      processingAudio = false;
    }
  };

  const speakResponse = async (text: string) => {
    try {
      if (!cartesiaApiKey || !streamSid) return;

      // Call Cartesia TTS API
      const response = await fetch("https://api.cartesia.ai/tts/bytes", {
        method: "POST",
        headers: {
          "X-API-Key": cartesiaApiKey,
          "Cartesia-Version": "2024-06-10",
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

      const audioData = await response.arrayBuffer();
      const pcmAudio = new Int16Array(audioData);

      // Convert PCM16 back to mulaw for Twilio
      const mulawAudio = pcm16ToMulaw(pcmAudio);

      // Send audio to Twilio in chunks
      const chunkSize = 160; // 20ms chunks at 8kHz
      for (let i = 0; i < mulawAudio.length; i += chunkSize) {
        const chunk = mulawAudio.slice(i, i + chunkSize);
        const base64Audio = btoa(String.fromCharCode(...chunk));

        socket.send(JSON.stringify({
          event: "media",
          streamSid: streamSid,
          media: {
            payload: base64Audio
          }
        }));

        // Small delay to match real-time playback
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    } catch (error) {
      console.error("Error in speakResponse:", error);
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
 * Transcribe audio using Deepgram
 */
async function transcribeWithDeepgram(pcmAudio: Int16Array, apiKey: string): Promise<string> {
  try {
    // Convert PCM16 to WAV format
    const wavData = pcmToWav(pcmAudio, 8000);

    const response = await fetch(`${DEEPGRAM_API_URL}?model=nova-2&punctuate=true&utterances=false`, {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "audio/wav",
      },
      body: wavData,
    });

    if (!response.ok) {
      console.error(`Deepgram error: ${response.status} ${response.statusText}`);
      return "";
    }

    const result = await response.json();
    return result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
  } catch (error) {
    console.error("Error in transcribeWithDeepgram:", error);
    return "";
  }
}

/**
 * Generate AI response using OpenAI
 */
async function generateAIResponse(messages: Array<{ role: string; content: string }>, apiKey: string | undefined): Promise<string> {
  if (!apiKey) {
    // Fallback response if no AI configured
    return "I'm here to help. How can I assist you today?";
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error(`OpenAI error: ${response.status} ${response.statusText}`);
      return "I apologize, but I'm having trouble processing that right now. Can you please repeat?";
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content || "I'm listening. Please continue.";
  } catch (error) {
    console.error("Error in generateAIResponse:", error);
    return "I'm experiencing some difficulties. Please try again.";
  }
}

/**
 * Convert mulaw to PCM16
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
 * Convert PCM16 to mulaw
 */
function pcm16ToMulaw(pcm: Int16Array): Uint8Array {
  const MULAW_BIAS = 33;
  const MULAW_MAX = 0x1FFF;
  const mulaw = new Uint8Array(pcm.length);

  for (let i = 0; i < pcm.length; i++) {
    let sample = pcm[i];
    const sign = sample < 0 ? 0x80 : 0;
    if (sign) sample = -sample;

    if (sample > MULAW_MAX) sample = MULAW_MAX;

    sample += MULAW_BIAS;
    let exponent = 7;
    for (let exp = 0; exp < 8; exp++) {
      if (sample <= (0x1F << (exp + 3))) {
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

/**
 * Convert PCM to WAV format
 */
function pcmToWav(pcmData: Int16Array, sampleRate: number): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length * 2; // 16-bit = 2 bytes per sample

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk size
  view.setUint16(20, 1, true); // Audio format (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write PCM samples
  const offset = 44;
  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(offset + (i * 2), pcmData[i], true);
  }

  return new Uint8Array(buffer);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
