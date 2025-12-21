import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResellerDashboard } from '../components/Reseller/ResellerDashboard';
import { PlanType, ResellerStats, User, UserRole } from '../types';

const mockResellerService = vi.hoisted(() => ({
  fetchReferrals: vi.fn().mockResolvedValue([]),
  fetchEarnings: vi.fn().mockResolvedValue([]),
  subscribeToReferrals: vi.fn().mockReturnValue(() => {}),
}));

vi.mock('../services/resellerService', () => ({
  resellerService: mockResellerService,
}));

// Recharts relies on ResizeObserver, which jsdom does not provide
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof global.ResizeObserver === 'undefined') {
  // @ts-expect-error - ResizeObserver not present in jsdom typings
  global.ResizeObserver = ResizeObserverMock;
}

const baseUser: User = {
  id: 'reseller-123',
  name: 'Reseller One',
  email: 'reseller@example.com',
  role: UserRole.RESELLER,
  plan: PlanType.PROFESSIONAL,
  companyName: 'Reseller Co',
  resellerCode: 'RES123',
};

const renderDashboard = (stats: ResellerStats) =>
  render(<ResellerDashboard user={baseUser} stats={stats} />);

describe('ResellerDashboard', () => {
  const initialStats: ResellerStats = {
    totalClients: 3,
    totalRevenue: 1234,
    commissionRate: 0.3,
    pendingPayout: 400,
    addOnCommission: 50,
    arrears: 10,
  };

  beforeEach(() => {
    mockResellerService.fetchReferrals.mockClear();
    mockResellerService.fetchEarnings.mockClear();
    mockResellerService.subscribeToReferrals.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the provided stats when no derived data is available', async () => {
    renderDashboard(initialStats);

    expect(await screen.findByText('$1,234')).toBeInTheDocument();
    expect(screen.getByText('Active Referrals').previousElementSibling?.textContent).toBe('3');
  });

  it('updates displayed stats when the parent provides new values', async () => {
    const { rerender } = renderDashboard(initialStats);

    const updatedStats: ResellerStats = {
      ...initialStats,
      totalClients: 5,
      totalRevenue: 2500,
      pendingPayout: 900,
    };

    rerender(<ResellerDashboard user={baseUser} stats={updatedStats} />);

    expect(await screen.findByText('$2,500')).toBeInTheDocument();
    expect(screen.getByText('Active Referrals').previousElementSibling?.textContent).toBe('5');
  });
});
