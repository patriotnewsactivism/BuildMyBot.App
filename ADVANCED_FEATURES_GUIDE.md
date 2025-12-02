# Advanced Features Guide

## 🚀 New Features Overview

This guide covers all the advanced features added to BuildMyBot.App:

1. **Rate Limiting & Security**
2. **Vector Embeddings & Semantic Search**
3. **Batch URL Scraping**
4. **Website Crawling**
5. **Sitemap Scraping**

---

## 1. Rate Limiting & Security 🔒

### Overview
Prevents API abuse by limiting requests per user/session. All AI operations (scraping, PDF processing, content generation) are now rate-limited.

### Configuration

```typescript
// services/rateLimiter.ts

// Pre-configured limiters:
- scraperRateLimiter: 10 requests/minute
- pdfRateLimiter: 5 uploads/minute
- aiGenerationRateLimiter: 20 requests/minute
- chatRateLimiter: 30 messages/minute
```

### Usage Example

```typescript
import { scrapeWebsiteContent } from './services/geminiService';

// Rate limiting is automatic
try {
  const content = await scrapeWebsiteContent('https://example.com', {
    userId: 'user123' // Optional: track by user ID
  });
} catch (error) {
  // Error message includes wait time:
  // "Rate limit exceeded. Please wait 45 seconds."
}
```

### Bypassing Rate Limits (Admin Only)

```typescript
const content = await scrapeWebsiteContent('https://example.com', {
  bypassRateLimit: true // Only for admin operations
});
```

### Creating Custom Rate Limiters

```typescript
import { createRateLimiter } from './services/rateLimiter';

const customLimiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 3600000, // 1 hour
  message: 'Custom rate limit message'
});

const check = customLimiter.checkLimit('user123');
if (!check.allowed) {
  console.log(`Wait ${(check.resetTime - Date.now()) / 1000}s`);
}
```

---

## 2. Vector Embeddings & Semantic Search 🔍

### Overview
Generate embeddings for knowledge base content to enable semantic search. Find relevant information based on meaning, not just keywords.

### Generating Embeddings

```typescript
import { generateEmbedding, embedKnowledgeBaseEntry } from './services/embeddingsService';

// Single text
const result = await generateEmbedding("What are your business hours?");
console.log(result.embedding); // 1536-dimensional vector
console.log(result.tokens); // Token count

// Knowledge base entry (auto-chunks large text)
const chunks = await embedKnowledgeBaseEntry(
  longDocumentText,
  { source: 'company-policy.pdf' },
  (stage) => console.log(stage)
);
```

### Semantic Search

```typescript
import { semanticSearch } from './services/embeddingsService';

// Search knowledge base
const results = await semanticSearch(
  "What are your refund policies?",
  knowledgeBaseWithEmbeddings,
  3 // Return top 3 matches
);

results.forEach(result => {
  console.log(`Score: ${result.score}`);
  console.log(`Text: ${result.text}`);
});
```

### Finding Similar Content

```typescript
import { cosineSimilarity, findSimilar } from './services/embeddingsService';

// Calculate similarity between two embeddings
const similarity = cosineSimilarity(embedding1, embedding2);
// Returns 0-1 (1 = identical, 0 = completely different)

// Find similar documents
const similar = findSimilar(
  queryEmbedding,
  [
    { text: "Doc 1", embedding: [0.1, 0.2, ...] },
    { text: "Doc 2", embedding: [0.3, 0.4, ...] }
  ],
  5 // Top 5 results
);
```

### Text Chunking

```typescript
import { chunkText } from './services/embeddingsService';

const chunks = chunkText(
  longDocument,
  2000, // Max 2000 chars per chunk
  200   // 200 char overlap between chunks
);
```

---

## 3. Batch URL Scraping 📦

### Overview
Scrape multiple URLs efficiently with progress tracking and error handling.

### Basic Batch Scraping

```typescript
import { batchScrapeUrls } from './services/batchScraperService';

const urls = [
  'https://example.com',
  'https://example.com/about',
  'https://example.com/contact'
];

const results = await batchScrapeUrls(
  urls,
  (progress) => {
    console.log(`${progress.completed}/${progress.total} completed`);
    console.log(`Success: ${progress.successful}, Failed: ${progress.failed}`);
    console.log(`Current: ${progress.currentUrl}`);
    console.log(`Stage: ${progress.stage}`);
  },
  {
    maxLength: 30000,
    delayBetweenRequests: 2000, // 2 second delay
    stopOnError: false, // Continue even if one fails
    userId: 'user123'
  }
);

// Process results
results.forEach(result => {
  if (result.success) {
    console.log(`✅ ${result.url}: ${result.contentSize} bytes`);
    console.log(result.data);
  } else {
    console.log(`❌ ${result.url}: ${result.error}`);
  }
});
```

