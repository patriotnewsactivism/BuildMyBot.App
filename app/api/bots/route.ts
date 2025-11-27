import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/bots - List all bots for a user
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Get user ID from session/JWT
    const userId = request.headers.get('x-user-id') || 'u1'; // Mock for now

    const { data, error } = await supabase
      .from('bots')
      .select('*')
      .eq('user_id', userId)
      .eq('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bots' },
        { status: 500 }
      );
    }

    return NextResponse.json({ bots: data || [] });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bots - Create a new bot
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Get user ID from session/JWT
    const userId = request.headers.get('x-user-id') || 'u1'; // Mock for now

    const body = await request.json();
    const {
      name,
      type,
      systemPrompt,
      model = 'gpt-4o-mini',
      temperature = 0.7,
      themeColor = '#1e3a8a',
      maxMessages = 20,
      randomizeIdentity = false,
      avatar,
      initialGreeting,
      initialDelay,
      leadCapturePrompt,
      emailCapture,
      phoneCapture,
      webhookUrl,
      hotLeadThreshold,
    } = body;

    // Validate required fields
    if (!name || !type || !systemPrompt) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, systemPrompt' },
        { status: 400 }
      );
    }

    // TODO: Check plan limits (how many bots user can create)

    // Create bot
    const { data, error } = await supabase
      .from('bots')
      .insert({
        user_id: userId,
        name,
        type,
        system_prompt: systemPrompt,
        model,
        temperature,
        theme_color: themeColor,
        max_messages: maxMessages,
        randomize_identity: randomizeIdentity,
        avatar,
        initial_greeting: initialGreeting,
        initial_delay: initialDelay,
        lead_capture_prompt: leadCapturePrompt,
        email_capture: emailCapture,
        phone_capture: phoneCapture,
        webhook_url: webhookUrl,
        hot_lead_threshold: hotLeadThreshold,
        active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create bot' },
        { status: 500 }
      );
    }

    return NextResponse.json({ bot: data }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
