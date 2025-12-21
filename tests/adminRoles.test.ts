import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRole, PlanType } from '../types';

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: fromMock,
  },
}));

import { dbService } from '../services/dbService';

describe('dbService.setUserRoleByEmail', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('updates a user role when the email exists', async () => {
    const existingProfile = {
      id: 'user-123',
      email: 'admin@example.com',
      role: UserRole.OWNER,
      plan: PlanType.FREE,
      company_name: 'Example Co',
      name: 'Admin User',
    };

    const updatedProfile = { ...existingProfile, role: UserRole.ADMIN };

    const selectBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [existingProfile], error: null }),
    } as const;

    const updateBuilder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [updatedProfile], error: null }),
    } as const;

    fromMock.mockReturnValueOnce(selectBuilder).mockReturnValueOnce(updateBuilder);

    const result = await dbService.setUserRoleByEmail('Admin@Example.com', UserRole.ADMIN);

    expect(result?.role).toBe(UserRole.ADMIN);
    expect(selectBuilder.eq).toHaveBeenCalledWith('email', 'admin@example.com');
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', existingProfile.id);
  });

  it('returns null when no profile matches the email', async () => {
    const selectBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as const;

    fromMock.mockReturnValueOnce(selectBuilder);

    const result = await dbService.setUserRoleByEmail('missing@example.com', UserRole.BETA_TESTER);

    expect(result).toBeNull();
    expect(fromMock).toHaveBeenCalledTimes(1);
  });
});
