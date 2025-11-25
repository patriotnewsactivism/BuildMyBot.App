import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/auth';

/**
 * GET /api/knowledge-base/files
 *
 * List knowledge base files for a bot
 */
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  try {
    const url = new URL(request.url);
    const botId = url.searchParams.get('botId');

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
      .select('id')
      .eq('id', botId)
      .eq('user_id', user.id)
      .single();

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot not found or access denied' },
        { status: 404 }
      );
    }

    // Get files
    const { data: files, error } = await supabase
      .from('knowledge_base_files')
      .select('*')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch files' },
        { status: 500 }
      );
    }

    return NextResponse.json({ files: files || [] });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/knowledge-base/files
 *
 * Delete a knowledge base file
 */
export async function DELETE(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  try {
    const url = new URL(request.url);
    const fileId = url.searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get file info and verify ownership
    const { data: file } = await supabase
      .from('knowledge_base_files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (!file) {
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      );
    }

    // Delete chunks
    await supabase
      .from('knowledge_base_chunks')
      .delete()
      .eq('file_id', fileId);

    // Delete file record
    await supabase
      .from('knowledge_base_files')
      .delete()
      .eq('id', fileId);

    // Delete from storage
    if (file.storage_path) {
      await supabase.storage
        .from('knowledge-base')
        .remove([file.storage_path]);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
