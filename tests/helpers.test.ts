import { describe, expect, it } from 'vitest';
import { isSafeHttpUrl, normalizeUrl } from '../services/helpers';

describe('isSafeHttpUrl', () => {
  it('allows standard https urls', () => {
    expect(isSafeHttpUrl('https://example.com')).toBe(true);
    expect(isSafeHttpUrl('example.com')).toBe(true);
  });

  it('blocks localhost and private networks', () => {
    expect(isSafeHttpUrl('http://localhost:3000')).toBe(false);
    expect(isSafeHttpUrl('http://127.0.0.1:8080')).toBe(false);
    expect(isSafeHttpUrl('http://10.0.0.1')).toBe(false);
    expect(isSafeHttpUrl('http://192.168.1.5')).toBe(false);
  });

  it('rejects unsupported protocols', () => {
    expect(isSafeHttpUrl('ftp://example.com')).toBe(false);
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('normalizeUrl', () => {
  it('adds https when protocol is missing', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
  });
});
