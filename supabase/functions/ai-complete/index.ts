// AI Complete Edge Function
// Handles chat completions with OpenAI, RAG knowledge base search, and conversation logging

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { OpenAI } from 'https://esm.sh/openai@4';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

interface RequestBody {
  botId: string;
  messages: Array<{ role: string; content: string }>;
  sessionId?: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check rate limits
    const rateLimit = await checkRateLimit(user.id, 'ai-complete', 30, 60000);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please wait before retrying.',
          resetAt: new Date(rateLimit.resetAt).toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      );
    }

    // Parse request body
    const { botId, messages, sessionId }: RequestBody = await req.json();

    if (!botId || !messages || messages.length === 0) {
      throw new Error('Missing required fields: botId, messages');
    }

    // Fetch bot configuration and verify ownership
    const { data: bot, error: botError } = await supabaseClient
      .from('bots')
      .select('*')
      .eq('id', botId)
      .eq('owner_id', user.id)
      .single();

    if (botError || !bot) {
      throw new Error('Bot not found or access denied');
    }

    // Check billing limits
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    // Count conversations this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: conversationCount } = await supabaseClient
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    // Plan limits (should match constants.ts)
    const planLimits: Record<string, number> = {
      FREE: 60,
      STARTER: 750,
      PROFESSIONAL: 5000,
      EXECUTIVE: 15000,
      ENTERPRISE: 50000,
    };

    const limit = planLimits[profile?.plan || 'FREE'] || 60;
    if ((conversationCount || 0) >= limit) {
      throw new Error('Monthly conversation limit reached. Please upgrade your plan.');
    }

    // Retrieve relevant knowledge base context using vector similarity
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';

    let knowledgeContext = '';
    if (lastUserMessage) {
      // Initialize OpenAI for embeddings
      const openai = new OpenAI({
        apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
      });

      // Generate embedding for the query
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: lastUserMessage,
      });

      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Search knowledge base using secure vector similarity function
      const { data: knowledgeResults } = await supabaseClient.rpc(
        'match_knowledge_base_secure',
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.7,
          match_count: 5,
          filter_bot_id: botId,
        }
      );

      if (knowledgeResults && knowledgeResults.length > 0) {
        knowledgeContext = '\n\n**Knowledge Base Context:**\n' +
          knowledgeResults.map((r: any) => r.content).join('\n\n');
      }
    }

    // Initialize OpenAI for chat completion
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
    });

    // Prepare system message with knowledge base context
    const systemMessage = bot.system_prompt + knowledgeContext;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: bot.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        ...messages,
      ],
      temperature: bot.temperature || 0.7,
    });

    const assistantMessage = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Log conversation
    const conversationMessages = [
      ...messages,
      { role: 'assistant', content: assistantMessage, timestamp: Date.now() },
    ];

    const { data: conversation, error: conversationError } = await supabaseClient
      .from('conversations')
      .upsert({
        owner_id: user.id,
        bot_id: botId,
        session_id: sessionId || `session_${Date.now()}`,
        messages: conversationMessages,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (conversationError) {
      console.error('Error logging conversation:', conversationError);
    }

    // Log usage event
    await supabaseClient.from('usage_events').insert({
      owner_id: user.id,
      event_type: 'ai_tokens',
      resource_id: botId,
      quantity: tokensUsed,
      metadata: { model: bot.model, conversation_id: conversation?.id },
    });

    // Update bot conversation count
    await supabaseClient
      .from('bots')
      .update({ conversations_count: (bot.conversations_count || 0) + 1 })
      .eq('id', botId);

    // Return response
    return new Response(
      JSON.stringify({
        message: assistantMessage,
        conversationId: conversation?.id,
        tokensUsed,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in ai-complete:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
