-- ============================================================================
-- BuildMyBot.app - Complete Supabase Schema
-- ============================================================================
-- This schema defines all tables, indexes, and extensions needed for the
-- BuildMyBot.app platform.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('OWNER', 'ADMIN', 'RESELLER');
CREATE TYPE plan_type AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'EXECUTIVE', 'ENTERPRISE');
CREATE TYPE user_status AS ENUM ('Active', 'Suspended', 'Pending');
CREATE TYPE lead_status AS ENUM ('New', 'Contacted', 'Qualified', 'Closed');
CREATE TYPE conversation_sentiment AS ENUM ('Positive', 'Neutral', 'Negative');
CREATE TYPE content_type AS ENUM ('email', 'blog_post', 'social_post', 'ad_copy', 'script', 'viral_thread');
CREATE TYPE billing_status AS ENUM ('active', 'past_due', 'canceled', 'trialing');
CREATE TYPE commission_status AS ENUM ('pending', 'paid', 'canceled');
CREATE TYPE call_status AS ENUM ('completed', 'missed', 'voicemail', 'failed');

-- ============================================================================
-- TABLE: plans (Public pricing tiers)
-- ============================================================================

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug plan_type NOT NULL UNIQUE,
  price_monthly INTEGER NOT NULL DEFAULT 0, -- in cents
  price_yearly INTEGER NOT NULL DEFAULT 0, -- in cents
  max_bots INTEGER NOT NULL DEFAULT 1,
  max_conversations INTEGER NOT NULL DEFAULT 100,
  max_leads INTEGER NOT NULL DEFAULT 50,
  max_knowledge_items INTEGER NOT NULL DEFAULT 10,
  max_ai_tokens INTEGER NOT NULL DEFAULT 100000, -- monthly token limit
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default plans
INSERT INTO plans (name, slug, price_monthly, price_yearly, max_bots, max_conversations, max_leads, max_knowledge_items, max_ai_tokens, features) VALUES
  ('Free', 'FREE', 0, 0, 1, 100, 50, 5, 50000, '["Basic chat widget", "Email support"]'::jsonb),
  ('Starter', 'STARTER', 2900, 29000, 3, 500, 250, 25, 250000, '["Custom branding", "Lead export", "Priority support"]'::jsonb),
  ('Professional', 'PROFESSIONAL', 7900, 79000, 10, 2500, 1000, 100, 1000000, '["API access", "Advanced analytics", "Phone support"]'::jsonb),
  ('Executive', 'EXECUTIVE', 19900, 199000, 25, 10000, 5000, 500, 5000000, '["White-label", "Dedicated support", "Custom integrations"]'::jsonb),
  ('Enterprise', 'ENTERPRISE', 49900, 499000, -1, -1, -1, -1, -1, '["Unlimited everything", "SLA", "Custom development"]'::jsonb);

-- ============================================================================
-- TABLE: profiles (User accounts)
-- ============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  company_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'OWNER',
  plan plan_type NOT NULL DEFAULT 'FREE',
  status user_status NOT NULL DEFAULT 'Active',
  reseller_code TEXT UNIQUE, -- Unique code for resellers
  referred_by TEXT, -- Reseller code that referred this user
  custom_domain TEXT, -- White-label domain
  stripe_customer_id TEXT,
  phone_config JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for reseller lookups
CREATE INDEX idx_profiles_reseller_code ON profiles(reseller_code) WHERE reseller_code IS NOT NULL;
CREATE INDEX idx_profiles_referred_by ON profiles(referred_by) WHERE referred_by IS NOT NULL;
CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================================================
-- TABLE: bots (AI chatbot configurations)
-- ============================================================================

