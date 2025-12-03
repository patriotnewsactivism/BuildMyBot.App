-- Vector Search Function for Knowledge Base RAG

CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_bot_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  source_type text,
  source_url text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kb.id,
    kb.content,
    kb.source_type,
    kb.source_url,
    1 - (kb.embedding <=> query_embedding) as similarity
  FROM knowledge_base kb
  WHERE
    (filter_bot_id IS NULL OR kb.bot_id = filter_bot_id)
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
$$;
