import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth';
import { openai } from '@/lib/openai';

/**
 * POST /api/knowledge-base/search
 *
 * Search knowledge base using vector similarity
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, botId, limit = 5 } = body;

    if (!query || !botId) {
      return NextResponse.json(
        { error: 'Query and botId are required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Generate embedding for query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search for similar chunks using pgvector
    // Note: This requires pgvector extension and proper column setup
    const { data: results, error } = await supabase.rpc('search_knowledge_base', {
      query_embedding: queryEmbedding,
      match_bot_id: botId,
      match_count: limit,
    });

    if (error) {
      console.error('Search error:', error);

      // Fallback: Simple text search if vector search fails
      const { data: fallbackResults } = await supabase
        .from('knowledge_base_chunks')
        .select(`
          *,
          file:knowledge_base_files!inner(bot_id, file_name)
        `)
        .eq('file.bot_id', botId)
        .textSearch('content', query)
        .limit(limit);

      return NextResponse.json({
        results: fallbackResults || [],
        method: 'text_search',
      });
    }

    return NextResponse.json({
      results: results || [],
      method: 'vector_search',
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search knowledge base' },
      { status: 500 }
    );
  }
}
