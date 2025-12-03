// Marketplace Install Template Edge Function
// Installs a marketplace template as a new bot

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  templateId: string;
  botName?: string;
  customizations?: {
    themeColor?: string;
    avatar?: string;
    temperature?: number;
  };
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

    const { templateId, botName, customizations }: RequestBody = await req.json();

    if (!templateId) {
      throw new Error('Missing required field: templateId');
    }

    // Fetch template
    const { data: template, error: templateError } = await supabaseClient
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    // Check if user can create more bots (billing limits)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    const { count: botCount } = await supabaseClient
      .from('bots')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id);

    const planLimits: Record<string, number> = {
      FREE: 1,
      STARTER: 1,
      PROFESSIONAL: 5,
      EXECUTIVE: 10,
      ENTERPRISE: 9999,
    };

    const limit = planLimits[profile?.plan || 'FREE'] || 1;
    if ((botCount || 0) >= limit) {
      throw new Error('Bot limit reached. Please upgrade your plan.');
    }

    // Create bot from template
    const { data: bot, error: botError } = await supabaseClient
      .from('bots')
      .insert({
        owner_id: user.id,
        name: botName || template.name,
        type: template.category,
        system_prompt: template.system_prompt,
        model: template.model || 'gpt-4o-mini',
        temperature: customizations?.temperature ?? template.temperature ?? 0.7,
        active: true,
        conversations_count: 0,
        theme_color: customizations?.themeColor || '#3B82F6',
        avatar: customizations?.avatar,
      })
      .select()
      .single();

    if (botError) {
      throw new Error(`Failed to create bot from template: ${botError.message}`);
    }

    // Log usage event
    await supabaseClient.from('usage_events').insert({
      owner_id: user.id,
      event_type: 'conversation',
      resource_id: bot.id,
      quantity: 1,
      metadata: { template_id: templateId, template_name: template.name },
    });

    return new Response(
      JSON.stringify({
        success: true,
        bot,
        message: `Bot "${bot.name}" created successfully from template`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in marketplace-install-template:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
