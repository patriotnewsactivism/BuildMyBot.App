-- BuildMyBot Complete Database Schema
-- Migration: 20250109000000_initial_schema
-- Description: Complete production schema with pgvector, RLS, and all tables

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('OWNER', 'ADMIN', 'RESELLER');
CREATE TYPE plan_type AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'EXECUTIVE', 'ENTERPRISE');
CREATE TYPE lead_status AS ENUM ('New', 'Contacted', 'Qualified', 'Closed');
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE sentiment_type AS ENUM ('Positive', 'Neutral', 'Negative');
CREATE TYPE user_status AS ENUM ('Active', 'Suspended', 'Pending');
CREATE TYPE billing_status AS ENUM ('active', 'past_due', 'canceled', 'trialing');
CREATE TYPE usage_event_type AS ENUM ('api_call', 'message', 'phone_minute', 'storage_mb', 'lead_capture');
CREATE TYPE call_status AS ENUM ('initiated', 'in-progress', 'completed', 'failed');
CREATE TYPE earnings_status AS ENUM ('pending', 'paid', 'failed');

-- ============================================
-- TABLES
-- ============================================

-- Profiles (Users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    role user_role NOT NULL DEFAULT 'OWNER',
    plan plan_type NOT NULL DEFAULT 'FREE',
    company_name TEXT DEFAULT '',
    avatar_url TEXT,
    reseller_code TEXT UNIQUE,
    reseller_client_count INTEGER DEFAULT 0,
    custom_domain TEXT,
    referred_by TEXT,
    status user_status DEFAULT 'Active',
    stripe_customer_id TEXT UNIQUE,
    phone_config JSONB DEFAULT '{"enabled": false}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bots
CREATE TABLE bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'general',
    system_prompt TEXT DEFAULT 'You are a helpful assistant.',
    model TEXT DEFAULT 'gpt-4o-mini',
    temperature NUMERIC DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
    active BOOLEAN DEFAULT true,
    conversations_count INTEGER DEFAULT 0,
    theme_color TEXT DEFAULT '#2563eb',
    website_url TEXT,
    max_messages INTEGER,
    randomize_identity BOOLEAN DEFAULT false,
    avatar TEXT,
    response_delay INTEGER DEFAULT 0,
    embed_code UUID DEFAULT uuid_generate_v4(),
    knowledge_base TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Base (with pgvector for RAG)
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT,
    file_type TEXT DEFAULT 'text',
    content TEXT NOT NULL,
    embedding vector(3072),
    chunk_index INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    score INTEGER DEFAULT 50 CHECK (score >= 0 AND score <= 100),
    status lead_status DEFAULT 'New',
    source_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    sentiment sentiment_type DEFAULT 'Neutral',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Phone Calls
CREATE TABLE phone_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
    twilio_call_sid TEXT UNIQUE,
    from_number TEXT,
    to_number TEXT,
    status call_status DEFAULT 'initiated',
    duration_seconds INTEGER,
    recording_url TEXT,
    transcript TEXT,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Billing Accounts
CREATE TABLE billing_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    plan plan_type DEFAULT 'FREE',
    status billing_status DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage Events
CREATE TABLE usage_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type usage_event_type NOT NULL,
    quantity NUMERIC DEFAULT 1,
    bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    synced_to_stripe BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reseller Earnings
CREATE TABLE reseller_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 0,
    commission_rate NUMERIC DEFAULT 0.20,
    stripe_transfer_id TEXT UNIQUE,
    status earnings_status DEFAULT 'pending',
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- Marketplace Templates
CREATE TABLE marketplace_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    bot_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    preview_url TEXT,
    price INTEGER DEFAULT 0,
    install_count INTEGER DEFAULT 0,
    rating NUMERIC,
    featured BOOLEAN DEFAULT false,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketing Content
CREATE TABLE marketing_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Website Pages
CREATE TABLE website_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    seo_metadata JSONB DEFAULT '{}'::jsonb,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reseller_id, referred_user_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Vector search index (HNSW for fast similarity)
CREATE INDEX ON knowledge_base USING hnsw (embedding vector_cosine_ops);

-- Full-text search index
CREATE INDEX idx_knowledge_base_content_fts ON knowledge_base USING gin (to_tsvector('english', content));

-- Query performance indexes
CREATE INDEX idx_bots_user_id ON bots(user_id);
CREATE INDEX idx_bots_active ON bots(user_id, active);
CREATE INDEX idx_bots_embed_code ON bots(embed_code);
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(user_id, status, created_at DESC);
CREATE INDEX idx_leads_bot_id ON leads(bot_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, timestamp);
CREATE INDEX idx_conversations_bot ON conversations(bot_id, created_at DESC);
CREATE INDEX idx_conversations_session ON conversations(session_id);
CREATE INDEX idx_usage_events_user ON usage_events(user_id, created_at DESC);
CREATE INDEX idx_usage_events_sync ON usage_events(synced_to_stripe) WHERE synced_to_stripe = false;
CREATE INDEX idx_phone_calls_user ON phone_calls(user_id, status, created_at DESC);
CREATE INDEX idx_reseller_earnings_reseller ON reseller_earnings(reseller_id, status);
CREATE INDEX idx_marketplace_templates_approved ON marketplace_templates(approved, featured, category);
CREATE INDEX idx_profiles_reseller_code ON profiles(reseller_code);
CREATE INDEX idx_profiles_referred_by ON profiles(referred_by);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_knowledge_base(
    query_embedding vector(3072),
    match_bot_id UUID,
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    file_name TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.content,
        kb.file_name,
        1 - (kb.embedding <=> query_embedding) AS similarity
    FROM knowledge_base kb
    WHERE kb.bot_id = match_bot_id
      AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Increment bot conversation count
CREATE OR REPLACE FUNCTION increment_bot_conversations()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE bots SET conversations_count = conversations_count + 1 WHERE id = NEW.bot_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Increment reseller client count
CREATE OR REPLACE FUNCTION increment_reseller_clients()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referred_by IS NOT NULL THEN
        UPDATE profiles
        SET reseller_client_count = reseller_client_count + 1
        WHERE reseller_code = NEW.referred_by;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON bots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_accounts_updated_at BEFORE UPDATE ON billing_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_templates_updated_at BEFORE UPDATE ON marketplace_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_website_pages_updated_at BEFORE UPDATE ON website_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Conversation count trigger
CREATE TRIGGER increment_conversations_on_insert AFTER INSERT ON conversations
    FOR EACH ROW EXECUTE FUNCTION increment_bot_conversations();

-- Reseller client count trigger
CREATE TRIGGER increment_reseller_on_signup AFTER INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION increment_reseller_clients();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- BOTS POLICIES
CREATE POLICY "Users can view own bots" ON bots
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bots" ON bots
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bots" ON bots
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bots" ON bots
    FOR DELETE USING (auth.uid() = user_id);

-- Public bot access via embed_code (for chat widget)
CREATE POLICY "Anyone can view bots by embed_code" ON bots
    FOR SELECT USING (true);

-- KNOWLEDGE_BASE POLICIES
CREATE POLICY "Users can view own knowledge base" ON knowledge_base
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own knowledge base" ON knowledge_base
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own knowledge base" ON knowledge_base
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own knowledge base" ON knowledge_base
    FOR DELETE USING (auth.uid() = user_id);

-- LEADS POLICIES
CREATE POLICY "Users can view own leads" ON leads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads" ON leads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads" ON leads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads" ON leads
    FOR DELETE USING (auth.uid() = user_id);

-- CONVERSATIONS POLICIES
CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- MESSAGES POLICIES (via conversation ownership)
CREATE POLICY "Users can view messages of own conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages to own conversations" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- PHONE_CALLS POLICIES
CREATE POLICY "Users can view own phone calls" ON phone_calls
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own phone calls" ON phone_calls
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phone calls" ON phone_calls
    FOR UPDATE USING (auth.uid() = user_id);

-- BILLING_ACCOUNTS POLICIES
CREATE POLICY "Users can view own billing" ON billing_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own billing" ON billing_accounts
    FOR UPDATE USING (auth.uid() = user_id);

-- USAGE_EVENTS POLICIES
CREATE POLICY "Users can view own usage" ON usage_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON usage_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RESELLER_EARNINGS POLICIES
CREATE POLICY "Resellers can view own earnings" ON reseller_earnings
    FOR SELECT USING (auth.uid() = reseller_id);

-- MARKETPLACE_TEMPLATES POLICIES
CREATE POLICY "Anyone can view approved templates" ON marketplace_templates
    FOR SELECT USING (approved = true);

CREATE POLICY "Creators can view own templates" ON marketplace_templates
    FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert templates" ON marketplace_templates
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own templates" ON marketplace_templates
    FOR UPDATE USING (auth.uid() = creator_id);

-- MARKETING_CONTENT POLICIES
CREATE POLICY "Users can view own marketing content" ON marketing_content
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own marketing content" ON marketing_content
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own marketing content" ON marketing_content
    FOR DELETE USING (auth.uid() = user_id);

-- WEBSITE_PAGES POLICIES
CREATE POLICY "Users can view own website pages" ON website_pages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own website pages" ON website_pages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own website pages" ON website_pages
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own website pages" ON website_pages
    FOR DELETE USING (auth.uid() = user_id);

-- Published pages are public
CREATE POLICY "Anyone can view published pages" ON website_pages
    FOR SELECT USING (published = true);

-- REFERRALS POLICIES
CREATE POLICY "Resellers can view own referrals" ON referrals
    FOR SELECT USING (auth.uid() = reseller_id);

CREATE POLICY "System can insert referrals" ON referrals
    FOR INSERT WITH CHECK (auth.uid() = reseller_id OR auth.uid() = referred_user_id);

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage bucket for knowledge base files
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-files', 'knowledge-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for knowledge-files bucket
CREATE POLICY "Users can upload own knowledge files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'knowledge-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own knowledge files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'knowledge-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own knowledge files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'knowledge-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default marketplace templates
INSERT INTO marketplace_templates (name, description, category, bot_config, approved, featured) VALUES
('Customer Support Bot', 'Professional customer service bot for handling inquiries and support tickets', 'support',
 '{"systemPrompt": "You are a helpful customer support agent. Be professional, empathetic, and solution-oriented.", "model": "gpt-4o-mini", "temperature": 0.7}',
 true, true),
('Sales Assistant', 'Engaging sales bot that qualifies leads and books appointments', 'sales',
 '{"systemPrompt": "You are a friendly sales assistant. Your goal is to understand customer needs, qualify leads, and schedule meetings with the sales team.", "model": "gpt-4o-mini", "temperature": 0.8}',
 true, true),
('Real Estate Agent', 'Property listing expert that helps buyers find their dream home', 'real-estate',
 '{"systemPrompt": "You are a knowledgeable real estate agent assistant. Help users find properties, answer questions about listings, and schedule viewings.", "model": "gpt-4o-mini", "temperature": 0.7}',
 true, false),
('Healthcare Receptionist', 'Medical office assistant for appointment scheduling and patient inquiries', 'healthcare',
 '{"systemPrompt": "You are a professional medical receptionist. Help patients schedule appointments, answer general questions, and provide office information. Always advise patients to contact emergency services for urgent medical issues.", "model": "gpt-4o-mini", "temperature": 0.5}',
 true, false),
('Restaurant Concierge', 'Restaurant booking and menu assistant', 'hospitality',
 '{"systemPrompt": "You are a friendly restaurant concierge. Help guests with reservations, menu questions, dietary accommodations, and special requests.", "model": "gpt-4o-mini", "temperature": 0.8}',
 true, false)
ON CONFLICT DO NOTHING;

-- ============================================
-- GRANTS (for service role access)
-- ============================================

-- Grant service role full access (for Edge Functions)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
