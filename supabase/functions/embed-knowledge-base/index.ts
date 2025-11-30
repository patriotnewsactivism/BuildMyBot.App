// Edge Function: embed-knowledge-base
// Purpose: Generate and store embeddings for knowledge base entries

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmbedRequest {
  botId: string
  content: string
  sourceType: 'pdf' | 'url' | 'text'
  sourceUrl?: string
  fileName?: string
  metadata?: Record<string, any>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const {
      botId,
      content,
      sourceType,
      sourceUrl,
      fileName,
      metadata = {},
    }: EmbedRequest = await req.json()

    // Validate bot ownership
    const { data: bot, error: botError } = await supabaseClient
      .from('bots')
      .select('id')
      .eq('id', botId)
      .eq('owner_id', user.id)
      .single()

    if (botError || !bot) {
      return new Response(
        JSON.stringify({ error: 'Bot not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Split content into chunks (simple chunking - 500 chars per chunk)
    const chunkSize = 500
    const chunks: string[] = []
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize))
    }

    // Generate embeddings for each chunk
    const embeddings: Array<{ content: string; embedding: number[] }> = []

    for (const chunk of chunks) {
      try {
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          },
          body: JSON.stringify({
            model: 'text-embedding-ada-002',
            input: chunk,
          }),
        })

        const embeddingData = await embeddingResponse.json()

        if (embeddingData.error) {
          console.error('OpenAI Embedding Error:', embeddingData.error)
          continue
        }

        embeddings.push({
          content: chunk,
          embedding: embeddingData.data[0].embedding,
        })
      } catch (error) {
        console.error('Embedding generation error:', error)
        continue
      }
    }

    // Store embeddings in database
    const kbEntries = embeddings.map(({ content, embedding }) => ({
      bot_id: botId,
      owner_id: user.id,
      content,
      source_type: sourceType,
      source_url: sourceUrl,
      file_name: fileName,
      embedding,
      metadata,
    }))

    const { error: insertError } = await supabaseClient
      .from('knowledge_base')
      .insert(kbEntries)

    if (insertError) {
      throw insertError
    }

    // Track usage event
    await supabaseClient
      .from('usage_events')
      .insert({
        owner_id: user.id,
        event_type: 'embedding',
        bot_id: botId,
        quantity: embeddings.length,
      })

    return new Response(
      JSON.stringify({
        success: true,
        chunksProcessed: embeddings.length,
        message: `Successfully embedded ${embeddings.length} chunks`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Embed knowledge base error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
