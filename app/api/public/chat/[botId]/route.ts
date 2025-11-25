import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth';
import { generateChatResponse } from '@/lib/openai';

/**
 * POST /api/public/chat/[botId] - Public chat endpoint for website visitors
 *
 * This endpoint is called by the embed widget to send/receive messages.
 * No authentication required as it's used by anonymous website visitors.
 *
 * Features:
 * - Creates/continues conversations
 * - Logs all messages to database
 * - Extracts leads (email/phone)
 * - Calculates sentiment scores
 * - Enforces usage limits
 * - Triggers webhooks for hot leads
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  try {
    const body = await request.json();
    const { message, conversationId, visitorId, metadata } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 1. Fetch bot configuration
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', params.botId)
      .eq('active', true)
      .is('deleted_at', null)
      .single();

    if (botError || !bot) {
      return NextResponse.json(
        { error: 'Bot not found or inactive' },
        { status: 404 }
      );
    }

    // 2. Check usage limits for this bot's owner
    const usageCheck = await checkUsageLimits(supabase, bot.user_id);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: 'Usage limit exceeded', message: 'This bot has reached its conversation limit. Please contact the owner.' },
        { status: 429 }
      );
    }

    // 3. Get or create conversation
    let conversation;
    if (conversationId) {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      conversation = data;
    }

    if (!conversation) {
      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          bot_id: params.botId,
          user_id: bot.user_id,
          visitor_id: visitorId,
          status: 'active',
          url: metadata?.url,
          referrer: metadata?.referrer,
          user_agent: metadata?.userAgent,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create conversation:', error);
        return NextResponse.json(
          { error: 'Failed to create conversation' },
          { status: 500 }
        );
      }

      conversation = data;
    }

    // 4. Save user message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: message,
    });

    // 5. Extract potential lead information from message
    const leadInfo = extractLeadInfo(message);
    if (leadInfo.email || leadInfo.phone) {
      await saveOrUpdateLead(supabase, {
        bot_id: params.botId,
        user_id: bot.user_id,
        conversation_id: conversation.id,
        visitor_id: visitorId,
        email: leadInfo.email,
        phone: leadInfo.phone,
        url: metadata?.url,
      });
    }

    // 6. Get conversation history for context
    const { data: messageHistory } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(20);

    // 7. Search knowledge base for relevant context (RAG)
    let knowledgeContext = '';
    try {
      const ragResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/knowledge-base/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: message,
          botId: params.botId,
          limit: 3,
        }),
      });

      if (ragResponse.ok) {
        const { results, method } = await ragResponse.json();

        if (results && results.length > 0) {
          knowledgeContext = '\n\nRelevant information from your knowledge base:\n\n';

          results.forEach((chunk: any, index: number) => {
            const fileName = chunk.file?.file_name || chunk.file_name || 'Unknown source';
            knowledgeContext += `[Source ${index + 1}: ${fileName}]\n${chunk.content}\n\n`;
          });

          knowledgeContext += 'Please use this information to provide accurate answers. If the information is relevant, cite the source in your response.';
        }
      }
    } catch (error) {
      console.error('RAG search error:', error);
      // Continue without RAG if search fails
    }

    // 8. Prepare messages for OpenAI
    const aiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: bot.system_prompt + knowledgeContext },
    ];

    // Add lead capture prompt if configured
    if (bot.lead_capture_prompt && !leadInfo.email && !leadInfo.phone) {
      aiMessages.push({
        role: 'system',
        content: bot.lead_capture_prompt
      });
    }

    // Add conversation history
    messageHistory?.forEach(msg => {
      aiMessages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    });

    // 9. Generate AI response
    const aiResponse = await generateChatResponse(
      aiMessages,
      bot.model,
      bot.temperature
    );

    // 10. Save AI message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: aiResponse,
    });

    // 11. Calculate sentiment score (basic implementation)
    const sentimentScore = calculateSentiment(message, aiResponse);

    // 12. Update conversation stats
    await supabase
      .from('conversations')
      .update({
        message_count: (conversation.message_count || 0) + 2,
        last_message_at: new Date().toISOString(),
        sentiment_score: sentimentScore,
      })
      .eq('id', conversation.id);

    // 13. Check for hot lead and trigger webhook + email
    if (leadInfo.email || leadInfo.phone) {
      const leadScore = calculateLeadScore(messageHistory || [], leadInfo, sentimentScore);

      if (leadScore >= (bot.hot_lead_threshold || 75)) {
        // Trigger webhook asynchronously (don't wait)
        if (bot.webhook_url) {
          triggerWebhook(bot.webhook_url, {
            event: 'hot_lead',
            bot_id: params.botId,
            conversation_id: conversation.id,
            lead: leadInfo,
            score: leadScore,
            url: metadata?.url,
          }).catch(err => console.error('Webhook failed:', err));
        }

        // Send hot lead email alert to bot owner
        const { data: owner } = await supabase
          .from('users')
          .select('email')
          .eq('id', bot.user_id)
          .single();

        if (owner?.email) {
          const { sendHotLeadAlert } = await import('@/lib/email');
          sendHotLeadAlert(owner.email, {
            email: leadInfo.email,
            phone: leadInfo.phone,
            score: leadScore,
            botName: bot.name,
            conversationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/conversations/${conversation.id}`,
            messages: (messageHistory || []).map((m: any) => m.content),
          }).catch(err => console.error('Failed to send lead alert:', err));
        }
      }
    }

    // 14. Log API usage for billing
    await logApiUsage(supabase, bot.user_id, params.botId, 'conversation');

    return NextResponse.json({
      conversationId: conversation.id,
      message: aiResponse,
    });

  } catch (error: any) {
    console.error('Chat API error:', error);

    // Handle OpenAI specific errors
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

/**
 * Check if user is within usage limits
 */
