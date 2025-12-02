import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbService } from '../services/dbService';
import { supabase } from '../services/supabaseClient';
import { Bot, Lead } from '../types';

// Mock Supabase client
vi.mock('../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe('dbService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveBot', () => {
    it('should save bot successfully', async () => {
      const mockBot: Bot = {
        id: 'bot-123',
        name: 'Test Bot',
        type: 'support',
        systemPrompt: 'You are a helpful assistant',
        model: 'gpt-4',
        temperature: 0.7,
        knowledgeBase: [],
        active: true,
        conversationsCount: 0,
      };

      const mockUser = { id: 'user-123' };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any);

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as any);

      const result = await dbService.saveBot(mockBot);

      expect(result).toEqual(mockBot);
      expect(supabase.from).toHaveBeenCalledWith('bots');
      expect(mockUpsert).toHaveBeenCalledWith({
        id: mockBot.id,
        owner_id: 'user-123',
        name: mockBot.name,
        type: mockBot.type,
        system_prompt: mockBot.systemPrompt,
        model: mockBot.model,
        temperature: mockBot.temperature,
        active: mockBot.active,
        theme_color: undefined,
        max_messages: undefined,
        randomize_identity: undefined,
        conversations_count: 0,
      });
    });

    it('should throw error when user not authenticated', async () => {
      const mockBot: Bot = {
        id: 'bot-123',
        name: 'Test Bot',
        type: 'support',
        systemPrompt: 'You are a helpful assistant',
        model: 'gpt-4',
        temperature: 0.7,
        knowledgeBase: [],
        active: true,
        conversationsCount: 0,
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      await expect(dbService.saveBot(mockBot)).rejects.toThrow(
        'User not authenticated'
      );
    });
  });

  describe('getBotById', () => {
    it('should retrieve bot by id', async () => {
      const mockBotData = {
        id: 'bot-123',
        name: 'Test Bot',
        type: 'support',
        system_prompt: 'You are a helpful assistant',
        model: 'gpt-4',
        temperature: 0.7,
        active: true,
        conversations_count: 5,
        theme_color: '#000000',
        max_messages: 100,
        randomize_identity: false,
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockBotData,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await dbService.getBotById('bot-123');

      expect(result).toEqual({
        id: 'bot-123',
        name: 'Test Bot',
        type: 'support',
        systemPrompt: 'You are a helpful assistant',
        model: 'gpt-4',
        temperature: 0.7,
        knowledgeBase: [],
        active: true,
        conversationsCount: 5,
        themeColor: '#000000',
        maxMessages: 100,
        randomizeIdentity: false,
      });

      expect(supabase.from).toHaveBeenCalledWith('bots');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 'bot-123');
    });

    it('should return undefined when bot not found', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Not found'),
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await dbService.getBotById('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('saveLead', () => {
    it('should save lead successfully', async () => {
      const mockLead: Lead = {
        id: 'lead-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        company: 'Acme Inc',
        score: 85,
        status: 'new',
        sourceBotId: 'bot-123',
        notes: 'Interested in product',
        createdAt: new Date().toISOString(),
      };

      const mockUser = { id: 'user-123' };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      } as any);

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as any);

      const result = await dbService.saveLead(mockLead);

      expect(result).toEqual(mockLead);
      expect(supabase.from).toHaveBeenCalledWith('leads');
      expect(mockUpsert).toHaveBeenCalledWith({
        id: mockLead.id,
        owner_id: 'user-123',
        name: mockLead.name,
        email: mockLead.email,
        phone: mockLead.phone,
        company: mockLead.company,
        score: mockLead.score,
        status: mockLead.status,
        source_bot_id: mockLead.sourceBotId,
        notes: mockLead.notes,
      });
    });
  });

  describe('getUserProfile', () => {
    it('should retrieve user profile', async () => {
      const mockUserData = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'owner',
        plan: 'pro',
        company_name: 'Test Company',
        custom_domain: null,
        reseller_code: null,
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await dbService.getUserProfile('user-123');

      expect(result).toEqual({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'owner',
        plan: 'pro',
        companyName: 'Test Company',
        customDomain: null,
        resellerCode: null,
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
      });
    });

    it('should return null when user not found', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Not found'),
      });

      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await dbService.getUserProfile('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateUserPlan', () => {
    it('should update user plan successfully', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await dbService.updateUserPlan('user-123', 'pro');

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockUpdate).toHaveBeenCalledWith({ plan: 'pro' });
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
    });
  });
});
