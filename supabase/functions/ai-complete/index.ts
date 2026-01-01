// ai-complete Edge Function
// Handles AI chat completions with OpenAI, logs conversations, and tracks usage

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, logUsage } from "../_shared/rateLimit.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Secure CORS configuration
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173", // Vite dev server
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://app.buildmybot.com", // Production domain
  "https://buildmybot.vercel.app", // Vercel preview deployments
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

// Zod schemas for input validation
const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(50000),
});

const ChatRequestSchema = z.object({
  botId: z.string().uuid(),
  messages: z.array(ChatMessageSchema).min(1).max(100),
  sessionId: z.string().min(1).max(255),
  userId: z.string().uuid().optional(),
  skipLogging: z.boolean().optional(),
});

const MarketingRequestSchema = z.object({
  mode: z.literal("marketing"),
  variant: z.enum(["email", "ad", "blog", "social", "website"]),
  topic: z.string().min(1).max(1000),
  tone: z.string().max(100).optional(),
  templateContent: z.string().max(10000).optional(),
  templateId: z.string().uuid().optional(),
  title: z.string().max(200).optional(),
});

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequestBody {
  botId: string;
  messages: ChatMessage[];
  sessionId: string;
  userId?: string;
  skipLogging?: boolean;
}

interface MarketingRequestBody {
  mode: "marketing";
  variant: "email" | "ad" | "blog" | "social";
  topic: string;
  tone?: string;
  templateContent?: string;
  templateId?: string;
  title?: string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

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

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    // Check rate limiting for authenticated users
    if (userId) {
      const rateLimitResult = await checkRateLimit(
        userId,
        "ai-complete",
        supabaseUrl,
        supabaseServiceKey
      );

      if (!rateLimitResult.allowed) {
        return new Response(
          JSON.stringify({
            error: rateLimitResult.error || "Rate limit exceeded",
            remaining: rateLimitResult.remaining,
            reset: rateLimitResult.reset,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
              "X-RateLimit-Reset": rateLimitResult.reset.toString(),
            },
          }
        );
      }
    }

    const rawBody = await req.json() as ChatRequestBody | MarketingRequestBody;
    const isMarketingRequest = (rawBody as MarketingRequestBody)?.mode === "marketing" || "variant" in rawBody;

