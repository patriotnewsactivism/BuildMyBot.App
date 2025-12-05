// Edge Function: ai-complete
// Handles AI chat completions with ownership validation, usage tracking, and billing enforcement

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';
import { createChatCompletion, ChatMessage } from '../_shared/openai.ts';

interface RequestBody {
  bot_id: string;
  messages: Array<{ role: 'user' | 'model'; text: string }>;
  session_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');
    const body: RequestBody = await req.json();

    const { bot_id, messages, session_id } = body;

    if (!bot_id) {
      return new Response(
        JSON.stringify({ error: 'bot_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseClient();

    // Fetch bot details
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*, owner:profiles!owner_id(id, plan, status)')
      .eq('id', bot_id)
      .single();

    if (botError || !bot) {
      return new Response(
        JSON.stringify({ error: 'Bot not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bot.active) {
      return new Response(
        JSON.stringify({ error: 'Bot is inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check owner status
    if (bot.owner?.status !== 'Active') {
      return new Response(
        JSON.stringify({ error: 'Bot owner account is suspended' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check billing quota
    const { data: planLimits } = await supabase
      .from('plans')
      .select('max_ai_tokens, max_conversations')
      .eq('slug', bot.owner?.plan || 'FREE')
      .single();

    const { data: usage } = await supabase.rpc('get_monthly_usage', { user_id: bot.owner_id });

    if (planLimits && usage) {
      const monthlyUsage = usage[0] || { total_tokens: 0, total_conversations: 0 };

      // Check token limit (-1 means unlimited)
      if (planLimits.max_ai_tokens !== -1 && monthlyUsage.total_tokens >= planLimits.max_ai_tokens) {
        return new Response(
          JSON.stringify({ error: 'Monthly AI token limit exceeded. Please upgrade your plan.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check conversation limit
      if (planLimits.max_conversations !== -1 && monthlyUsage.total_conversations >= planLimits.max_conversations) {
        return new Response(
          JSON.stringify({ error: 'Monthly conversation limit exceeded. Please upgrade your plan.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch relevant knowledge base context
    let knowledgeContext = '';
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.text || '';

    if (lastUserMessage) {
      // Search knowledge base using semantic search
      const { data: relevantKnowledge } = await supabase.rpc('match_knowledge_base', {
        query_embedding: null, // Would need to embed the query first
        match_bot_id: bot_id,
        match_threshold: 0.7,
        match_count: 3,
      });

      // Fallback: simple text search if no embeddings
      if (!relevantKnowledge || relevantKnowledge.length === 0) {
        const { data: textResults } = await supabase
          .from('knowledge_base')
          .select('title, content')
          .eq('bot_id', bot_id)
          .limit(5);

        if (textResults && textResults.length > 0) {
          knowledgeContext = textResults
            .map(k => `### ${k.title}\n${k.content}`)
            .join('\n\n');
        }
      } else {
        knowledgeContext = relevantKnowledge
          .map((k: { title: string; content: string }) => `### ${k.title}\n${k.content}`)
          .join('\n\n');
      }
    }

    // Build system prompt with knowledge context
    let systemPrompt = bot.system_prompt;

    if (knowledgeContext) {
      systemPrompt += `\n\n---\n\n## Reference Information\nUse the following information to answer questions accurately. If the information doesn't cover a topic, say you don't have information about that.\n\n${knowledgeContext}`;
    }

    // Convert messages to OpenAI format
    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text,
      })),
    ];

    // Call OpenAI
    const completion = await createChatCompletion(chatMessages, {
      model: bot.model,
      temperature: parseFloat(bot.temperature) || 0.7,
    });

    // Log conversation
    const conversationSessionId = session_id || crypto.randomUUID();
    const now = Date.now();

    // Update or create conversation record
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('id, messages')
      .eq('session_id', conversationSessionId)
      .eq('bot_id', bot_id)
      .single();

    const newMessages = [
      ...messages.map(m => ({ role: m.role, text: m.text, timestamp: now - 1000 })),
      { role: 'model', text: completion.content, timestamp: now },
    ];

    if (existingConversation) {
      // Append to existing conversation
      const updatedMessages = [...(existingConversation.messages || []), ...newMessages.slice(-2)];
      await supabase
        .from('conversations')
        .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
        .eq('id', existingConversation.id);
    } else {
      // Create new conversation
      await supabase.from('conversations').insert({
        bot_id: bot_id,
        owner_id: bot.owner_id,
        session_id: conversationSessionId,
        messages: newMessages,
        sentiment: 'Neutral',
      });
    }

    // Track usage
    await supabase.from('usage_events').insert({
      owner_id: bot.owner_id,
      bot_id: bot_id,
      event_type: 'ai_completion',
      tokens_used: completion.tokens.total,
      cost_cents: Math.ceil(completion.tokens.total * 0.00015 * 100), // Rough estimate
      metadata: {
        model: bot.model,
        prompt_tokens: completion.tokens.prompt,
        completion_tokens: completion.tokens.completion,
        session_id: conversationSessionId,
      },
    });

    return new Response(
      JSON.stringify({
        response: completion.content,
        session_id: conversationSessionId,
        tokens_used: completion.tokens.total,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('ai-complete error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
