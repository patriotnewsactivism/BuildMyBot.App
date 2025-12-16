import { describe, expect, it } from 'vitest';
import { calculateLeadScore, extractLeadDetection, getScoreBand } from './leadCapture';

describe('leadCapture helpers', () => {
  it('extracts email and phone from mixed text', () => {
    const detection = extractLeadDetection('Hi, this is Sarah. Email sarah@example.com, phone (555) 123-4567');
    expect(detection?.email).toBe('sarah@example.com');
    expect(detection?.phone).toBe('5551234567');
    expect(detection?.name).toBe('Hi');
  });

  it('calculates higher scores for strong intent and contact info', () => {
    const score = calculateLeadScore({
      email: 'lead@example.com',
      phone: '+15551234567',
      transcript: 'I want to book a demo and pricing call next week',
    });

    expect(score).toBeGreaterThanOrEqual(80);
  });

  it('returns a sensible band for each score', () => {
    expect(getScoreBand(85)).toBe('Hot');
    expect(getScoreBand(70)).toBe('Warm');
    expect(getScoreBand(20)).toBe('Cold');
  });
});
