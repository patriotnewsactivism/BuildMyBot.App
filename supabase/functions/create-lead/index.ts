// Edge Function: create-lead
// Creates lead records from chat conversations with ownership validation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';

interface RequestBody {
  bot_id: string;
  conversation_id?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: RequestBody = await req.json();

    const { bot_id, conversation_id, name, email, phone, company, notes, metadata } = body;

    // Validate required fields
    if (!bot_id) {
      return new Response(
        JSON.stringify({ error: 'bot_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: 'name and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseClient();

    // Fetch bot to get owner_id
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('id, owner_id, name')
      .eq('id', bot_id)
      .single();

    if (botError || !bot) {
      return new Response(
        JSON.stringify({ error: 'Bot not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check lead limits
    const { data: planLimits } = await supabase
      .from('plans')
      .select('max_leads')
      .eq('slug', (await supabase.from('profiles').select('plan').eq('id', bot.owner_id).single()).data?.plan || 'FREE')
      .single();

    const { data: usage } = await supabase.rpc('get_monthly_usage', { user_id: bot.owner_id });

    if (planLimits && usage) {
      const monthlyUsage = usage[0] || { total_leads: 0 };

      if (planLimits.max_leads !== -1 && monthlyUsage.total_leads >= planLimits.max_leads) {
        return new Response(
          JSON.stringify({ error: 'Monthly lead capture limit exceeded' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Calculate lead score based on available info
    let score = 50; // Base score

    if (phone) score += 15; // Has phone number
    if (company) score += 15; // Has company
    if (conversation_id) score += 10; // Engaged in conversation
    if (notes) score += 10; // Additional context provided

    // Check for existing lead with same email for this bot owner
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, score')
      .eq('owner_id', bot.owner_id)
      .eq('email', email.toLowerCase())
      .single();

    let lead;

    if (existingLead) {
      // Update existing lead
      const { data: updatedLead, error: updateError } = await supabase
        .from('leads')
        .update({
          name,
          phone: phone || undefined,
          company: company || undefined,
          notes: notes ? `${existingLead.notes || ''}\n---\n${notes}`.trim() : undefined,
          score: Math.max(existingLead.score, score), // Keep higher score
          metadata: metadata || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLead.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update lead: ${updateError.message}`);
      }

      lead = updatedLead;
    } else {
      // Create new lead
      const { data: newLead, error: insertError } = await supabase
        .from('leads')
        .insert({
          owner_id: bot.owner_id,
          source_bot_id: bot_id,
          conversation_id: conversation_id || null,
          name,
          email: email.toLowerCase(),
          phone: phone || null,
          company: company || null,
          notes: notes || null,
          score,
          status: 'New',
          metadata: metadata || {},
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create lead: ${insertError.message}`);
      }

      lead = newLead;
    }

    // Log usage event
    await supabase.from('usage_events').insert({
      owner_id: bot.owner_id,
      bot_id: bot_id,
      event_type: 'lead_capture',
      tokens_used: 0,
      cost_cents: 0,
      metadata: {
        lead_id: lead.id,
        source: 'chat_widget',
        is_update: !!existingLead,
      },
    });

    // Update conversation with lead_id if provided
    if (conversation_id) {
      await supabase
        .from('conversations')
        .update({ lead_id: lead.id })
        .eq('id', conversation_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: lead.id,
        is_new: !existingLead,
        score: lead.score,
      }),
      { status: existingLead ? 200 : 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('create-lead error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
