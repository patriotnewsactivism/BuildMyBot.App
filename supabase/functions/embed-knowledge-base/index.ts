// Edge Function: embed-knowledge-base
// Generates vector embeddings for knowledge base content

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';
import { createEmbedding, estimateTokens } from '../_shared/openai.ts';

interface RequestBody {
  bot_id: string;
  title: string;
  content: string;
  source_type?: 'text' | 'pdf' | 'url' | 'file';
  source_url?: string;
  chunk_size?: number; // Max tokens per chunk
}

// Chunk text into smaller pieces for embedding
function chunkText(text: string, maxTokens: number = 500): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    // If single paragraph exceeds max, split by sentences
    if (paragraphTokens > maxTokens) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
        currentTokens = 0;
      }

      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);

        if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
          currentTokens = sentenceTokens;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
          currentTokens += sentenceTokens;
        }
      }
    } else if (currentTokens + paragraphTokens > maxTokens) {
      // Start new chunk
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
      currentTokens = paragraphTokens;
    } else {
      // Add to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentTokens += paragraphTokens;
    }
  }

  // Add remaining chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(c => c.length > 0);
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = await getUserFromAuth(authHeader);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();

    const { bot_id, title, content, source_type = 'text', source_url, chunk_size = 500 } = body;

    // Validate required fields
    if (!bot_id || !title || !content) {
      return new Response(
        JSON.stringify({ error: 'bot_id, title, and content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseClient();

    // Verify bot ownership
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('id, owner_id')
      .eq('id', bot_id)
      .eq('owner_id', user.id)
      .single();

    if (botError || !bot) {
      return new Response(
        JSON.stringify({ error: 'Bot not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check knowledge base limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    const { data: planLimits } = await supabase
      .from('plans')
      .select('max_knowledge_items')
      .eq('slug', profile?.plan || 'FREE')
      .single();

    const { count: currentCount } = await supabase
      .from('knowledge_base')
      .select('id', { count: 'exact', head: true })
      .eq('bot_id', bot_id);

    if (planLimits && planLimits.max_knowledge_items !== -1) {
      if ((currentCount || 0) >= planLimits.max_knowledge_items) {
        return new Response(
          JSON.stringify({ error: 'Knowledge base item limit reached. Please upgrade your plan.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Chunk the content
    const chunks = chunkText(content, chunk_size);

    // Process each chunk
    const results: Array<{ id: string; chunk_index: number; tokens: number }> = [];
    let totalTokens = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Generate embedding
      const { embedding, tokens } = await createEmbedding(chunk);
      totalTokens += tokens;

      // Store in database
      const { data: kbItem, error: insertError } = await supabase
        .from('knowledge_base')
        .insert({
          bot_id,
          owner_id: user.id,
          title: chunks.length > 1 ? `${title} (Part ${i + 1})` : title,
          content: chunk,
          source_type,
          source_url: source_url || null,
          chunk_index: i,
          embedding,
          token_count: tokens,
          metadata: {
            total_chunks: chunks.length,
            original_title: title,
          },
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to store chunk ${i}: ${insertError.message}`);
      }

      results.push({
        id: kbItem.id,
        chunk_index: i,
        tokens,
      });
    }

    // Log usage event
    await supabase.from('usage_events').insert({
      owner_id: user.id,
      bot_id,
      event_type: 'embedding',
      tokens_used: totalTokens,
      cost_cents: Math.ceil(totalTokens * 0.00002 * 100), // text-embedding-3-small pricing
      metadata: {
        title,
        chunks_created: chunks.length,
        source_type,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        items_created: results.length,
        total_tokens: totalTokens,
        chunks: results,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('embed-knowledge-base error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
