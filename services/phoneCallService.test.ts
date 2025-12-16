import { vi, describe, expect, it, beforeEach } from 'vitest';
import { mergeTranscriptEntries, normalizeCallStatus, phoneCallService } from './phoneCallService';

const { insertSpy, fromSpy, selectSingle } = vi.hoisted(() => {
  const single = vi.fn();
  const insert = vi.fn(() => ({ select: () => ({ single }) }));
  const from = vi.fn(() => ({ insert }));
  return { insertSpy: insert, fromSpy: from, selectSingle: single };
});

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: fromSpy,
  },
}));

describe('phoneCallService helpers', () => {
  it('normalizes call statuses from Twilio variants', () => {
    expect(normalizeCallStatus('ringing')).toBe('initiated');
    expect(normalizeCallStatus('in-progress')).toBe('in-progress');
    expect(normalizeCallStatus('completed')).toBe('completed');
    expect(normalizeCallStatus('failed')).toBe('failed');
    expect(normalizeCallStatus('unknown')).toBe('initiated');
  });

  it('merges transcript entries gracefully', () => {
    expect(mergeTranscriptEntries('Hello', 'World')).toBe('Hello\nWorld');
    expect(mergeTranscriptEntries(undefined, 'World')).toBe('World');
    expect(mergeTranscriptEntries('Only current', undefined)).toBe('Only current');
    expect(mergeTranscriptEntries(undefined, undefined)).toBeNull();
  });
});

describe('phoneCallService.simulateInboundCall', () => {
  beforeEach(() => {
    fromSpy.mockClear();
    insertSpy.mockClear();
    selectSingle.mockClear();
    selectSingle.mockResolvedValue({
      data: {
        id: 'call-1',
        user_id: 'user-1',
        status: 'completed',
        metadata: {},
      },
      error: null,
    });
  });

  it('inserts a simulated call through Supabase', async () => {
    const result = await phoneCallService.simulateInboundCall({
      userId: 'user-1',
      fromNumber: '+14155550123',
      status: 'completed',
    });

    expect(fromSpy).toHaveBeenCalledWith('phone_calls');
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        from_number: '+14155550123',
      }),
    );
    expect(result).toHaveProperty('data');
    expect(result && 'data' in result && result.data?.status).toBe('completed');
  });
});
