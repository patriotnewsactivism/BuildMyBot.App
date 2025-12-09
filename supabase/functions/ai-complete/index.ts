// ai-complete Edge Function
// Handles AI chat completions with OpenAI, logs conversations, and tracks usage

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  botId: string;
  messages: ChatMessage[];
  sessionId: string;
  userId?: string;
}

serve(async (req) => {
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

    const body: RequestBody = await req.json();
    const { botId, messages, sessionId } = body;

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

    // Get or create conversation
    let conversationId: string;
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
        conversationId,
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