### URL Cleaning & Validation

```typescript
import { cleanUrlList, extractUrlsFromText } from './services/batchScraperService';

// Clean and deduplicate URLs
const dirtyUrls = [
  'example.com',           // Missing protocol
  'https://example.com',   // Valid
  'https://example.com',   // Duplicate
  'invalid url',           // Invalid
  'https://test.com'       // Valid
];

const cleanUrls = cleanUrlList(dirtyUrls);
// Returns: ['https://example.com', 'https://test.com']

// Extract URLs from text
const text = "Visit https://example.com or www.test.com for more info";
const extractedUrls = extractUrlsFromText(text);
// Returns: ['https://example.com', 'https://www.test.com']
```

---

## 4. Website Crawling 🕷️

### Overview
Automatically discover and scrape linked pages from a starting URL.

### Crawl a Website

```typescript
import { crawlWebsite } from './services/batchScraperService';

const results = await crawlWebsite(
  'https://example.com',
  5, // Crawl up to 5 pages
  (progress) => {
    console.log(`Crawling: ${progress.currentUrl}`);
    console.log(`Progress: ${progress.completed}/${progress.total}`);
  },
  {
    maxLength: 30000,
    userId: 'user123'
  }
);

// Results include main page + linked pages
console.log(`Crawled ${results.length} pages`);
```

### Extract Links from Page

```typescript
import { extractLinksFromPage } from './services/batchScraperService';

// Get all internal links from a page
const links = await extractLinksFromPage(
  'https://example.com',
  20 // Max 20 links
);

console.log(`Found ${links.length} internal links`);
links.forEach(link => console.log(link));
```

---

## 5. Sitemap Scraping 🗺️

### Overview
Automatically scrape all pages listed in a website's sitemap.xml.

### Scrape from Sitemap

```typescript
import { scrapeSitemap } from './services/batchScraperService';

const results = await scrapeSitemap(
  'https://example.com/sitemap.xml',
  10, // Max 10 URLs from sitemap
  (progress) => {
    console.log(`Scraping from sitemap: ${progress.completed}/${progress.total}`);
    console.log(`Current: ${progress.currentUrl}`);
  },
  {
    maxLength: 30000,
    userId: 'user123'
  }
);

// Process all scraped pages
const successful = results.filter(r => r.success);
console.log(`Successfully scraped ${successful.length} pages from sitemap`);
```

---

## Integration Examples

### Complete Knowledge Base Building Workflow

```typescript
import { crawlWebsite } from './services/batchScraperService';
import { embedKnowledgeBaseEntry } from './services/embeddingsService';

// 1. Crawl website
console.log('Crawling website...');
const scrapeResults = await crawlWebsite('https://example.com', 10);

// 2. Generate embeddings for each page
console.log('Generating embeddings...');
const knowledgeBase = [];

for (const result of scrapeResults) {
  if (result.success && result.data) {
    const embedded = await embedKnowledgeBaseEntry(
      result.data,
      { source: result.url }
    );
    knowledgeBase.push(...embedded);
  }
}

console.log(`Knowledge base built with ${knowledgeBase.length} entries`);

// 3. Save to database (Supabase example)
import { supabase } from './supabaseClient';

for (const entry of knowledgeBase) {
  await supabase.from('knowledge_base').insert({
    bot_id: 'bot123',
    content: entry.text,
    embedding: entry.embedding,
    metadata: entry.metadata,
    source_type: 'url',
    source_url: entry.metadata.source
  });
}
```

### Smart Chatbot with Semantic Search

```typescript
import { semanticSearch } from './services/embeddingsService';
import { generateBotResponse } from './services/geminiService';

async function answerQuestion(question: string, knowledgeBase: any[]) {
  // 1. Find relevant context using semantic search
  const relevantDocs = await semanticSearch(question, knowledgeBase, 3);

  // 2. Build context from top matches
  const context = relevantDocs
    .map(doc => doc.text)
    .join('\n\n');

  // 3. Generate response with context
  const response = await generateBotResponse(
    "You are a helpful assistant. Answer based on the provided context.",
    [],
    question,
    'gpt-4o-mini',
    context
  );

  return {
    answer: response,
    sources: relevantDocs.map(doc => ({
      text: doc.text.substring(0, 200) + '...',
      score: doc.score
    }))
  };
}

// Usage
const result = await answerQuestion(
  "What are your refund policies?",
  knowledgeBaseWithEmbeddings
);

console.log(result.answer);
console.log('Sources:', result.sources);
```

