import { supabase } from './supabaseClient';
import { CallStatus, PhoneCall } from '../types';

export interface SimulatedCallInput {
  userId: string;
  botId?: string;
  toNumber?: string;
  fromNumber: string;
  transcript?: string;
  durationSeconds?: number;
  status?: CallStatus;
  metadata?: Record<string, unknown>;
}

export const normalizeCallStatus = (status: string | null | undefined): CallStatus => {
  const normalized = (status || '').toLowerCase();
  if (["ringing", "queued", "initiated", "pending"].includes(normalized)) return "initiated";
  if (["in-progress", "answered", "bridged"].includes(normalized)) return "in-progress";
  if (["completed", "busy", "no-answer"].includes(normalized)) return "completed";
  if (["failed", "canceled", "declined"].includes(normalized)) return "failed";
  return "initiated";
};

export const mergeTranscriptEntries = (current?: string | null, incoming?: string | null) => {
  const existing = current?.trim();
  const next = incoming?.trim();
  if (existing && next) return `${existing}\n${next}`;
  return next || existing || null;
};

const mapCallRecord = (record: Record<string, unknown>): PhoneCall => ({
  id: String(record.id),
  userId: String(record.user_id),
  botId: (record.bot_id as string | null) ?? null,
  twilioCallSid: (record.twilio_call_sid as string | null) ?? null,
  fromNumber: (record.from_number as string | null) ?? null,
  toNumber: (record.to_number as string | null) ?? null,
  status: normalizeCallStatus(record.status as string | null),
  durationSeconds: (record.duration_seconds as number | null) ?? null,
  recordingUrl: (record.recording_url as string | null) ?? null,
  transcript: (record.transcript as string | null) ?? null,
  metadata: (record.metadata as Record<string, unknown> | null) ?? {},
  leadId: (record.lead_id as string | null) ?? null,
  createdAt: record.created_at as string | undefined,
  endedAt: (record.ended_at as string | null) ?? null,
});

export const phoneCallService = {
  subscribeToUserPhoneCalls: (
    userId: string,
    onUpdate: (calls: PhoneCall[]) => void,
    onError?: (message: string) => void,
  ) => {
    const client = supabase;
    if (!client) {
      onError?.('Supabase client not configured. Phone call updates are unavailable.');
      return () => {};
    }

    const fetchCalls = async () => {
      const { data, error } = await client
        .from('phone_calls')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        onError?.('Unable to load phone calls at the moment.');
        return;
      }

      if (data) {
        onUpdate(data.map((call) => mapCallRecord(call as Record<string, unknown>)));
      }
    };

    fetchCalls();

    const channel = client
      .channel(`public:phone_calls:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'phone_calls', filter: `user_id=eq.${userId}` },
        () => fetchCalls(),
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  },

  simulateInboundCall: async (input: SimulatedCallInput) => {
    const client = supabase;
    if (!client) {
      return { error: new Error('Supabase client not configured') } as const;
    }

    const {
      userId,
      botId,
      toNumber,
      fromNumber,
      transcript,
      durationSeconds,
      status,
      metadata,
    } = input;

    const simulatedStatus = normalizeCallStatus(status || 'completed');
    const callSid = `SIM-${crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10)}`;

    const { data, error } = await client
      .from('phone_calls')
      .insert({
        user_id: userId,
        bot_id: botId || null,
        twilio_call_sid: callSid,
        from_number: fromNumber,
        to_number: toNumber || null,
        status: simulatedStatus,
        duration_seconds: durationSeconds ?? null,
        transcript: transcript ?? null,
        metadata: { ...(metadata || {}), simulated: true },
      })
      .select()
      .single();

    if (error || !data) {
      return { error: new Error('Failed to log simulated call') } as const;
    }

    return { data: mapCallRecord(data as Record<string, unknown>) } as const;
  },
};
