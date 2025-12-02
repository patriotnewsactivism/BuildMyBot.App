import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';

// Mock Supabase client
vi.mock('../services/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
    })),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signUp', () => {
    it('should sign up a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockData = {
        user: mockUser,
        session: { access_token: 'token' },
      };

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: mockData,
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({ error: null }),
      } as any);

      const result = await authService.signUp('test@example.com', 'password123', {
        name: 'Test User',
      });

      expect(result).toEqual(mockData);
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: { name: 'Test User' },
        },
      });
    });

    it('should throw error when signup fails', async () => {
      const mockError = new Error('Signup failed');

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      } as any);

      await expect(
        authService.signUp('test@example.com', 'password123')
      ).rejects.toThrow('Signup failed');
    });
  });

  describe('signIn', () => {
    it('should sign in user successfully', async () => {
      const mockData = {
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'token' },
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: mockData,
        error: null,
      } as any);

      const result = await authService.signIn('test@example.com', 'password123');

      expect(result).toEqual(mockData);
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should throw error when signin fails', async () => {
      const mockError = new Error('Invalid credentials');

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      } as any);

      await expect(
        authService.signIn('test@example.com', 'wrong-password')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null,
      } as any);

      await expect(authService.signOut()).resolves.not.toThrow();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any);

      const result = await authService.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(supabase.auth.getUser).toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      } as any);

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
        data: {},
        error: null,
      } as any);

      await expect(
        authService.resetPassword('test@example.com')
      ).resolves.not.toThrow();

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com'
      );
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as any);

      await expect(
        authService.updatePassword('newpassword123')
      ).resolves.not.toThrow();

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123',
      });
    });
  });
});
