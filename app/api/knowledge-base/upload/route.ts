import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/auth';

/**
 * POST /api/knowledge-base/upload
 *
 * Upload a file to knowledge base and process it
 */
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const botId = formData.get('botId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!botId) {
      return NextResponse.json(
        { error: 'Bot ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Verify bot ownership
    const { data: bot } = await supabase
      .from('bots')
      .select('id, user_id')
      .eq('id', botId)
      .eq('user_id', user.id)
      .single();

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot not found or access denied' },
        { status: 404 }
      );
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not supported. Please upload PDF, DOCX, TXT, or MD files.' },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const fileName = `${user.id}/${botId}/${Date.now()}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('knowledge-base')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get file URL
    const { data: urlData } = supabase.storage
      .from('knowledge-base')
      .getPublicUrl(fileName);

    // Extract text from file
    const text = await extractText(file);

    // Create knowledge base file record
    const { data: kbFile, error: kbError } = await supabase
      .from('knowledge_base_files')
      .insert({
        user_id: user.id,
        bot_id: botId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: fileName,
        file_url: urlData.publicUrl,
        content: text,
        status: 'processing',
      })
      .select()
      .single();

    if (kbError) {
      console.error('Database error:', kbError);
      return NextResponse.json(
        { error: 'Failed to save file record' },
        { status: 500 }
      );
    }

    // Process file asynchronously (chunk + embed)
    processKnowledgeBaseFile(kbFile.id, text).catch(err => {
      console.error('Background processing error:', err);
    });

    return NextResponse.json({
      file: {
        id: kbFile.id,
        name: file.name,
        type: file.type,
        size: file.size,
        status: 'processing',
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

/**
 * Extract text from different file types
 */
async function extractText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder().decode(buffer);

  // For now, just return raw text
  // TODO: Add proper PDF/DOCX parsing libraries
  // - pdf-parse for PDFs
  // - mammoth for DOCX

  if (file.type === 'text/plain' || file.type === 'text/markdown') {
    return text;
  }

  if (file.type === 'application/pdf') {
    // TODO: Use pdf-parse library
    return '[PDF parsing not yet implemented - please use TXT files for now]';
  }

  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // TODO: Use mammoth library
    return '[DOCX parsing not yet implemented - please use TXT files for now]';
  }

  return text;
}

/**
 * Process file: chunk text and create embeddings
 */
async function processKnowledgeBaseFile(fileId: string, text: string) {
  const supabase = createServerSupabaseClient();

  try {
    // Chunk the text (500-1000 chars per chunk)
    const chunks = chunkText(text, 800);

    // Generate embeddings for each chunk
    const { openai } = await import('@/lib/openai');

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk,
      });

      const embedding = embeddingResponse.data[0].embedding;

      // Save chunk with embedding
      await supabase.from('knowledge_base_chunks').insert({
        file_id: fileId,
        content: chunk,
        chunk_index: i,
        embedding: JSON.stringify(embedding), // PostgreSQL array
      });
    }

    // Update file status to completed
    await supabase
      .from('knowledge_base_files')
      .update({
        status: 'completed',
        chunks_count: chunks.length,
      })
      .eq('id', fileId);

  } catch (error) {
    console.error('Processing error:', error);

    // Update file status to failed
    await supabase
      .from('knowledge_base_files')
      .update({ status: 'failed' })
      .eq('id', fileId);
  }
}

/**
 * Chunk text into smaller pieces
 */
function chunkText(text: string, chunkSize: number = 800): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+\s+/);

  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}
