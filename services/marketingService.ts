import { MarketingContent, MarketingContentType } from '../types';
import { edgeFunctions } from './edgeFunctions';
import { supabase } from './supabaseClient';

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
    const response = await edgeFunctions.aiCompleteMarketing({
      variant: params.type,
      topic: params.topic,
      tone: params.tone,
      templateId: params.templateId,
      templateContent: params.templateContent,
      title: buildMarketingTitle(params.type, params.topic),
    });

    if (response.marketingContent) {
      return mapMarketingContentRow(response.marketingContent);
    }

    return {
      id: '',
      userId: '',
      contentType: params.type,
      title: buildMarketingTitle(params.type, params.topic),
      content: response.message,
      metadata: {
        tone: params.tone,
        topic: params.topic,
        templateId: params.templateId,
      },
      createdAt: '',
    };
  },

  async listContent(limit = 15): Promise<MarketingContent[]> {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please set your environment variables.');
    }

    const { data, error } = await supabase
      .from('marketing_content')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data || []).map(mapMarketingContentRow);
  },
};
