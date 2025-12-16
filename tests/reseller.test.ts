import { describe, expect, it } from 'vitest';
import { computeResellerStats } from '../utils/reseller';
import { ReferralRecord, ResellerEarning } from '../types';

const referrals: ReferralRecord[] = [
  {
    id: 'r1',
    resellerId: 'reseller-1',
    referredUserId: 'user-1',
    code: 'ABC123',
    status: 'active',
    createdAt: new Date().toISOString(),
    clientProfile: {
      id: 'user-1',
      name: 'Acme',
      email: 'owner@acme.com',
      companyName: 'Acme Co',
      plan: 'PROFESSIONAL',
    },
  },
  {
    id: 'r2',
    resellerId: 'reseller-1',
    referredUserId: 'user-2',
    code: 'ABC123',
    status: 'active',
    createdAt: new Date().toISOString(),
    clientProfile: {
      id: 'user-2',
      name: 'Beacon',
      email: 'hello@beacon.com',
      companyName: 'Beacon',
      plan: 'STARTER',
    },
  },
];

const earnings: ResellerEarning[] = [
  {
    id: 'e1',
    resellerId: 'reseller-1',
    customerId: 'user-1',
    amount: 120,
    commissionRate: 0.3,
    status: 'pending',
    periodStart: '2024-12-01',
    periodEnd: '2024-12-31',
  },
  {
    id: 'e2',
    resellerId: 'reseller-1',
    customerId: 'user-2',
    amount: 99,
    commissionRate: 0.3,
    status: 'paid',
    periodStart: '2024-11-01',
    periodEnd: '2024-11-30',
    paidAt: '2024-12-05',
  },
];

describe('computeResellerStats', () => {
  it('calculates stats from earnings when available', () => {
    const stats = computeResellerStats(referrals, earnings);

    expect(stats.totalClients).toBe(2);
    expect(stats.totalRevenue).toBe(219);
    expect(stats.pendingPayout).toBeCloseTo(120 * 0.3);
    expect(stats.commissionRate).toBeGreaterThan(0);
  });

  it('falls back to plan pricing when no earnings exist', () => {
    const stats = computeResellerStats(referrals, []);

    expect(stats.totalRevenue).toBeGreaterThan(0);
    expect(stats.pendingPayout).toBe(stats.totalRevenue * stats.commissionRate);
  });
});
