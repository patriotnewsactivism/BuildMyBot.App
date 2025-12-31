import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbService } from '../dbService';
import { supabase } from '../supabaseClient';
import { Bot, PlanType, UserRole } from '../../types';

// Mock the Supabase client
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn()
  }
}));

describe('dbService.saveBot', () => {
  const mockUser = {
    id: 'test-user-id-123',
    email: 'test@example.com'
  };

  const mockBot: Bot = {
    id: 'new',
    name: 'Test Bot',
    type: 'Custom',
    systemPrompt: 'You are a helpful assistant.',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    knowledgeBase: [],
    active: true,
    conversationsCount: 0,
    themeColor: '#3b82f6'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should throw error if user is not authenticated', async () => {
      // Mock auth failure
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null
      });

      await expect(dbService.saveBot(mockBot)).rejects.toThrow('Cannot save bot: User not logged in');
    });

    it('should throw error if auth check fails', async () => {
      // Mock auth error
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth failed' }
      });

      await expect(dbService.saveBot(mockBot)).rejects.toThrow('Authentication failed');
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      // Setup valid auth for validation tests
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
    });

    it('should throw error if bot name is empty', async () => {
      const invalidBot = { ...mockBot, name: '' };

      await expect(dbService.saveBot(invalidBot)).rejects.toThrow('Bot name is required');
    });

    it('should throw error if bot name is only whitespace', async () => {
      const invalidBot = { ...mockBot, name: '   ' };

      await expect(dbService.saveBot(invalidBot)).rejects.toThrow('Bot name is required');
    });

    it('should throw error if system prompt is empty', async () => {
      const invalidBot = { ...mockBot, systemPrompt: '' };

      await expect(dbService.saveBot(invalidBot)).rejects.toThrow('System prompt is required');
    });

    it('should throw error if system prompt is only whitespace', async () => {
      const invalidBot = { ...mockBot, systemPrompt: '   ' };

      await expect(dbService.saveBot(invalidBot)).rejects.toThrow('System prompt is required');
    });

    it('should throw error if temperature is below 0', async () => {
      const invalidBot = { ...mockBot, temperature: -0.5 };

      await expect(dbService.saveBot(invalidBot)).rejects.toThrow('Temperature must be between 0 and 2');
    });

    it('should throw error if temperature is above 2', async () => {
      const invalidBot = { ...mockBot, temperature: 2.5 };

      await expect(dbService.saveBot(invalidBot)).rejects.toThrow('Temperature must be between 0 and 2');
    });

    it('should accept temperature of 0', async () => {
      const validBot = { ...mockBot, temperature: 0 };

      const mockUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...validBot, user_id: mockUser.id },
            error: null
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        upsert: mockUpsert
      });

      await dbService.saveBot(validBot);
      expect(mockUpsert).toHaveBeenCalled();
    });

    it('should accept temperature of 2', async () => {
      const validBot = { ...mockBot, temperature: 2 };

      const mockUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...validBot, user_id: mockUser.id },
            error: null
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        upsert: mockUpsert
      });

      await dbService.saveBot(validBot);
      expect(mockUpsert).toHaveBeenCalled();
    });
  });

  describe('creating new bot', () => {
    beforeEach(() => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
    });

    it('should save a new bot with generated ID', async () => {
      const newBot = { ...mockBot, id: 'new' };
      const savedBotId = 'generated-uuid-123';

      const mockUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: savedBotId,
              name: newBot.name,
              type: newBot.type,
              system_prompt: newBot.systemPrompt,
              model: newBot.model,
              temperature: newBot.temperature,
              knowledge_base: newBot.knowledgeBase,
              active: newBot.active,
              conversations_count: newBot.conversationsCount,
              theme_color: newBot.themeColor,
              user_id: mockUser.id
            },
            error: null
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        upsert: mockUpsert
      });

      const result = await dbService.saveBot(newBot);

      // Verify the upsert was called
      expect(mockUpsert).toHaveBeenCalled();
      const upsertCall = mockUpsert.mock.calls[0];

      // Verify that id was removed for new bots (so database generates it)
      expect(upsertCall[0]).not.toHaveProperty('id');

      // Verify user_id was added
      expect(upsertCall[0]).toHaveProperty('user_id', mockUser.id);

      // Verify result is converted to camelCase
      expect(result.id).toBe(savedBotId);
      expect(result.name).toBe(newBot.name);
      expect(result.systemPrompt).toBe(newBot.systemPrompt);
    });

    it('should attach user_id to the bot', async () => {
      const mockUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'bot-123',
              user_id: mockUser.id,
              name: mockBot.name,
              system_prompt: mockBot.systemPrompt,
              model: mockBot.model,
              temperature: mockBot.temperature,
              knowledge_base: [],
              active: true,
              conversations_count: 0,
              theme_color: mockBot.themeColor
            },
            error: null
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        upsert: mockUpsert
      });

      await dbService.saveBot(mockBot);

      // Verify user_id was set in the payload
      const payload = mockUpsert.mock.calls[0][0];
      expect(payload.user_id).toBe(mockUser.id);
    });
  });

  describe('updating existing bot', () => {
    beforeEach(() => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
    });

    it('should update an existing bot', async () => {
      const existingBot = { ...mockBot, id: 'existing-bot-123', name: 'Updated Bot' };

      const mockUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: existingBot.id,
              name: existingBot.name,
              user_id: mockUser.id,
              system_prompt: existingBot.systemPrompt,
              model: existingBot.model,
              temperature: existingBot.temperature,
              knowledge_base: existingBot.knowledgeBase,
              active: existingBot.active,
              conversations_count: existingBot.conversationsCount,
              theme_color: existingBot.themeColor
            },
            error: null
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        upsert: mockUpsert
      });

      const result = await dbService.saveBot(existingBot);

      // Verify the upsert was called with the bot ID
      const payload = mockUpsert.mock.calls[0][0];
      expect(payload.id).toBe(existingBot.id);

      // Verify result
      expect(result.id).toBe(existingBot.id);
      expect(result.name).toBe(existingBot.name);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
    });

    it('should handle permission denied error', async () => {
      const mockUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '42501', message: 'permission denied' }
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        upsert: mockUpsert
      });

      await expect(dbService.saveBot(mockBot)).rejects.toThrow('Permission denied');
    });

    it('should handle bot not found error', async () => {
      const mockUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'not found' }
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        upsert: mockUpsert
      });

      await expect(dbService.saveBot(mockBot)).rejects.toThrow("Bot not found or you don't have permission");
    });

    it('should handle user profile not found error', async () => {
      const mockUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '23503', message: 'foreign key violation' }
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        upsert: mockUpsert
      });

      await expect(dbService.saveBot(mockBot)).rejects.toThrow('User profile not found');
    });

    it('should handle duplicate ID error', async () => {
      const mockUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'duplicate key' }
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        upsert: mockUpsert
      });

      await expect(dbService.saveBot(mockBot)).rejects.toThrow('A bot with this ID already exists');
    });
  });

  describe('data transformation', () => {
    beforeEach(() => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
    });

    it('should convert camelCase to snake_case for database', async () => {
      const mockUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'bot-123',
              user_id: mockUser.id,
              name: mockBot.name,
              system_prompt: mockBot.systemPrompt,
              model: mockBot.model,
              temperature: mockBot.temperature,
              knowledge_base: mockBot.knowledgeBase,
              active: mockBot.active,
              conversations_count: mockBot.conversationsCount,
              theme_color: mockBot.themeColor
            },
            error: null
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        upsert: mockUpsert
      });

      await dbService.saveBot(mockBot);

      const payload = mockUpsert.mock.calls[0][0];

      // Verify snake_case conversion
      expect(payload).toHaveProperty('system_prompt');
      expect(payload).toHaveProperty('knowledge_base');
      expect(payload).toHaveProperty('conversations_count');
      expect(payload).toHaveProperty('theme_color');

      // Should NOT have camelCase keys
      expect(payload).not.toHaveProperty('systemPrompt');
      expect(payload).not.toHaveProperty('knowledgeBase');
      expect(payload).not.toHaveProperty('conversationsCount');
      expect(payload).not.toHaveProperty('themeColor');
    });

    it('should convert snake_case response to camelCase', async () => {
      const mockUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'bot-123',
              user_id: mockUser.id,
              name: 'Test Bot',
              system_prompt: 'You are helpful',
              model: 'gpt-4o-mini',
              temperature: 0.7,
              knowledge_base: ['doc1', 'doc2'],
              active: true,
              conversations_count: 5,
              theme_color: '#3b82f6'
            },
            error: null
          })
        })
      });

      (supabase.from as any).mockReturnValue({
        upsert: mockUpsert
      });

      const result = await dbService.saveBot(mockBot);

      // Verify camelCase conversion
      expect(result).toHaveProperty('systemPrompt', 'You are helpful');
      expect(result).toHaveProperty('knowledgeBase');
      expect(result.knowledgeBase).toEqual(['doc1', 'doc2']);
      expect(result).toHaveProperty('conversationsCount', 5);
      expect(result).toHaveProperty('themeColor', '#3b82f6');
    });
  });
});