CREATE TABLE bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general', -- persona type
  system_prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  temperature DECIMAL(2,1) NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  theme_color TEXT NOT NULL DEFAULT '#3B82F6',
  website_url TEXT,
  max_messages INTEGER DEFAULT 1000, -- soft limit per month
  randomize_identity BOOLEAN DEFAULT false,
  avatar TEXT,
  response_delay INTEGER DEFAULT 0, -- ms
  active BOOLEAN NOT NULL DEFAULT true,
  conversations_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bots_owner ON bots(owner_id);
CREATE INDEX idx_bots_active ON bots(active) WHERE active = true;

-- ============================================================================
-- TABLE: knowledge_base (RAG documents with vector embeddings)
-- ============================================================================

CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'pdf', 'url', 'file'
  source_url TEXT,
  chunk_index INTEGER DEFAULT 0, -- for multi-chunk documents
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  token_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_base_bot ON knowledge_base(bot_id);
CREATE INDEX idx_knowledge_base_owner ON knowledge_base(owner_id);
CREATE INDEX idx_knowledge_base_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- TABLE: conversations (Chat sessions)
-- ============================================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL, -- Anonymous session identifier
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  sentiment conversation_sentiment DEFAULT 'Neutral',
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  visitor_ip TEXT,
  visitor_user_agent TEXT,
  visitor_location JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_bot ON conversations(bot_id);
CREATE INDEX idx_conversations_owner ON conversations(owner_id);
CREATE INDEX idx_conversations_session ON conversations(session_id);
CREATE INDEX idx_conversations_started ON conversations(started_at DESC);

-- ============================================================================
-- TABLE: leads (Captured contact information)
-- ============================================================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  status lead_status NOT NULL DEFAULT 'New',
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_owner ON leads(owner_id);
CREATE INDEX idx_leads_bot ON leads(source_bot_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_score ON leads(score DESC);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created ON leads(created_at DESC);

-- ============================================================================
-- TABLE: marketing_content (Generated marketing materials)
-- ============================================================================

CREATE TABLE marketing_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
  content_type content_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  topic TEXT,
  tone TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_marketing_content_owner ON marketing_content(owner_id);
CREATE INDEX idx_marketing_content_type ON marketing_content(content_type);

-- ============================================================================
-- TABLE: billing_accounts (Stripe subscription management)
-- ============================================================================

CREATE TABLE billing_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan_id UUID REFERENCES plans(id),
  status billing_status NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  payment_method_last4 TEXT,
  payment_method_brand TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_accounts_owner ON billing_accounts(owner_id);
CREATE INDEX idx_billing_accounts_stripe ON billing_accounts(stripe_customer_id);

-- ============================================================================
-- TABLE: usage_events (Token/API usage tracking)
-- ============================================================================

CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'ai_completion', 'embedding', 'lead_capture', etc.
  tokens_used INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0, -- estimated cost in cents
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_events_owner ON usage_events(owner_id);
CREATE INDEX idx_usage_events_bot ON usage_events(bot_id);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_created ON usage_events(created_at DESC);

-- Partitioning hint: Consider partitioning by created_at for large-scale deployments

-- ============================================================================
-- TABLE: templates (Marketplace bot templates)
-- ============================================================================

CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  temperature DECIMAL(2,1) NOT NULL DEFAULT 0.7,
  theme_color TEXT NOT NULL DEFAULT '#3B82F6',
  avatar TEXT,
  sample_knowledge JSONB DEFAULT '[]'::jsonb,
  features TEXT[] DEFAULT '{}',
  rating DECIMAL(2,1) DEFAULT 0,
  install_count INTEGER DEFAULT 0,
  price_cents INTEGER DEFAULT 0, -- 0 = free
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_featured ON templates(is_featured) WHERE is_featured = true;
CREATE INDEX idx_templates_rating ON templates(rating DESC);

-- ============================================================================
-- TABLE: reseller_accounts (Partner/Reseller profiles)
-- ============================================================================

CREATE TABLE reseller_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  reseller_code TEXT NOT NULL UNIQUE,
  company_name TEXT,
  website TEXT,
  tier TEXT NOT NULL DEFAULT 'bronze', -- bronze, silver, gold, platinum
  commission_rate DECIMAL(4,2) NOT NULL DEFAULT 10.00, -- percentage
  total_revenue_cents INTEGER DEFAULT 0,
  pending_payout_cents INTEGER DEFAULT 0,
  payout_email TEXT,
  payout_method TEXT DEFAULT 'stripe', -- stripe, paypal, bank
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reseller_accounts_owner ON reseller_accounts(owner_id);
CREATE INDEX idx_reseller_accounts_code ON reseller_accounts(reseller_code);
CREATE INDEX idx_reseller_accounts_approved ON reseller_accounts(is_approved);

-- ============================================================================
-- TABLE: reseller_clients (Reseller -> Client relationships)
-- ============================================================================

CREATE TABLE reseller_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reseller_id UUID NOT NULL REFERENCES reseller_accounts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  lifetime_revenue_cents INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reseller_id, client_id)
);

