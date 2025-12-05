// Supabase Edge Function: AI Chat Completion
// Handles chat requests securely with server-side API keys

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatMessage {
  role: "user" | "model" | "assistant";
  text: string;
}

interface ChatRequest {
  botId: string;
  messages: ChatMessage[];
  lastMessage: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { botId, messages, lastMessage }: ChatRequest = await req.json();

    if (!botId || !lastMessage) {
      return new Response(
        JSON.stringify({ error: "Missing botId or lastMessage" }),
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

    // Build messages array for OpenAI
    let systemContent = bot.systemPrompt || "You are a helpful assistant.";

    // Add knowledge base context if available
    if (bot.knowledgeBase && bot.knowledgeBase.length > 0) {
      const context = bot.knowledgeBase.join("\n\n");
      systemContent += `\n\n### KNOWLEDGE BASE:\n${context}\n\n### INSTRUCTIONS:\nAnswer based on the provided Knowledge Base when relevant. If the answer is not in the text, you may provide general assistance but indicate when information comes from your general knowledge vs the knowledge base.`;
    }

    const openaiMessages: Array<{role: string; content: string}> = [
      { role: "system", content: systemContent }
    ];

    // Add conversation history
    if (messages && messages.length > 0) {
      messages.forEach((msg) => {
        openaiMessages.push({
          role: msg.role === "model" ? "assistant" : "user",
          content: msg.text,
        });
      });
    }

    // Add the current message
    openaiMessages.push({ role: "user", content: lastMessage });

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: bot.model || "gpt-4o-mini",
        messages: openaiMessages,
        temperature: bot.temperature || 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error("OpenAI API Error:", errorData);
      throw new Error(errorData.error?.message || "OpenAI API request failed");
    }

    const openaiData = await openaiResponse.json();
    const responseText = openaiData.choices?.[0]?.message?.content || "";

    // Track usage (optional - increment conversation count)
    await supabase
      .from("bots")
      .update({ conversationsCount: (bot.conversationsCount || 0) + 1 })
      .eq("id", botId);

    // Detect potential leads (email patterns)
    const emailMatch = lastMessage.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
    let leadDetected = null;

    if (emailMatch && emailMatch[0]) {
      // Create a lead record
      const leadData = {
        id: crypto.randomUUID(),
        name: "Chat Visitor",
        email: emailMatch[0],
        score: 75,
        status: "New",
        sourceBotId: botId,
        createdAt: new Date().toISOString(),
      };

      await supabase.from("leads").insert(leadData);
      leadDetected = emailMatch[0];
    }

    return new Response(
      JSON.stringify({
        response: responseText,
        leadDetected,
        usage: openaiData.usage
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
