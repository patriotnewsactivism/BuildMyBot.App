// Edge Function: marketplace-install-template
// Installs a marketplace template by creating a new bot with the template configuration

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';

interface RequestBody {
  template_id: string;
  bot_name?: string; // Optional custom name
  customize?: {
    theme_color?: string;
    temperature?: number;
    model?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = await getUserFromAuth(authHeader);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    const { template_id, bot_name, customize } = body;

    if (!template_id) {
      return new Response(
        JSON.stringify({ error: 'template_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createSupabaseClient();

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', template_id)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: 'Template not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user's plan for bot limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, status')
      .eq('id', user.id)
      .single();

    if (profile?.status !== 'Active') {
      return new Response(
        JSON.stringify({ error: 'Account is suspended' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: planLimits } = await supabase
      .from('plans')
      .select('max_bots')
      .eq('slug', profile?.plan || 'FREE')
      .single();

    const { count: currentBotCount } = await supabase
      .from('bots')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id);

    if (planLimits && planLimits.max_bots !== -1) {
      if ((currentBotCount || 0) >= planLimits.max_bots) {
        return new Response(
          JSON.stringify({ error: 'Bot limit reached. Please upgrade your plan.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if template requires payment (premium templates)
    if (template.price_cents > 0) {
      // For now, we'll just note this - in production, you'd integrate Stripe here
      // or check if user has already purchased this template
      console.log(`Template ${template_id} costs ${template.price_cents} cents`);
      // TODO: Implement payment flow
    }

    // Create bot from template
    const { data: newBot, error: botError } = await supabase
      .from('bots')
      .insert({
        owner_id: user.id,
        name: bot_name || template.name,
        type: template.category,
        system_prompt: template.system_prompt,
        model: customize?.model || template.model,
        temperature: customize?.temperature ?? template.temperature,
        theme_color: customize?.theme_color || template.theme_color,
        avatar: template.avatar,
        active: true,
        conversations_count: 0,
        metadata: {
          template_id: template.id,
          template_name: template.name,
          installed_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (botError) {
      throw new Error(`Failed to create bot: ${botError.message}`);
    }

    // Install sample knowledge base if template has any
    if (template.sample_knowledge && Array.isArray(template.sample_knowledge)) {
      for (const kb of template.sample_knowledge) {
        await supabase.from('knowledge_base').insert({
          bot_id: newBot.id,
          owner_id: user.id,
          title: kb.title || 'Sample Knowledge',
          content: kb.content || '',
          source_type: 'text',
          metadata: {
            from_template: true,
            template_id: template.id,
          },
        });
      }
    }

    // Increment template install count (handled by trigger, but also explicit)
    await supabase
      .from('templates')
      .update({ install_count: template.install_count + 1 })
      .eq('id', template_id);

    // Log usage event
    await supabase.from('usage_events').insert({
      owner_id: user.id,
      bot_id: newBot.id,
      event_type: 'template_install',
      tokens_used: 0,
      cost_cents: template.price_cents,
      metadata: {
        template_id,
        template_name: template.name,
        customizations: customize || null,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        bot: {
          id: newBot.id,
          name: newBot.name,
          type: newBot.type,
          theme_color: newBot.theme_color,
        },
        template: {
          id: template.id,
          name: template.name,
          category: template.category,
        },
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('marketplace-install-template error:', error);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
