import { describe, expect, it } from 'vitest';
import { PLANS } from '../constants';
import { PlanType } from '../types';

describe('Pricing configuration', () => {
  it('keeps Enterprise tier at $499/mo with the correct allowances', () => {
    const enterprise = PLANS[PlanType.ENTERPRISE];

    expect(enterprise.price).toBe(499);
    expect(enterprise.conversations).toBeGreaterThanOrEqual(100000);
    expect(enterprise.features).toContain('Full white-label (domains, emails, branding)');
    expect(enterprise.features).toContain('$0.01 per overage conversation');
  });
});
