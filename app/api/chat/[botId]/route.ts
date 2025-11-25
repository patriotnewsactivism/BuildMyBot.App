import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateChatResponse } from '@/lib/openai';

/**
 * POST /api/chat/[botId] - Send a message to a bot
 *
 * SECURITY: This endpoint handles OpenAI calls server-side to protect API keys
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  try {
    const body = await request.json();
    const { message, conversationId, visitorId } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Fetch bot configuration
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', params.botId)
      .eq('active', true)
      .single();

    if (botError || !bot) {
      return NextResponse.json(
        { error: 'Bot not found or inactive' },
        { status: 404 }
      );
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      conversation = data;
    } else {
      const { data } = await supabase
        .from('conversations')
        .insert({
          bot_id: params.botId,
          visitor_id: visitorId,
          status: 'active',
        })
        .select()
        .single();
      conversation = data;
    }

    if (!conversation) {
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    // Save user message
    const { data: userMessage } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: message,
      })
      .select()
      .single();

    // Get conversation history for context
    const { data: messageHistory } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(20); // Last 20 messages for context

    // Prepare messages for OpenAI
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: bot.system_prompt },
      ...(messageHistory || []).map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
    ];

    // Generate AI response
    const aiResponse = await generateChatResponse(
      messages,
      bot.model,
      bot.temperature
    );

    // Save AI message
    const { data: assistantMessage } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: aiResponse,
      })
      .select()
      .single();

    // TODO: Extract lead information (email, phone) if present
    // TODO: Calculate sentiment score
    // TODO: Check for hot lead threshold

    return NextResponse.json({
      conversationId: conversation.id,
      message: aiResponse,
      messageId: assistantMessage?.id,
    });

  } catch (error: any) {
    console.error('Chat API error:', error);

    // Handle OpenAI specific errors
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
