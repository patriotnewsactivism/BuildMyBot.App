// Embed Knowledge Base Edge Function
// Generates embeddings for knowledge base content

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { OpenAI } from 'https://esm.sh/openai@4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  botId: string;
  content: string;
  sourceType: 'pdf' | 'url' | 'text';
  sourceUrl?: string;
  metadata?: Record<string, any>;
}

// Chunk text into smaller segments for better retrieval
function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { botId, content, sourceType, sourceUrl, metadata }: RequestBody = await req.json();

    if (!botId || !content || !sourceType) {
      throw new Error('Missing required fields: botId, content, sourceType');
    }

    // Verify bot ownership
    const { data: bot, error: botError } = await supabaseClient
      .from('bots')
      .select('id')
      .eq('id', botId)
      .eq('owner_id', user.id)
      .single();

    if (botError || !bot) {
      throw new Error('Bot not found or access denied');
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
    });

    // Chunk the content
    const chunks = chunkText(content);
    const embeddedChunks = [];

    // Generate embeddings for each chunk
    for (const chunk of chunks) {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: chunk,
      });

      const embedding = embeddingResponse.data[0].embedding;

      // Insert into knowledge base
      const { data, error } = await supabaseClient
        .from('knowledge_base')
        .insert({
          owner_id: user.id,
          bot_id: botId,
          content: chunk,
          source_type: sourceType,
          source_url: sourceUrl,
          embedding: embedding,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting chunk:', error);
      } else {
        embeddedChunks.push(data);
      }
    }

    // Log usage event
    await supabaseClient.from('usage_events').insert({
      owner_id: user.id,
      event_type: 'knowledge_base_query',
      resource_id: botId,
      quantity: chunks.length,
      metadata: { source_type: sourceType, chunks_count: chunks.length },
    });

    return new Response(
      JSON.stringify({
        success: true,
        chunksProcessed: embeddedChunks.length,
        knowledgeBaseIds: embeddedChunks.map(c => c.id),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in embed-knowledge-base:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
