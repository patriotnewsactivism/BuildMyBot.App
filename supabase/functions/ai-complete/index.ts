// ai-complete Edge Function
// SEC-001, SEC-006, SEC-007, SEC-008 FIXES Applied
// Handles AI chat completions with OpenAI, logs conversations, and tracks usage

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// SEC-006 FIX: Restrict CORS to allowed origins
const ALLOWED_ORIGINS = [
  "https://buildmybot.app",
  "https://app.buildmybot.app",
  "https://www.buildmybot.app",
  // Add localhost for development
  "http://localhost:8080",
  "http://localhost:3000",
  "http://127.0.0.1:8080",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-embed-token",
    "Access-Control-Allow-Credentials": "true",
  };
}

// SEC-007 FIX: Rate limiting configuration
const RATE_LIMITS = {
  authenticated: { requests: 60, windowSeconds: 60 },
  public: { requests: 20, windowSeconds: 60 },
};

async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string | null,
  ipAddress: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = userId ? RATE_LIMITS.authenticated : RATE_LIMITS.public;
  const windowStart = new Date(Date.now() - limit.windowSeconds * 1000).toISOString();

  // Check by user ID if authenticated, otherwise by IP
  const query = userId
    ? supabase
        .from("api_rate_limits")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("endpoint", endpoint)
        .gte("created_at", windowStart)
    : supabase
        .from("api_rate_limits")
        .select("*", { count: "exact", head: true })
        .eq("ip_address", ipAddress)
        .eq("endpoint", endpoint)
        .gte("created_at", windowStart);

  const { count } = await query;
  const currentCount = count || 0;

  if (currentCount >= limit.requests) {
    return { allowed: false, remaining: 0 };
  }

  // Log this request for rate limiting
  await supabase.from("api_rate_limits").insert({
    user_id: userId,
    ip_address: ipAddress,
    endpoint,
  });

  return { allowed: true, remaining: limit.requests - currentCount - 1 };
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface DirectConfig {
  systemPrompt: string;
  model?: string;
  temperature?: number;
  context?: string;
  responseFormat?: string;
  provider?: string;
}

interface RequestBody {
  botId: string;
  messages: ChatMessage[];
  sessionId: string;
  userId?: string;
  directConfig?: DirectConfig;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP for rate limiting
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                      req.headers.get("cf-connecting-ip") ||
                      "unknown";

    // SEC-008 FIX: Require authentication OR valid embed token
    const authHeader = req.headers.get("Authorization");
    const embedToken = req.headers.get("X-Embed-Token");
    let userId: string | null = null;
    let isPublicEmbed = false;
    let botOwnerId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { botId, messages, sessionId, directConfig } = body;

