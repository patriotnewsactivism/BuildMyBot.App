// Edge Function: create-lead
// Purpose: Create lead records from bot conversations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateLeadRequest {
  botId: string
  conversationId?: string
  name?: string
  email: string
  phone?: string
  company?: string
  score?: number
  metadata?: Record<string, any>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

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

    const {
      botId,
      conversationId,
      name,
      email,
      phone,
      company,
      score = 75,
      metadata = {},
    }: CreateLeadRequest = await req.json()

    // Validate bot ownership
    const { data: bot, error: botError } = await supabaseClient
      .from('bots')
      .select('id')
      .eq('id', botId)
      .eq('owner_id', user.id)
      .single()

    if (botError || !bot) {
      return new Response(
        JSON.stringify({ error: 'Bot not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if lead already exists by email
    const { data: existingLead } = await supabaseClient
      .from('leads')
      .select('id')
      .eq('email', email)
      .eq('owner_id', user.id)
      .single()

    let leadId: string

    if (existingLead) {
      // Update existing lead
      const { data: updatedLead, error: updateError } = await supabaseClient
        .from('leads')
        .update({
          name: name || existingLead.name,
          phone: phone || existingLead.phone,
          company: company || existingLead.company,
          score: Math.max(score, existingLead.score || 0),
          metadata: { ...existingLead.metadata, ...metadata },
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLead.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      leadId = existingLead.id
    } else {
      // Create new lead
      const { data: newLead, error: createError } = await supabaseClient
        .from('leads')
        .insert({
          owner_id: user.id,
          source_bot_id: botId,
          conversation_id: conversationId,
          name,
          email,
          phone,
          company,
          score,
          status: 'new',
          metadata,
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      leadId = newLead.id

      // Update conversation with lead capture flag
      if (conversationId) {
        await supabaseClient
          .from('conversations')
          .update({
            lead_captured: true,
            visitor_email: email,
            visitor_name: name,
          })
          .eq('id', conversationId)
      }
    }

    // Track usage event
    await supabaseClient
      .from('usage_events')
      .insert({
        owner_id: user.id,
        event_type: 'lead',
        bot_id: botId,
        quantity: 1,
        metadata: { lead_id: leadId },
      })

    return new Response(
      JSON.stringify({
        success: true,
        leadId,
        message: existingLead ? 'Lead updated' : 'Lead created',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Create lead error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
