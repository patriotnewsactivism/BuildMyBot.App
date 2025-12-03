// Create Lead Edge Function
// Creates a new lead from a conversation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  botId: string;
  conversationId?: string;
  name: string;
  email?: string;
  phone?: string;
  score?: number;
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { botId, conversationId, name, email, phone, score, notes }: RequestBody = await req.json();

    if (!botId || !name) {
      throw new Error('Missing required fields: botId, name');
    }

    // Verify bot ownership
    const { data: bot, error: botError } = await supabaseClient
      .from('bots')
      .select('id')
      .eq('id', botId)
      .eq('owner_id', user.id)
      .single();

    if (botError || !bot) {
      throw new Error('Bot not found or access denied');
    }

    // Calculate lead score if not provided
    let leadScore = score || 0;
    if (!score && conversationId) {
      // Fetch conversation to calculate score
      const { data: conversation } = await supabaseClient
        .from('conversations')
        .select('messages, sentiment')
        .eq('id', conversationId)
        .single();

      if (conversation) {
        // Simple scoring algorithm
        const messageCount = (conversation.messages as any[]).length;
        let calculatedScore = Math.min(messageCount * 10, 50); // Up to 50 points for engagement

        // Add points for positive sentiment
        if (conversation.sentiment === 'Positive') {
          calculatedScore += 30;
        } else if (conversation.sentiment === 'Neutral') {
          calculatedScore += 15;
        }

        // Add points for providing contact info
        if (email) calculatedScore += 10;
        if (phone) calculatedScore += 10;

        leadScore = Math.min(calculatedScore, 100);
      }
    }

    // Create lead
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .insert({
        owner_id: user.id,
        source_bot_id: botId,
        conversation_id: conversationId,
        name,
        email,
        phone,
        score: leadScore,
        status: 'New',
        notes,
      })
      .select()
      .single();

    if (leadError) {
      throw new Error(`Failed to create lead: ${leadError.message}`);
    }

    // Mark conversation as lead captured
    if (conversationId) {
      await supabaseClient
        .from('conversations')
        .update({ lead_captured: true })
        .eq('id', conversationId);
    }

    // Log usage event
    await supabaseClient.from('usage_events').insert({
      owner_id: user.id,
      event_type: 'lead_created',
      resource_id: lead.id,
      quantity: 1,
      metadata: { bot_id: botId, score: leadScore },
    });

    return new Response(
      JSON.stringify({ lead }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-lead:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
