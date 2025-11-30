// Edge Function: marketplace-install-template
// Purpose: Install a template from marketplace as a new bot

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InstallTemplateRequest {
  templateId: string
  customizations?: {
    name?: string
    themeColor?: string
  }
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

    const { templateId, customizations = {} }: InstallTemplateRequest = await req.json()

    // Get template
    const { data: template, error: templateError } = await supabaseClient
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: 'Template not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check bot limits
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    const { data: planData } = await supabaseClient
      .from('plans')
      .select('limits')
      .eq('id', profile?.plan || 'free')
      .single()

    const botLimit = planData?.limits?.bots || 1

    if (botLimit !== -1) {
      const { count: botCount } = await supabaseClient
        .from('bots')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)

      if ((botCount || 0) >= botLimit) {
        return new Response(
          JSON.stringify({ error: 'Bot limit exceeded. Please upgrade your plan.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Create bot from template
    const { data: newBot, error: createError } = await supabaseClient
      .from('bots')
      .insert({
        owner_id: user.id,
        name: customizations.name || template.name,
        type: template.category,
        system_prompt: template.system_prompt,
        model: template.suggested_model || 'gpt-4o-mini',
        temperature: 0.7,
        active: true,
        theme_color: customizations.themeColor || '#1e3a8a',
        conversations_count: 0,
        metadata: {
          installed_from_template: templateId,
          template_name: template.name,
        },
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    return new Response(
      JSON.stringify({
        success: true,
        bot: newBot,
        message: `Successfully installed "${template.name}"`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Install template error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
