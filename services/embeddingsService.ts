/**
 * Vector Embeddings Service
 * Generates embeddings for knowledge base content to enable semantic search
 * Uses OpenAI's text-embedding-ada-002 model
 */

const API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY || '';

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  tokens: number;
}

/**
 * Generate embedding for a single text
 * @param text - Text to generate embedding for
 * @returns Embedding vector (1536 dimensions)
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!API_KEY) {
    throw new Error("Missing OpenAI API Key for embeddings");
  }

  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  // Truncate text if too long (ada-002 max is 8191 tokens, roughly 30k chars)
  const truncatedText = text.length > 30000 ? text.substring(0, 30000) : text;

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: truncatedText
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Embedding API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      embedding: data.data[0].embedding,
      text: truncatedText,
      tokens: data.usage.total_tokens
    };
  } catch (error: any) {
    console.error("Embedding generation error:", error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts (batch processing)
 * @param texts - Array of texts to generate embeddings for
 * @param onProgress - Optional progress callback
 * @returns Array of embedding results
 */
export async function generateEmbeddings(
  texts: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];
  const total = texts.length;

  for (let i = 0; i < texts.length; i++) {
    try {
      const result = await generateEmbedding(texts[i]);
      results.push(result);
      onProgress?.(i + 1, total);

      // Small delay to avoid rate limiting
      if (i < texts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`Failed to generate embedding for text ${i}:`, error);
      // Continue with other texts even if one fails
      results.push({
        embedding: [],
        text: texts[i],
        tokens: 0
      });
    }
  }

  return results;
}

/**
 * Calculate cosine similarity between two vectors
 * Used to find similar content in knowledge base
 * @returns Similarity score between 0 and 1
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Find most similar texts to a query
 * @param queryEmbedding - Embedding vector of the query
 * @param documents - Array of {text, embedding} objects
 * @param topK - Number of results to return
 * @returns Sorted array of most similar documents with scores
 */
export function findSimilar(
  queryEmbedding: number[],
  documents: Array<{ text: string; embedding: number[]; metadata?: any }>,
  topK: number = 5
): Array<{ text: string; score: number; metadata?: any }> {
  // Calculate similarity scores
  const scores = documents.map(doc => ({
    text: doc.text,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
    metadata: doc.metadata
  }));

  // Sort by score descending and return top K
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Chunk large text into smaller pieces for embedding
 * Useful for processing long documents
 * @param text - Text to chunk
 * @param maxChunkSize - Maximum characters per chunk
 * @param overlap - Number of characters to overlap between chunks
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  maxChunkSize: number = 2000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChunkSize;

    // If not at the end, try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > start) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.substring(start, end).trim());
    start = end - overlap;
  }

  return chunks;
}

/**
 * Process and embed knowledge base entry
 * Chunks text if needed and generates embeddings
 */
export async function embedKnowledgeBaseEntry(
  text: string,
  metadata?: any,
  onProgress?: (stage: string) => void
): Promise<Array<{ text: string; embedding: number[]; metadata: any }>> {
  onProgress?.("Chunking text...");

  // Chunk if text is too long
  const chunks = text.length > 2000
    ? chunkText(text, 2000, 200)
    : [text];

  onProgress?.(`Generating embeddings for ${chunks.length} chunk(s)...`);

  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const result = await generateEmbedding(chunks[i]);
    results.push({
      text: chunks[i],
      embedding: result.embedding,
      metadata: {
        ...metadata,
        chunkIndex: i,
        totalChunks: chunks.length
      }
    });

    // Small delay between chunks
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  onProgress?.("Embeddings generated!");
  return results;
}

/**
 * Semantic search in knowledge base
 * @param query - Search query
 * @param knowledgeBase - Array of KB entries with embeddings
 * @param topK - Number of results to return
 * @returns Most relevant KB entries
 */
export async function semanticSearch(
  query: string,
  knowledgeBase: Array<{ text: string; embedding: number[] }>,
  topK: number = 3
): Promise<Array<{ text: string; score: number }>> {
  // Generate embedding for query
  const queryResult = await generateEmbedding(query);

  // Find similar entries
  return findSimilar(queryResult.embedding, knowledgeBase, topK);
}

export default {
  generateEmbedding,
  generateEmbeddings,
  cosineSimilarity,
  findSimilar,
  chunkText,
  embedKnowledgeBaseEntry,
  semanticSearch
};