---

## Performance Tips

### 1. Rate Limiting Best Practices

```typescript
// Batch operations automatically space out requests
// No need to manually add delays

// For high-volume operations, use longer delays
await batchScrapeUrls(urls, onProgress, {
  delayBetweenRequests: 5000 // 5 seconds between URLs
});
```

### 2. Embedding Generation Optimization

```typescript
// Generate embeddings in batches
import { generateEmbeddings } from './services/embeddingsService';

// Better: Batch processing
const results = await generateEmbeddings(
  [text1, text2, text3],
  (completed, total) => console.log(`${completed}/${total}`)
);

// Includes automatic 200ms delay between requests
```

### 3. Chunking Large Documents

```typescript
// For documents > 2000 characters, use chunking
const chunks = chunkText(largeDocument, 2000, 200);

// Embed each chunk separately
const embeddings = await Promise.all(
  chunks.map(chunk => generateEmbedding(chunk))
);
```

---

## Error Handling

### Graceful Degradation

```typescript
try {
  const results = await batchScrapeUrls(urls, onProgress, {
    stopOnError: false // Continue even if some fail
  });

  // Separate successful and failed
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Success: ${successful.length}, Failed: ${failed.length}`);

  // Retry failed URLs
  if (failed.length > 0) {
    const failedUrls = failed.map(r => r.url);
    // Retry logic here
  }
} catch (error) {
  console.error('Batch scraping failed:', error);
}
```

### Rate Limit Handling

```typescript
import { scraperRateLimiter, getSessionIdentifier } from './services/rateLimiter';

// Check before making request
const identifier = getSessionIdentifier('user123');
const check = scraperRateLimiter.checkLimit(identifier);

if (!check.allowed) {
  const waitSeconds = Math.ceil((check.resetTime - Date.now()) / 1000);
  alert(`Please wait ${waitSeconds} seconds before scraping again.`);
  return;
}

// Make request
console.log(`${check.remaining} requests remaining`);
await scrapeWebsiteContent(url);
```

---

## Database Integration

### Storing Embeddings in Supabase

Your database schema already supports embeddings:

```sql
-- services/embeddingsService.ts works with this schema
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY,
  bot_id UUID REFERENCES bots(id),
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 embeddings
  source_type TEXT,
  source_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
);

-- Vector search index (uses pgvector)
CREATE INDEX idx_kb_embedding ON knowledge_base
  USING ivfflat (embedding vector_cosine_ops);
```

### Querying with Embeddings

```typescript
// Generate query embedding
const queryEmbedding = await generateEmbedding(userQuestion);

// Search using Supabase (pgvector)
const { data, error } = await supabase.rpc('match_documents', {
  query_embedding: queryEmbedding.embedding,
  match_threshold: 0.7,
  match_count: 5
});
```

---

## Testing

All features include comprehensive error handling and can be tested using the test suite in `test-scraping.html`.

### Running Tests

1. Open `test-scraping.html` in a browser
2. Test individual features or run full suite
3. Monitor rate limits and error handling

---

## Production Considerations

### 1. API Keys
Ensure OpenAI API keys are configured:
```bash
VITE_OPENAI_API_KEY=your_key_here
```

### 2. Rate Limits
Current limits are conservative. Adjust based on your needs:
```typescript
export const scraperRateLimiter = new RateLimiter({
  maxRequests: 20, // Increase for production
  windowMs: 60000
});
```

### 3. Monitoring
Add logging and monitoring for production:
```typescript
// Log rate limit hits
const check = limiter.checkLimit(userId);
if (!check.allowed) {
  console.warn(`Rate limit hit for user ${userId}`);
  // Send to monitoring service
}
```

### 4. Costs
- **Scraping**: Free (Jina Reader)
- **Embeddings**: ~$0.0001 per 1K tokens (OpenAI ada-002)
- **AI Generation**: ~$0.00015 per 1K tokens (GPT-4o Mini)

---

## Summary

✅ **Rate Limiting**: Prevents abuse, tracks usage per user/session
✅ **Vector Embeddings**: Semantic search in knowledge base
✅ **Batch Scraping**: Scrape multiple URLs efficiently
✅ **Website Crawling**: Auto-discover and scrape linked pages
✅ **Sitemap Support**: Scrape all pages from sitemap.xml

All features are production-ready with comprehensive error handling, progress tracking, and graceful degradation.
