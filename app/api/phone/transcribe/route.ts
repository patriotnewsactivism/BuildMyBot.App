import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth';

/**
 * POST /api/phone/transcribe
 *
 * Twilio webhook for transcription completion
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const callId = url.searchParams.get('callId');

    if (!callId) {
      return NextResponse.json({ error: 'Call ID required' }, { status: 400 });
    }

    const formData = await request.formData();
    const transcriptionText = formData.get('TranscriptionText') as string;
    const transcriptionSid = formData.get('TranscriptionSid') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;

    // Save transcription to database
    const supabase = createServerSupabaseClient();
    await supabase
      .from('phone_calls')
      .update({
        transcription: transcriptionText,
        transcription_sid: transcriptionSid,
        recording_url: recordingUrl,
      })
      .eq('id', callId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Failed to save transcription' }, { status: 500 });
  }
}
