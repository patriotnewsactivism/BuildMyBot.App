// embed-knowledge-base Edge Function
// Generates embeddings for knowledge base content using OpenAI

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, logUsage } from "../_shared/rateLimit.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Zod schema for input validation
const EmbedKnowledgeBaseSchema = z.object({
  botId: z.string().uuid(),
  content: z.string().min(1).max(1000000), // Max 1MB of text
  fileName: z.string().min(1).max(255),
  fileType: z.string().max(50).optional(),
  fileUrl: z.string().url().max(2048).optional(),
  chunkSize: z.number().int().min(100).max(5000).optional(),
});

interface RequestBody {
  botId: string;
  content: string;
  fileName: string;
  fileType?: string;
  fileUrl?: string;
  chunkSize?: number;
}

// Simple text chunking function
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to find a natural break point (paragraph or sentence end)
    if (end < text.length) {
      const slice = text.slice(start, end + 100);
      const paragraphBreak = slice.lastIndexOf("\n\n");
      const sentenceBreak = slice.lastIndexOf(". ");

      if (paragraphBreak > chunkSize * 0.5) {
        end = start + paragraphBreak;
      } else if (sentenceBreak > chunkSize * 0.5) {
        end = start + sentenceBreak + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;

    if (start < 0) start = 0;
  }

  return chunks.filter(chunk => chunk.length > 0);
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

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

    // Verify user authentication
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

    // Check rate limiting
    const rateLimitResult = await checkRateLimit(
      user.id,
      "embed-knowledge-base",
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

    const rawBody = await req.json();

    // Validate input
    const validation = EmbedKnowledgeBaseSchema.safeParse(rawBody);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request format",
          details: validation.error.format()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { botId, content, fileName, fileType, fileUrl, chunkSize } = validation.data;

    // Verify bot ownership
    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("user_id")
      .eq("id", botId)
      .eq("user_id", user.id)
      .single();

    if (botError || !bot) {
      return new Response(
        JSON.stringify({ error: "Bot not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Chunk the content
    const chunks = chunkText(content, chunkSize || 1000);
    console.log(`Processing ${chunks.length} chunks for ${fileName}`);

    // Generate embeddings for each chunk
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: chunks,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error("OpenAI embedding error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate embeddings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const embeddingData = await embeddingResponse.json();
    const embeddings = embeddingData.data;

    // Insert knowledge base entries
    const kbEntries = chunks.map((chunk, index) => ({
      bot_id: botId,
      user_id: user.id,
      file_name: fileName,
      file_type: fileType || "text",
      file_url: fileUrl,
      content: chunk,
      embedding: embeddings[index].embedding,
      chunk_index: index,
      metadata: {
        total_chunks: chunks.length,
        original_length: content.length,
      },
    }));

    // Delete existing entries for this file (to allow re-upload)
    await supabase
      .from("knowledge_base")
      .delete()
      .eq("bot_id", botId)
      .eq("file_name", fileName);

    // Insert new entries
    const { error: insertError } = await supabase
      .from("knowledge_base")
      .insert(kbEntries);

    if (insertError) {
      console.error("Error inserting knowledge base:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save knowledge base" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log usage for rate limiting
    await logUsage(user.id, "embed-knowledge-base", chunks.length, supabaseUrl, supabaseServiceKey);

    // Track usage
    await supabase.from("usage_events").insert({
      user_id: user.id,
      event_type: "storage_mb",
      quantity: Math.ceil(content.length / (1024 * 1024)),
      bot_id: botId,
      metadata: { file_name: fileName, chunks: chunks.length },
    });

    return new Response(
      JSON.stringify({
        message: "Knowledge base updated successfully",
        fileName,
        chunksProcessed: chunks.length,
        totalTokens: embeddingData.usage?.total_tokens || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in embed-knowledge-base:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