    // Validate input based on request type
    if (isMarketingRequest) {
      const validation = MarketingRequestSchema.safeParse(rawBody);
      if (!validation.success) {
        return new Response(
          JSON.stringify({
            error: "Invalid request format",
            details: validation.error.format()
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const validation = ChatRequestSchema.safeParse(rawBody);
      if (!validation.success) {
        return new Response(
          JSON.stringify({
            error: "Invalid request format",
            details: validation.error.format()
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // --------------------------
    // MARKETING CONTENT VARIANT
    // --------------------------
    if (isMarketingRequest && (rawBody as MarketingRequestBody).variant) {
      const { variant, topic, tone = "Professional", templateContent, templateId, title } = rawBody as MarketingRequestBody;

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Unauthorized. Please sign in to generate marketing content." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!variant || !topic) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: variant, topic" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const systemPrompts: Record<MarketingRequestBody["variant"], string> = {
        email: "You are a senior lifecycle marketer. Craft concise, high-converting emails that include a compelling subject line and a short, skimmable body. Keep copy under 150 words.",
        ad: "You are a performance marketing expert. Produce ad copy variations with headlines under 40 characters and body copy under 90 characters. Include 2-3 variants optimized for PPC/paid social.",
        blog: "You are a content strategist. Produce a blog outline with title, intro paragraph, 3-5 section headings, and a closing CTA. Keep tone clear and authoritative.",
        social: "You are a social media copywriter. Produce platform-ready posts for LinkedIn and X. Include concise hooks, 2-3 supporting bullets, and 3-5 relevant hashtags."
      };

      const systemPrompt = systemPrompts[variant];
      const promptIntro = `Topic: ${topic}\nTone: ${tone}`;
      const reuseInstruction = templateContent
        ? `Reuse the following template as a starting point. Modernize and refresh it without repeating verbatim:\n${templateContent}`
        : "Create this from scratch using best practices for this channel.";

      const marketingMessages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `${promptIntro}\n\n${reuseInstruction}\n\nOutput only the copy in plain text.`
        }
      ];

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: marketingMessages,
          temperature: 0.75,
          max_tokens: 800,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error("OpenAI API error (marketing):", errorText);
        return new Response(
          JSON.stringify({ error: "AI service error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const openaiData = await openaiResponse.json();
      const assistantMessage = openaiData.choices?.[0]?.message?.content || "";
      const tokensUsed = openaiData.usage?.total_tokens || 0;

      // Log usage for rate limiting
      if (userId) {
        await logUsage(userId, "ai-complete", tokensUsed, supabaseUrl, supabaseServiceKey);
      }

      let savedContent = null;
      const safeTitle = title || `${variant.toUpperCase()} - ${topic}`.slice(0, 120);

      try {
        const { data, error: insertError } = await supabase
          .from("marketing_content")
          .insert({
            user_id: userId,
            content_type: variant,
            title: safeTitle,
            content: assistantMessage,
            metadata: {
              tone,
              topic,
              templateId: templateId || null,
            },
          })
          .select()
          .single();

        if (insertError) {
          console.error("Failed to persist marketing content:", insertError);
        } else {
          savedContent = data;
        }
      } catch (persistError) {
        console.error("Unexpected persistence error:", persistError);
      }

      return new Response(
        JSON.stringify({
          message: assistantMessage,
          marketingContent: savedContent,
          tokensUsed,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --------------------------
    // DEFAULT CHAT COMPLETIONS
    // --------------------------

    const body = rawBody as ChatRequestBody;
    const { botId, messages, sessionId, skipLogging } = body;

    if (!botId || !messages || !sessionId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: botId, messages, sessionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch bot configuration
    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("*")
      .eq("id", botId)
      .single();

    if (botError || !bot) {
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

    // Build messages array with system prompt
    const chatMessages: ChatMessage[] = [
      { role: "system", content: bot.system_prompt },
      ...messages,
    ];

    // Search knowledge base for relevant context (RAG)
    const lastUserMessage = messages.filter(m => m.role === "user").pop();
    if (lastUserMessage) {
      // Get embeddings for the query
      const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
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

        // Search knowledge base using vector similarity
        const { data: kbResults } = await supabase.rpc("match_knowledge_base", {
          query_embedding: queryEmbedding,
          match_bot_id: botId,
          match_threshold: 0.7,
          match_count: 3,
        });

        if (kbResults && kbResults.length > 0) {
          const context = kbResults.map((r: { content: string }) => r.content).join("\n\n");
          chatMessages[0].content += `\n\nRelevant context from knowledge base:\n${context}`;
        }
      }
    }

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: bot.model || "gpt-4o-mini",
        messages: chatMessages,
        temperature: bot.temperature || 0.7,
        max_tokens: 1000,
      }),
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

    // Log usage for rate limiting
    if (userId) {
      await logUsage(userId, "ai-complete", tokensUsed, supabaseUrl, supabaseServiceKey);
    }

    // Get or create conversation
    let conversationId: string | undefined;
    if (!skipLogging) {
      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("session_id", sessionId)
        .eq("bot_id", botId)
        .single();

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        const { data: newConversation, error: convError } = await supabase
          .from("conversations")
          .insert({
            bot_id: botId,
            user_id: bot.user_id,
            session_id: sessionId,
          })
          .select("id")
          .single();

        if (convError) {
          console.error("Error creating conversation:", convError);
        }
        conversationId = newConversation?.id;
      }

      // Log messages to database
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
    await supabase.from("usage_events").insert({
      user_id: bot.user_id,
      event_type: "api_call",
      quantity: tokensUsed,
      bot_id: botId,
      metadata: { session_id: sessionId, model: bot.model },
    });

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        conversationId: conversationId || sessionId,
        tokensUsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-complete:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
