// ============================================================================
// BuildMyBot.app - Supabase Database Types
// ============================================================================
// Auto-generate with: npx supabase gen types typescript --project-id <id>
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      billing_accounts: {
        Row: {
          id: string
          owner_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan_id: string | null
          status: 'active' | 'past_due' | 'canceled' | 'trialing'
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          payment_method_last4: string | null
          payment_method_brand: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan_id?: string | null
          status?: 'active' | 'past_due' | 'canceled' | 'trialing'
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          payment_method_last4?: string | null
          payment_method_brand?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan_id?: string | null
          status?: 'active' | 'past_due' | 'canceled' | 'trialing'
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          payment_method_last4?: string | null
          payment_method_brand?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      bots: {
        Row: {
          id: string
          owner_id: string
          name: string
          type: string
          system_prompt: string
          model: string
          temperature: number
          theme_color: string
          website_url: string | null
          max_messages: number | null
          randomize_identity: boolean
          avatar: string | null
          response_delay: number
          active: boolean
          conversations_count: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          type?: string
          system_prompt: string
          model?: string
          temperature?: number
          theme_color?: string
          website_url?: string | null
          max_messages?: number | null
          randomize_identity?: boolean
          avatar?: string | null
          response_delay?: number
          active?: boolean
          conversations_count?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          type?: string
          system_prompt?: string
          model?: string
          temperature?: number
          theme_color?: string
          website_url?: string | null
          max_messages?: number | null
          randomize_identity?: boolean
          avatar?: string | null
          response_delay?: number
          active?: boolean
          conversations_count?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      commissions: {
        Row: {
          id: string
          reseller_id: string
          client_id: string
          amount_cents: number
          commission_rate: number
          source_event: string
          status: 'pending' | 'paid' | 'canceled'
          paid_at: string | null
          payout_reference: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reseller_id: string
          client_id: string
          amount_cents: number
          commission_rate: number
          source_event: string
          status?: 'pending' | 'paid' | 'canceled'
          paid_at?: string | null
          payout_reference?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reseller_id?: string
          client_id?: string
          amount_cents?: number
          commission_rate?: number
          source_event?: string
          status?: 'pending' | 'paid' | 'canceled'
          paid_at?: string | null
          payout_reference?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          bot_id: string
          owner_id: string
          session_id: string
          messages: Json
          sentiment: 'Positive' | 'Neutral' | 'Negative' | null
          lead_id: string | null
          visitor_ip: string | null
          visitor_user_agent: string | null
          visitor_location: Json
          metadata: Json
          started_at: string
          ended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bot_id: string
          owner_id: string
          session_id: string
          messages?: Json
          sentiment?: 'Positive' | 'Neutral' | 'Negative' | null
          lead_id?: string | null
          visitor_ip?: string | null
          visitor_user_agent?: string | null
          visitor_location?: Json
          metadata?: Json
          started_at?: string
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bot_id?: string
          owner_id?: string
          session_id?: string
          messages?: Json
          sentiment?: 'Positive' | 'Neutral' | 'Negative' | null
          lead_id?: string | null
          visitor_ip?: string | null
          visitor_user_agent?: string | null
          visitor_location?: Json
          metadata?: Json
          started_at?: string
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      knowledge_base: {
        Row: {
          id: string
          bot_id: string
          owner_id: string
          title: string
          content: string
          source_type: string
          source_url: string | null
          chunk_index: number
          embedding: number[] | null
          token_count: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bot_id: string
          owner_id: string
          title: string
          content: string
          source_type?: string
          source_url?: string | null
          chunk_index?: number
          embedding?: number[] | null
          token_count?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bot_id?: string
          owner_id?: string
          title?: string
          content?: string
          source_type?: string
          source_url?: string | null
          chunk_index?: number
          embedding?: number[] | null
          token_count?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          owner_id: string
          source_bot_id: string
          conversation_id: string | null
          name: string
          email: string
          phone: string | null
          company: string | null
          score: number
          status: 'New' | 'Contacted' | 'Qualified' | 'Closed'
          notes: string | null
          tags: string[]
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          source_bot_id: string
          conversation_id?: string | null
          name: string
          email: string
          phone?: string | null
          company?: string | null
          score?: number
          status?: 'New' | 'Contacted' | 'Qualified' | 'Closed'
          notes?: string | null
          tags?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          source_bot_id?: string
          conversation_id?: string | null
          name?: string
          email?: string
          phone?: string | null
          company?: string | null
          score?: number
          status?: 'New' | 'Contacted' | 'Qualified' | 'Closed'
          notes?: string | null
          tags?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      marketing_content: {
        Row: {
          id: string
          owner_id: string
          bot_id: string | null
          content_type: 'email' | 'blog_post' | 'social_post' | 'ad_copy' | 'script' | 'viral_thread'
          title: string
          content: string
          topic: string | null
          tone: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          bot_id?: string | null
          content_type: 'email' | 'blog_post' | 'social_post' | 'ad_copy' | 'script' | 'viral_thread'
          title: string
          content: string
          topic?: string | null
          tone?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          bot_id?: string | null
          content_type?: 'email' | 'blog_post' | 'social_post' | 'ad_copy' | 'script' | 'viral_thread'
          title?: string
          content?: string
          topic?: string | null
          tone?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      phone_calls: {
        Row: {
          id: string
          owner_id: string
          bot_id: string
          twilio_call_sid: string | null
          from_number: string
          to_number: string
          direction: string
          status: 'completed' | 'missed' | 'voicemail' | 'failed'
          duration_seconds: number
          transcript: string | null
          transcript_segments: Json
          recording_url: string | null
          sentiment: 'Positive' | 'Neutral' | 'Negative' | null
          lead_id: string | null
          cost_cents: number
          metadata: Json
          started_at: string
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          bot_id: string
          twilio_call_sid?: string | null
          from_number: string
          to_number: string
          direction?: string
          status?: 'completed' | 'missed' | 'voicemail' | 'failed'
          duration_seconds?: number
          transcript?: string | null
          transcript_segments?: Json
          recording_url?: string | null
          sentiment?: 'Positive' | 'Neutral' | 'Negative' | null
          lead_id?: string | null
          cost_cents?: number
          metadata?: Json
          started_at?: string
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          bot_id?: string
          twilio_call_sid?: string | null
          from_number?: string
          to_number?: string
          direction?: string
          status?: 'completed' | 'missed' | 'voicemail' | 'failed'
          duration_seconds?: number
          transcript?: string | null
          transcript_segments?: Json
          recording_url?: string | null
          sentiment?: 'Positive' | 'Neutral' | 'Negative' | null
          lead_id?: string | null
          cost_cents?: number
          metadata?: Json
          started_at?: string
          ended_at?: string | null
          created_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          name: string
          slug: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'EXECUTIVE' | 'ENTERPRISE'
          price_monthly: number
          price_yearly: number
          max_bots: number
          max_conversations: number
          max_leads: number
          max_knowledge_items: number
          max_ai_tokens: number
          features: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'EXECUTIVE' | 'ENTERPRISE'
          price_monthly?: number
          price_yearly?: number
          max_bots?: number
          max_conversations?: number
          max_leads?: number
          max_knowledge_items?: number
          max_ai_tokens?: number
          features?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'EXECUTIVE' | 'ENTERPRISE'
          price_monthly?: number
          price_yearly?: number
          max_bots?: number
          max_conversations?: number
          max_leads?: number
          max_knowledge_items?: number
          max_ai_tokens?: number
          features?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          company_name: string | null
          avatar_url: string | null
          role: 'OWNER' | 'ADMIN' | 'RESELLER'
          plan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'EXECUTIVE' | 'ENTERPRISE'
          status: 'Active' | 'Suspended' | 'Pending'
          reseller_code: string | null
          referred_by: string | null
          custom_domain: string | null
          stripe_customer_id: string | null
          phone_config: Json
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          company_name?: string | null
          avatar_url?: string | null
          role?: 'OWNER' | 'ADMIN' | 'RESELLER'
          plan?: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'EXECUTIVE' | 'ENTERPRISE'
          status?: 'Active' | 'Suspended' | 'Pending'
          reseller_code?: string | null
          referred_by?: string | null
          custom_domain?: string | null
          stripe_customer_id?: string | null
          phone_config?: Json
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          company_name?: string | null
          avatar_url?: string | null
          role?: 'OWNER' | 'ADMIN' | 'RESELLER'
          plan?: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'EXECUTIVE' | 'ENTERPRISE'
          status?: 'Active' | 'Suspended' | 'Pending'
          reseller_code?: string | null
          referred_by?: string | null
          custom_domain?: string | null
          stripe_customer_id?: string | null
          phone_config?: Json
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      referrals: {
        Row: {
          id: string
          reseller_id: string
          referral_code: string
          referred_email: string | null
          clicked_at: string
          signed_up_at: string | null
          converted_at: string | null
          client_id: string | null
          source: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          reseller_id: string
          referral_code: string
          referred_email?: string | null
          clicked_at?: string
          signed_up_at?: string | null
          converted_at?: string | null
          client_id?: string | null
          source?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          reseller_id?: string
          referral_code?: string
          referred_email?: string | null
          clicked_at?: string
          signed_up_at?: string | null
          converted_at?: string | null
          client_id?: string | null
          source?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      reseller_accounts: {
        Row: {
          id: string
          owner_id: string
          reseller_code: string
          company_name: string | null
          website: string | null
          tier: string
          commission_rate: number
          total_revenue_cents: number
          pending_payout_cents: number
          payout_email: string | null
          payout_method: string
          is_approved: boolean
          approved_at: string | null
          approved_by: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          reseller_code: string
          company_name?: string | null
          website?: string | null
          tier?: string
          commission_rate?: number
          total_revenue_cents?: number
          pending_payout_cents?: number
          payout_email?: string | null
          payout_method?: string
          is_approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          reseller_code?: string
          company_name?: string | null
          website?: string | null
          tier?: string
          commission_rate?: number
          total_revenue_cents?: number
          pending_payout_cents?: number
          payout_email?: string | null
          payout_method?: string
          is_approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      reseller_clients: {
        Row: {
          id: string
          reseller_id: string
          client_id: string
          referred_at: string
          is_active: boolean
          lifetime_revenue_cents: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reseller_id: string
          client_id: string
          referred_at?: string
          is_active?: boolean
          lifetime_revenue_cents?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reseller_id?: string
          client_id?: string
          referred_at?: string
          is_active?: boolean
          lifetime_revenue_cents?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          name: string
          description: string
          category: string
          system_prompt: string
          model: string
          temperature: number
          theme_color: string
          avatar: string | null
          sample_knowledge: Json
          features: string[]
          rating: number
          install_count: number
          price_cents: number
          author_id: string | null
          is_featured: boolean
          is_active: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          category: string
          system_prompt: string
          model?: string
          temperature?: number
          theme_color?: string
          avatar?: string | null
          sample_knowledge?: Json
          features?: string[]
          rating?: number
          install_count?: number
          price_cents?: number
          author_id?: string | null
          is_featured?: boolean
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          category?: string
          system_prompt?: string
          model?: string
          temperature?: number
          theme_color?: string
          avatar?: string | null
          sample_knowledge?: Json
          features?: string[]
          rating?: number
          install_count?: number
          price_cents?: number
          author_id?: string | null
          is_featured?: boolean
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      usage_events: {
        Row: {
          id: string
          owner_id: string
          bot_id: string | null
          event_type: string
          tokens_used: number
          cost_cents: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          bot_id?: string | null
          event_type: string
          tokens_used?: number
          cost_cents?: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          bot_id?: string | null
          event_type?: string
          tokens_used?: number
          cost_cents?: number
          metadata?: Json
          created_at?: string
        }
      }
      website_pages: {
        Row: {
          id: string
          owner_id: string
          bot_id: string | null
          slug: string
          title: string
          meta_description: string | null
          meta_keywords: string[] | null
          content: Json
          html_content: string | null
          is_published: boolean
          published_at: string | null
          custom_domain: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          bot_id?: string | null
          slug: string
          title: string
          meta_description?: string | null
          meta_keywords?: string[] | null
          content?: Json
          html_content?: string | null
          is_published?: boolean
          published_at?: string | null
          custom_domain?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          bot_id?: string | null
          slug?: string
          title?: string
          meta_description?: string | null
          meta_keywords?: string[] | null
          content?: Json
          html_content?: string | null
          is_published?: boolean
          published_at?: string | null
          custom_domain?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      admin_metrics: {
        Row: {
          total_active_users: number | null
          new_users_30d: number | null
          total_active_bots: number | null
          conversations_30d: number | null
          leads_30d: number | null
          pending_commissions_cents: number | null
          pending_partner_approvals: number | null
        }
      }
      reseller_stats: {
        Row: {
          reseller_id: string | null
          owner_id: string | null
          reseller_code: string | null
          tier: string | null
          commission_rate: number | null
          total_clients: number | null
          total_earned_cents: number | null
          pending_payout_cents: number | null
        }
      }
    }
    Functions: {
      get_monthly_usage: {
        Args: {
          user_id: string
          usage_month?: string
        }
        Returns: {
          total_tokens: number
          total_conversations: number
          total_leads: number
          total_cost_cents: number
        }[]
      }
      match_knowledge_base: {
        Args: {
          query_embedding: number[]
          match_bot_id: string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          title: string
          content: string
          similarity: number
        }[]
      }
    }
    Enums: {
      billing_status: 'active' | 'past_due' | 'canceled' | 'trialing'
      call_status: 'completed' | 'missed' | 'voicemail' | 'failed'
      commission_status: 'pending' | 'paid' | 'canceled'
      content_type: 'email' | 'blog_post' | 'social_post' | 'ad_copy' | 'script' | 'viral_thread'
      conversation_sentiment: 'Positive' | 'Neutral' | 'Negative'
      lead_status: 'New' | 'Contacted' | 'Qualified' | 'Closed'
      plan_type: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'EXECUTIVE' | 'ENTERPRISE'
      user_role: 'OWNER' | 'ADMIN' | 'RESELLER'
      user_status: 'Active' | 'Suspended' | 'Pending'
    }
  }
}
