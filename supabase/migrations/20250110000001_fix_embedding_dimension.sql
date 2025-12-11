-- DB-002 FIX: Fix vector embedding dimension
-- text-embedding-3-small uses 1536 dimensions, not 3072
-- Migration: 20250110000001_fix_embedding_dimension

-- Note: This migration requires dropping the index and recreating it
-- If you have existing embeddings, you'll need to re-generate them with the correct dimension

-- Drop the existing index
DROP INDEX IF EXISTS knowledge_base_embedding_idx;

-- Alter the column to use the correct dimension for text-embedding-3-small
-- WARNING: This will fail if there are existing rows with 3072-dimension vectors
-- You may need to truncate the table or re-embed with correct dimensions first
ALTER TABLE knowledge_base
ALTER COLUMN embedding TYPE vector(1536);

-- Recreate the HNSW index with correct dimensions
CREATE INDEX knowledge_base_embedding_idx ON knowledge_base
USING hnsw (embedding vector_cosine_ops);

-- Update the match function to use correct dimensions
DROP FUNCTION IF EXISTS match_knowledge_base(vector(3072), UUID, FLOAT, INT);

CREATE OR REPLACE FUNCTION match_knowledge_base(
    query_embedding vector(1536),
    match_bot_id UUID,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    file_name TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.content,
        kb.file_name,
        1 - (kb.embedding <=> query_embedding) AS similarity
    FROM knowledge_base kb
    WHERE kb.bot_id = match_bot_id
      AND kb.embedding IS NOT NULL
      AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Add comment explaining the dimension choice
COMMENT ON COLUMN knowledge_base.embedding IS
'Vector embedding using text-embedding-3-small model (1536 dimensions). Use text-embedding-3-large (3072 dimensions) for higher quality at higher cost.';
