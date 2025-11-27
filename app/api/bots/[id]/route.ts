import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/bots/[id] - Get a specific bot
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id') || 'u1'; // Mock for now

    const { data, error } = await supabase
      .from('bots')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .eq('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ bot: data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/bots/[id] - Update a bot
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id') || 'u1'; // Mock for now
    const body = await request.json();

    // Remove fields that shouldn't be updated
    const { id, user_id, created_at, ...updateData } = body;

    // Convert camelCase to snake_case for database
    const dbUpdateData: any = {};
    Object.keys(updateData).forEach(key => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      dbUpdateData[snakeKey] = updateData[key];
    });

    const { data, error } = await supabase
      .from('bots')
      .update(dbUpdateData)
      .eq('id', params.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Failed to update bot' },
        { status: 500 }
      );
    }

    return NextResponse.json({ bot: data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bots/[id] - Soft delete a bot
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id') || 'u1'; // Mock for now

    const { error } = await supabase
      .from('bots')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete bot' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
