import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth';

/**
 * POST /api/phone/status
 *
 * Twilio webhook for call status updates
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const callDuration = formData.get('CallDuration') as string;

    if (!callSid) {
      return NextResponse.json({ error: 'CallSid required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Update call record
    await supabase
      .from('phone_calls')
      .update({
        status: callStatus,
        duration: callDuration ? parseInt(callDuration) : null,
        ended_at: ['completed', 'failed', 'busy', 'no-answer'].includes(callStatus)
          ? new Date().toISOString()
          : null,
      })
      .eq('call_sid', callSid);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