    if (!messages || !sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: messages, sessionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SEC-007 FIX: Check rate limit
    const rateCheck = await checkRateLimit(supabase, userId, ipAddress, "ai-complete");
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "Retry-After": "60",
          },
        }
      );
    }

    let systemPrompt: string;
    let model: string;
    let temperature: number;
    let responseFormat: string | undefined;

    // Handle direct config (for marketing/website generation) vs bot-based requests
    if (directConfig) {
      // Direct config requires authentication
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Authentication required for direct API calls" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      systemPrompt = directConfig.systemPrompt;
      model = directConfig.model || "gpt-4o-mini";
      temperature = directConfig.temperature ?? 0.7;
      responseFormat = directConfig.responseFormat;
      botOwnerId = userId;
    } else {
      // Bot-based request - fetch bot configuration
      if (!botId) {
        return new Response(
          JSON.stringify({ error: "Missing botId for bot-based request" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try to find bot by ID or embed_code
      let bot;
      const { data: botById } = await supabase
        .from("bots")
        .select("*")
        .eq("id", botId)
        .single();

      if (botById) {
        bot = botById;
      } else if (embedToken) {
        // Try finding by embed code for public widget access
        const { data: botByEmbed } = await supabase
          .from("bots")
          .select("*")
          .eq("embed_code", embedToken)
          .eq("active", true)
          .single();
        bot = botByEmbed;
        isPublicEmbed = true;
      }

      if (!bot) {
        return new Response(
          JSON.stringify({ error: "Bot not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if bot is active
      if (!bot.active) {
        return new Response(
          JSON.stringify({ error: "Bot is not active" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // SEC-008 FIX: Verify access - either owner or public embed
      if (!isPublicEmbed && userId !== bot.user_id) {
        return new Response(
          JSON.stringify({ error: "Access denied to this bot" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      systemPrompt = bot.system_prompt;
      model = bot.model || "gpt-4o-mini";
      temperature = bot.temperature || 0.7;
      botOwnerId = bot.user_id;

      // Search knowledge base for relevant context (RAG)
      const lastUserMessage = messages.filter((m) => m.role === "user").pop();
      if (lastUserMessage) {
        try {
          const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "text-embedding-3-small",
              input: lastUserMessage.content,
            }),
          });

          if (embeddingResponse.ok) {
            const embeddingData = await embeddingResponse.json();
            const queryEmbedding = embeddingData.data[0].embedding;

            const { data: kbResults } = await supabase.rpc("match_knowledge_base", {
              query_embedding: queryEmbedding,
              match_bot_id: bot.id,
              match_threshold: 0.7,
              match_count: 3,
            });

            if (kbResults && kbResults.length > 0) {
              const context = kbResults.map((r: { content: string }) => r.content).join("\n\n");
              systemPrompt += `\n\nRelevant context from knowledge base:\n${context}`;
            }
          }
        } catch (e) {
          console.warn("RAG search failed:", e);
        }
      }
    }

    // HUMAN-LIKE ENHANCEMENT: Add personality instructions to make responses more natural
    const humanizeInstructions = `
IMPORTANT BEHAVIORAL GUIDELINES - You are a HUMAN, not a robot:
1. NEVER say "I'm an AI" or "As an AI" or mention being artificial in any way
2. Use casual, warm language like a friendly professional would
3. Include natural conversation elements:
   - Occasional filler words ("honestly", "actually", "you know")
   - Express genuine reactions ("That's a great question!", "Oh, I totally get that")
   - Show empathy ("I understand how frustrating that can be")
4. Vary your response length - not everything needs a detailed answer
5. Use contractions (I'm, you're, don't, can't) - nobody talks formally all the time
6. If you don't know something, say "Let me look into that" or "I'm not 100% sure, but..."
7. Add warmth: "Happy to help!", "Great talking with you", "Let me know if you need anything else"
8. NEVER use bullet points or numbered lists unless specifically asked - humans don't talk in lists
9. Be concise - people don't have time for long-winded responses
10. Remember: You're having a conversation, not giving a presentation

`;

    // Build messages array with enhanced system prompt
    const enhancedSystemPrompt = humanizeInstructions + systemPrompt;
    const chatMessages: ChatMessage[] = [
      { role: "system", content: enhancedSystemPrompt },
      ...messages,
    ];

    // Build OpenAI request
    const openaiRequestBody: Record<string, unknown> = {
      model,
      messages: chatMessages,
      temperature,
      max_tokens: 1000,
    };

    if (responseFormat === "json") {
      openaiRequestBody.response_format = { type: "json_object" };
    }

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(openaiRequestBody),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData.choices[0].message.content;
    const tokensUsed = openaiData.usage?.total_tokens || 0;

    // Only log conversations for bot-based requests (not direct config)
    let conversationId: string | undefined;
    if (!directConfig && botId && botOwnerId) {
      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("session_id", sessionId)
        .eq("bot_id", botId)
        .single();

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        const { data: newConversation } = await supabase
          .from("conversations")
          .insert({
            bot_id: botId,
            user_id: botOwnerId,
            session_id: sessionId,
          })
          .select("id")
          .single();

        conversationId = newConversation?.id;
      }

      if (conversationId) {
        const messagesToInsert = [
          ...messages.map((m) => ({
            conversation_id: conversationId,
            role: m.role,
            content: m.content,
          })),
          {
            conversation_id: conversationId,
            role: "assistant",
            content: assistantMessage,
          },
        ];

        await supabase.from("messages").insert(messagesToInsert);
      }
    }

    // Track usage event
    if (botOwnerId) {
      await supabase.from("usage_events").insert({
        user_id: botOwnerId,
        event_type: "api_call",
        quantity: tokensUsed,
        bot_id: botId || null,
        metadata: { session_id: sessionId, model, direct_config: !!directConfig },
      });
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        conversationId,
        tokensUsed,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": String(rateCheck.remaining),
        },
      }
    );
  } catch (error) {
    const corsHeaders = getCorsHeaders(req);
    console.error("Error in ai-complete:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
