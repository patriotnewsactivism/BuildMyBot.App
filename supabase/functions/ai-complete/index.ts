// Edge Function: ai-complete
// Purpose: Handle AI chat completions, manage conversation history, track usage

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CompletionRequest {
  botId: string
  sessionId: string
  message: string
  conversationHistory?: Array<{ role: string; content: string }>
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { botId, sessionId, message, conversationHistory = [] }: CompletionRequest = await req.json()

    // Validate bot ownership
    const { data: bot, error: botError } = await supabaseClient
      .from('bots')
      .select('*')
      .eq('id', botId)
      .eq('owner_id', user.id)
      .single()

    if (botError || !bot) {
      return new Response(
        JSON.stringify({ error: 'Bot not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check billing/usage limits
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    // Get usage for current month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: usageCount } = await supabaseClient
      .from('usage_events')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('event_type', 'message')
      .gte('created_at', startOfMonth.toISOString())

    // Get plan limits
    const { data: planData } = await supabaseClient
      .from('plans')
      .select('limits')
      .eq('id', profile?.plan || 'free')
      .single()

    const messageLimit = planData?.limits?.messages || 100
    if (messageLimit !== -1 && (usageCount || 0) >= messageLimit) {
      return new Response(
        JSON.stringify({ error: 'Message limit exceeded. Please upgrade your plan.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch relevant knowledge base context (semantic search)
    let kbContext = ''
    if (bot.active) {
      const { data: kbEntries } = await supabaseClient
        .from('knowledge_base')
        .select('content')
        .eq('bot_id', botId)
        .limit(3)

      if (kbEntries && kbEntries.length > 0) {
        kbContext = kbEntries.map(entry => entry.content).join('\n\n')
      }
    }

    // Build system prompt with context
    let systemPrompt = bot.system_prompt
    if (kbContext) {
      systemPrompt += `\n\n[KNOWLEDGE BASE CONTEXT]\n${kbContext}`
    }

    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: JSON.stringify({
        model: bot.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message },
        ],
        temperature: bot.temperature || 0.7,
        max_tokens: 500,
      }),
    })

    const aiData = await openaiResponse.json()

    if (aiData.error) {
      console.error('OpenAI Error:', aiData.error)
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const assistantMessage = aiData.choices[0]?.message?.content || 'No response'

    // Save conversation to database
    const conversationMessages = [
      ...conversationHistory,
      { role: 'user', content: message },
      { role: 'assistant', content: assistantMessage },
    ]

    const { error: convError } = await supabaseClient
      .from('conversations')
      .upsert({
        bot_id: botId,
        owner_id: user.id,
        session_id: sessionId,
        messages: conversationMessages,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'session_id'
      })

    if (convError) {
      console.error('Conversation save error:', convError)
    }

    // Track usage event
    await supabaseClient
      .from('usage_events')
      .insert({
        owner_id: user.id,
        event_type: 'message',
        bot_id: botId,
        quantity: 1,
      })

    // Update bot conversation count
    await supabaseClient
      .from('bots')
      .update({ conversations_count: (bot.conversations_count || 0) + 1 })
      .eq('id', botId)

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        sessionId: sessionId,
        usage: {
          current: (usageCount || 0) + 1,
          limit: messageLimit,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
