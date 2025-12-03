-- BuildMyBot.app Initial Database Schema
-- This migration creates all core tables for the platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  company_name TEXT,
  role TEXT NOT NULL DEFAULT 'OWNER' CHECK (role IN ('OWNER', 'ADMIN', 'RESELLER')),
  plan TEXT NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'STARTER', 'PROFESSIONAL', 'EXECUTIVE', 'ENTERPRISE')),
  avatar_url TEXT,
  reseller_code TEXT UNIQUE,
  reseller_client_count INTEGER DEFAULT 0,
  custom_domain TEXT,
  referred_by TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BOTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  temperature DECIMAL(2,1) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 1),
  active BOOLEAN DEFAULT true,
  conversations_count INTEGER DEFAULT 0,
  theme_color TEXT DEFAULT '#3B82F6',
  website_url TEXT,
  max_messages INTEGER,
  randomize_identity BOOLEAN DEFAULT false,
  avatar TEXT,
  response_delay INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bots_owner ON bots(owner_id);
CREATE INDEX idx_bots_active ON bots(active);

-- ============================================================================
-- KNOWLEDGE_BASE TABLE (with pgvector for embeddings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'url', 'text')),
  source_url TEXT,
  embedding vector(1536), -- OpenAI ada-002 produces 1536-dimensional vectors
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_base_bot ON knowledge_base(bot_id);
CREATE INDEX idx_knowledge_base_owner ON knowledge_base(owner_id);
CREATE INDEX idx_knowledge_base_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  session_id TEXT,
  messages JSONB NOT NULL DEFAULT '[]',
  sentiment TEXT CHECK (sentiment IN ('Positive', 'Neutral', 'Negative')),
  lead_captured BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_bot ON conversations(bot_id);
CREATE INDEX idx_conversations_owner ON conversations(owner_id);
CREATE INDEX idx_conversations_session ON conversations(session_id);

-- ============================================================================
-- LEADS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Qualified', 'Closed')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_owner ON leads(owner_id);
CREATE INDEX idx_leads_bot ON leads(source_bot_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_score ON leads(score DESC);

-- ============================================================================
-- MARKETING_CONTENT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketing_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'ad', 'blog', 'script', 'social', 'thread')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  platform TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_content_owner ON marketing_content(owner_id);
CREATE INDEX idx_marketing_content_type ON marketing_content(type);

-- ============================================================================
-- BILLING_ACCOUNTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS billing_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'FREE',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_accounts_owner ON billing_accounts(owner_id);
CREATE INDEX idx_billing_accounts_stripe_customer ON billing_accounts(stripe_customer_id);

-- ============================================================================
-- USAGE_EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('conversation', 'lead_created', 'ai_tokens', 'knowledge_base_query')),
  resource_id UUID,
  quantity INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_events_owner ON usage_events(owner_id);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_created ON usage_events(created_at DESC);

-- ============================================================================
-- TEMPLATES TABLE (Marketplace)
-- ============================================================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  model TEXT DEFAULT 'gpt-4o-mini',
  temperature DECIMAL(2,1) DEFAULT 0.7,
  preview_image TEXT,
  is_featured BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_featured ON templates(is_featured);

-- ============================================================================
-- PLANS TABLE (Subscription Tiers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  price_monthly INTEGER NOT NULL,
  price_yearly INTEGER,
  max_bots INTEGER NOT NULL,
  max_conversations INTEGER NOT NULL,
  features JSONB DEFAULT '[]',
  stripe_price_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RESELLER_ACCOUNTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS reseller_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  commission_rate DECIMAL(3,2) DEFAULT 0.20,
  tier TEXT DEFAULT 'Bronze' CHECK (tier IN ('Bronze', 'Silver', 'Gold', 'Platinum')),
  total_clients INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  pending_payout DECIMAL(10,2) DEFAULT 0,
  white_label_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reseller_accounts_owner ON reseller_accounts(owner_id);
CREATE INDEX idx_reseller_accounts_code ON reseller_accounts(referral_code);

-- ============================================================================
-- RESELLER_CLIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS reseller_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reseller_id UUID NOT NULL REFERENCES reseller_accounts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'churned')),
  lifetime_value DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reseller_id, client_id)
);

CREATE INDEX idx_reseller_clients_reseller ON reseller_clients(reseller_id);
CREATE INDEX idx_reseller_clients_client ON reseller_clients(client_id);

-- ============================================================================
-- REFERRALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reseller_id UUID NOT NULL REFERENCES reseller_accounts(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'expired')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ
);

CREATE INDEX idx_referrals_reseller ON referrals(reseller_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);

-- ============================================================================
-- COMMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reseller_id UUID NOT NULL REFERENCES reseller_accounts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(3,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commissions_reseller ON commissions(reseller_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_period ON commissions(period_start, period_end);

-- ============================================================================
-- WEBSITE_PAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS website_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content JSONB NOT NULL,
  seo_metadata JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  custom_domain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, slug)
);

CREATE INDEX idx_website_pages_owner ON website_pages(owner_id);
CREATE INDEX idx_website_pages_published ON website_pages(is_published);

-- ============================================================================
-- PHONE_CALLS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS phone_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  duration INTEGER, -- in seconds
  transcript TEXT,
  recording_url TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer')),
  twilio_call_sid TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_phone_calls_owner ON phone_calls(owner_id);
CREATE INDEX idx_phone_calls_bot ON phone_calls(bot_id);
CREATE INDEX idx_phone_calls_created ON phone_calls(created_at DESC);

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON bots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketing_content_updated_at BEFORE UPDATE ON marketing_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_accounts_updated_at BEFORE UPDATE ON billing_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reseller_accounts_updated_at BEFORE UPDATE ON reseller_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reseller_clients_updated_at BEFORE UPDATE ON reseller_clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_pages_updated_at BEFORE UPDATE ON website_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
