import { MarketingContent, MarketingContentType } from '../types';
import { supabase } from './supabaseClient';
import { generateMarketingContent } from './openaiService';

export const mapMarketingContentRow = (row: Record<string, any>): MarketingContent => ({
  id: row.id,
  userId: row.user_id,
  contentType: row.content_type as MarketingContentType,
  title: row.title ?? '',
  content: row.content ?? '',
  metadata: row.metadata ?? {},
  createdAt: row.created_at ?? '',
});

export const buildMarketingTitle = (type: MarketingContentType, topic: string): string => {
  const trimmedTopic = topic.trim();
  const prefix = type.charAt(0).toUpperCase() + type.slice(1);
  return trimmedTopic ? `${prefix}: ${trimmedTopic}`.slice(0, 120) : `${prefix} Draft`;
};

export const marketingService = {
  async generateContent(params: {
    type: MarketingContentType;
    topic: string;
    tone: string;
    templateId?: string;
    templateContent?: string;
  }): Promise<MarketingContent> {
    // Use local AI service directly instead of non-existent edge function
    const contentText = await generateMarketingContent(params.type, params.topic, params.tone);

    const title = buildMarketingTitle(params.type, params.topic);
    const metadata = {
      tone: params.tone,
      topic: params.topic,
      templateId: params.templateId,
    };

    // Try to save to Supabase marketing_content table
    let savedContent: MarketingContent | null = null;

    try {
      if (supabase) {
        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id;

        if (userId) {
          const { data, error } = await supabase
            .from('marketing_content')
            .insert({
              user_id: userId,
              content_type: params.type,
              title,
              content: contentText,
              metadata,
            })
            .select()
            .single();

          if (!error && data) {
            savedContent = mapMarketingContentRow(data);
          }
        }
      }
    } catch (saveError) {
      console.warn('Failed to save marketing content to database:', saveError);
      // Continue without saving - we'll return the content anyway
    }

    // Return saved content or a temporary object
    if (savedContent) {
      return savedContent;
    }

    return {
      id: `temp-${Date.now()}`,
      userId: '',
      contentType: params.type,
      title,
      content: contentText,
      metadata,
      createdAt: new Date().toISOString(),
    };
  },

  async listContent(limit = 15): Promise<MarketingContent[]> {
    if (!supabase) {
      console.warn('Supabase is not configured.');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('marketing_content')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Failed to load marketing content:', error);
        return [];
      }

      return (data || []).map(mapMarketingContentRow);
    } catch (err) {
      console.warn('Error loading marketing content:', err);
      return [];
    }
  },
};
