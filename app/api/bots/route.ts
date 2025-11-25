import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, requireAuth, checkPlanLimits } from '@/lib/auth';

/**
 * GET /api/bots - List all bots for authenticated user
 */
export async function GET(request: NextRequest) {
  // Require authentication
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user; // Return 401 if not authenticated

  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('bots')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
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
 * POST /api/bots - Create a new bot (with plan limit checks)
 */
export async function POST(request: NextRequest) {
  // Require authentication
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user; // Return 401 if not authenticated

  try {
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

    // Check plan limits
    const limits = await checkPlanLimits(user.id, 'bots');
    if (!limits.allowed) {
      return NextResponse.json(
        {
          error: 'Bot limit reached',
          message: `You've reached your plan limit of ${limits.limit} bots. Please upgrade to create more.`,
          current: limits.current,
          limit: limits.limit,
        },
        { status: 403 }
      );
    }

    // Create bot
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('bots')
      .insert({
        user_id: user.id,
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