CREATE INDEX idx_reseller_clients_reseller ON reseller_clients(reseller_id);
CREATE INDEX idx_reseller_clients_client ON reseller_clients(client_id);

-- ============================================================================
-- TABLE: referrals (Referral tracking)
-- ============================================================================

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reseller_id UUID NOT NULL REFERENCES reseller_accounts(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  referred_email TEXT, -- optional: pre-filled email for tracking
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signed_up_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ, -- when they became a paying customer
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  source TEXT, -- utm_source or custom tracking
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referrals_reseller ON referrals(reseller_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_client ON referrals(client_id);

-- ============================================================================
-- TABLE: commissions (Reseller commission records)
-- ============================================================================

CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reseller_id UUID NOT NULL REFERENCES reseller_accounts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  commission_rate DECIMAL(4,2) NOT NULL,
  source_event TEXT NOT NULL, -- 'subscription', 'upgrade', 'renewal'
  status commission_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  payout_reference TEXT, -- Stripe transfer ID or similar
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_commissions_reseller ON commissions(reseller_id);
CREATE INDEX idx_commissions_client ON commissions(client_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_created ON commissions(created_at DESC);

-- ============================================================================
-- TABLE: website_pages (AI-generated website pages)
-- ============================================================================

CREATE TABLE website_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT,
  meta_keywords TEXT[],
  content JSONB NOT NULL DEFAULT '{}'::jsonb, -- structured page content
  html_content TEXT, -- rendered HTML
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  custom_domain TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, slug)
);

CREATE INDEX idx_website_pages_owner ON website_pages(owner_id);
CREATE INDEX idx_website_pages_bot ON website_pages(bot_id);
CREATE INDEX idx_website_pages_published ON website_pages(is_published) WHERE is_published = true;
CREATE INDEX idx_website_pages_slug ON website_pages(slug);

-- ============================================================================
-- TABLE: phone_calls (Twilio call logs)
-- ============================================================================

CREATE TABLE phone_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  twilio_call_sid TEXT UNIQUE,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound', -- 'inbound', 'outbound'
  status call_status NOT NULL DEFAULT 'completed',
  duration_seconds INTEGER DEFAULT 0,
  transcript TEXT,
  transcript_segments JSONB DEFAULT '[]'::jsonb,
  recording_url TEXT,
  sentiment conversation_sentiment,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  cost_cents INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_phone_calls_owner ON phone_calls(owner_id);
CREATE INDEX idx_phone_calls_bot ON phone_calls(bot_id);
CREATE INDEX idx_phone_calls_twilio ON phone_calls(twilio_call_sid);
CREATE INDEX idx_phone_calls_started ON phone_calls(started_at DESC);

-- ============================================================================
-- FUNCTIONS: Utility functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with that column
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON bots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketing_content_updated_at BEFORE UPDATE ON marketing_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_accounts_updated_at BEFORE UPDATE ON billing_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reseller_accounts_updated_at BEFORE UPDATE ON reseller_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reseller_clients_updated_at BEFORE UPDATE ON reseller_clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_pages_updated_at BEFORE UPDATE ON website_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment bot conversation count
CREATE OR REPLACE FUNCTION increment_bot_conversations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bots SET conversations_count = conversations_count + 1 WHERE id = NEW.bot_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_conversations_on_insert
AFTER INSERT ON conversations
FOR EACH ROW EXECUTE FUNCTION increment_bot_conversations();

-- Function to increment template install count
CREATE OR REPLACE FUNCTION increment_template_installs()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.metadata->>'template_id' IS NOT NULL THEN
    UPDATE templates SET install_count = install_count + 1
    WHERE id = (NEW.metadata->>'template_id')::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_template_installs_on_bot_create
AFTER INSERT ON bots
FOR EACH ROW EXECUTE FUNCTION increment_template_installs();

-- Function for semantic search in knowledge base
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding vector(1536),
  match_bot_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE kb.bot_id = match_bot_id
    AND kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to get monthly usage for a user
CREATE OR REPLACE FUNCTION get_monthly_usage(user_id uuid, usage_month date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_tokens bigint,
  total_conversations bigint,
  total_leads bigint,
  total_cost_cents bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ue.tokens_used), 0)::bigint AS total_tokens,
    COUNT(DISTINCT c.id)::bigint AS total_conversations,
    COUNT(DISTINCT l.id)::bigint AS total_leads,
    COALESCE(SUM(ue.cost_cents), 0)::bigint AS total_cost_cents
  FROM profiles p
  LEFT JOIN usage_events ue ON ue.owner_id = p.id
    AND date_trunc('month', ue.created_at) = date_trunc('month', usage_month::timestamptz)
  LEFT JOIN conversations c ON c.owner_id = p.id
    AND date_trunc('month', c.created_at) = date_trunc('month', usage_month::timestamptz)
  LEFT JOIN leads l ON l.owner_id = p.id
    AND date_trunc('month', l.created_at) = date_trunc('month', usage_month::timestamptz)
  WHERE p.id = user_id
  GROUP BY p.id;