async function checkUsageLimits(supabase: any, userId: string) {
  // Get user's subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_type, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  const plan = subscription?.plan_type?.toLowerCase() || 'free';

  const limits: Record<string, number> = {
    free: 50,
    starter: 500,
    professional: 2000,
    executive: 10000,
    enterprise: -1, // Unlimited
  };

  const limit = limits[plan];

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1 };
  }

  // Count conversations this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString());

  return {
    allowed: (count || 0) < limit,
    current: count || 0,
    limit,
  };
}

/**
 * Extract email and phone from message
 */
function extractLeadInfo(message: string) {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /\b(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;

  const email = message.match(emailRegex)?.[0] || null;
  const phone = message.match(phoneRegex)?.[0] || null;

  return { email, phone };
}

/**
 * Save or update lead information
 */
async function saveOrUpdateLead(supabase: any, leadData: any) {
  // Check if lead already exists
  const { data: existing } = await supabase
    .from('leads')
    .select('*')
    .eq('bot_id', leadData.bot_id)
    .or(`email.eq.${leadData.email},phone.eq.${leadData.phone}`)
    .single();

  if (existing) {
    // Update existing lead
    await supabase
      .from('leads')
      .update({
        last_contact: new Date().toISOString(),
        conversation_count: (existing.conversation_count || 0) + 1,
      })
      .eq('id', existing.id);
  } else {
    // Create new lead
    await supabase.from('leads').insert({
      bot_id: leadData.bot_id,
      user_id: leadData.user_id,
      conversation_id: leadData.conversation_id,
      visitor_id: leadData.visitor_id,
      email: leadData.email,
      phone: leadData.phone,
      source_url: leadData.url,
      status: 'new',
      score: 50, // Default score
    });
  }
}

/**
 * Calculate basic sentiment score (-100 to 100)
 */
function calculateSentiment(userMessage: string, botMessage: string): number {
  const text = (userMessage + ' ' + botMessage).toLowerCase();

  const positiveWords = ['great', 'thanks', 'good', 'excellent', 'perfect', 'yes', 'awesome', 'love', 'appreciate'];
  const negativeWords = ['no', 'bad', 'terrible', 'hate', 'awful', 'wrong', 'disappointed', 'angry', 'frustrated'];

  let score = 0;
  positiveWords.forEach(word => {
    if (text.includes(word)) score += 10;
  });
  negativeWords.forEach(word => {
    if (text.includes(word)) score -= 10;
  });

  return Math.max(-100, Math.min(100, score));
}

/**
 * Calculate lead score (0-100)
 */
function calculateLeadScore(
  messageHistory: any[],
  leadInfo: any,
  sentimentScore: number
): number {
  let score = 50; // Base score

  // Has contact info
  if (leadInfo.email) score += 20;
  if (leadInfo.phone) score += 15;

  // Message count (engagement)
  const messageCount = messageHistory.length;
  if (messageCount > 5) score += 10;
  if (messageCount > 10) score += 10;

  // Sentiment
  if (sentimentScore > 50) score += 15;
  else if (sentimentScore < -50) score -= 20;

  // Intent keywords
  const allMessages = messageHistory.map(m => m.content).join(' ').toLowerCase();
  if (allMessages.includes('buy') || allMessages.includes('purchase') || allMessages.includes('price')) {
    score += 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Trigger webhook for hot leads
 */
async function triggerWebhook(url: string, payload: any) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BuildMyBot-Webhook/1.0',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Webhook delivery failed:', error);
    throw error;
  }
}

/**
 * Log API usage for billing
 */
async function logApiUsage(supabase: any, userId: string, botId: string, type: string) {
  await supabase.from('api_usage').insert({
    user_id: userId,
    bot_id: botId,
    endpoint: 'chat',
    usage_type: type,
  });
}