END;
$$;

-- ============================================================================
-- VIEWS: Useful aggregated views
-- ============================================================================

-- View for reseller dashboard stats
CREATE OR REPLACE VIEW reseller_stats AS
SELECT
  ra.id AS reseller_id,
  ra.owner_id,
  ra.reseller_code,
  ra.tier,
  ra.commission_rate,
  COUNT(DISTINCT rc.client_id) AS total_clients,
  COALESCE(SUM(c.amount_cents) FILTER (WHERE c.status = 'paid'), 0) AS total_earned_cents,
  COALESCE(SUM(c.amount_cents) FILTER (WHERE c.status = 'pending'), 0) AS pending_payout_cents
FROM reseller_accounts ra
LEFT JOIN reseller_clients rc ON rc.reseller_id = ra.id AND rc.is_active = true
LEFT JOIN commissions c ON c.reseller_id = ra.id
GROUP BY ra.id, ra.owner_id, ra.reseller_code, ra.tier, ra.commission_rate;

-- View for admin dashboard metrics
CREATE OR REPLACE VIEW admin_metrics AS
SELECT
  (SELECT COUNT(*) FROM profiles WHERE status = 'Active') AS total_active_users,
  (SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '30 days') AS new_users_30d,
  (SELECT COUNT(*) FROM bots WHERE active = true) AS total_active_bots,
  (SELECT COUNT(*) FROM conversations WHERE created_at > NOW() - INTERVAL '30 days') AS conversations_30d,
  (SELECT COUNT(*) FROM leads WHERE created_at > NOW() - INTERVAL '30 days') AS leads_30d,
  (SELECT COALESCE(SUM(amount_cents), 0) FROM commissions WHERE status = 'pending') AS pending_commissions_cents,
  (SELECT COUNT(*) FROM reseller_accounts WHERE is_approved = false) AS pending_partner_approvals;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
