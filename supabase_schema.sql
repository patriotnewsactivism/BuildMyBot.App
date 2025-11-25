-- =============================================================================
-- BuildMyBot.App - Supabase Database Schema
-- =============================================================================
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
--
-- This schema supports:
-- - Multi-tenant SaaS architecture
-- - Bot creation and management
-- - Conversation logging
-- - Lead capture and scoring
-- - Reseller/partner program
-- - Subscription management
-- - Knowledge base with vector search (RAG)
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector"; -- for RAG/semantic search

-- =============================================================================
-- 1. USERS & AUTHENTICATION
-- =============================================================================

CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    company_name TEXT,
    avatar_url TEXT,

    -- Plan & billing
    plan TEXT NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'STARTER', 'PROFESSIONAL', 'EXECUTIVE', 'ENTERPRISE')),
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT,
    subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
    subscription_current_period_end TIMESTAMPTZ,

    -- Reseller/partner program
    role TEXT NOT NULL DEFAULT 'OWNER' CHECK (role IN ('OWNER', 'ADMIN', 'RESELLER')),
    reseller_code TEXT UNIQUE,
    reseller_tier TEXT CHECK (reseller_tier IN ('Bronze', 'Silver', 'Gold', 'Platinum')),
    referred_by_reseller_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

    -- White-label
    custom_domain TEXT UNIQUE,
    white_label_enabled BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,

    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_stripe_customer ON public.users(stripe_customer_id);
CREATE INDEX idx_users_reseller_code ON public.users(reseller_code);
CREATE INDEX idx_users_referred_by ON public.users(referred_by_reseller_id);

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- =============================================================================
-- 2. BOTS
-- =============================================================================

CREATE TABLE public.bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Bot configuration
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Customer Support', 'Sales', 'Booking', 'Custom')),
    system_prompt TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    temperature DECIMAL(2, 1) NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),

    -- Appearance
    theme_color TEXT DEFAULT '#1e3a8a',
    avatar TEXT, -- Base64 or URL

    -- Behavior settings
    active BOOLEAN DEFAULT TRUE,
    max_messages INTEGER DEFAULT 20,
    randomize_identity BOOLEAN DEFAULT TRUE,
    response_delay INTEGER DEFAULT 2000, -- milliseconds

    -- Website integration
    website_url TEXT,
    embed_code TEXT,

    -- Stats
    conversations_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_bots_user_id ON public.bots(user_id);
CREATE INDEX idx_bots_active ON public.bots(active) WHERE active = TRUE;

-- RLS Policies
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bots" ON public.bots
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bots" ON public.bots
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bots" ON public.bots
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bots" ON public.bots
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- 3. KNOWLEDGE BASE (for RAG)
-- =============================================================================

CREATE TABLE public.knowledge_base_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- File info
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL, -- bytes
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Supabase Storage path

    -- Processing status
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
    error_message TEXT,

    -- Metadata
    chunk_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Document chunks with embeddings for semantic search
CREATE TABLE public.knowledge_base_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.knowledge_base_documents(id) ON DELETE CASCADE,
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,

    -- Content
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,

    -- Vector embedding (OpenAI text-embedding-3-small = 1536 dimensions)
    embedding VECTOR(1536),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vector similarity search index
CREATE INDEX idx_knowledge_chunks_embedding ON public.knowledge_base_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_knowledge_chunks_bot ON public.knowledge_base_chunks(bot_id);

-- RLS
ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own knowledge base" ON public.knowledge_base_documents
    FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- 4. CONVERSATIONS & MESSAGES
-- =============================================================================

CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Visitor info
    visitor_id TEXT, -- Anonymous tracking ID
    visitor_name TEXT,
    visitor_email TEXT,
    visitor_phone TEXT,
    visitor_ip TEXT,
    visitor_location JSONB, -- {city, country, etc.}

    -- Conversation metadata
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'transferred')),
    sentiment TEXT CHECK (sentiment IN ('Positive', 'Neutral', 'Negative')),

    -- Stats
    message_count INTEGER DEFAULT 0,
    duration_seconds INTEGER, -- calculated when completed

    -- Lead scoring
    lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
    is_qualified_lead BOOLEAN DEFAULT FALSE,

    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,

    -- Message content
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,

    -- Metadata
    model TEXT, -- e.g., 'gpt-4o-mini'
    tokens_used INTEGER,
    latency_ms INTEGER,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_bot ON public.conversations(bot_id);
CREATE INDEX idx_conversations_user ON public.conversations(user_id);
CREATE INDEX idx_conversations_visitor_email ON public.conversations(visitor_email);
CREATE INDEX idx_conversations_started_at ON public.conversations(started_at DESC);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON public.conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages in own conversations" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- =============================================================================
-- 5. LEADS
-- =============================================================================

CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,

    -- Lead info
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,

    -- Lead management
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Qualified', 'Closed', 'Lost')),
    score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),

    -- Metadata
    source TEXT DEFAULT 'chatbot',
    notes TEXT,
    tags TEXT[], -- Array of tags

    -- Assignment
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    contacted_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_leads_user ON public.leads(user_id);
CREATE INDEX idx_leads_bot ON public.leads(bot_id);
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_score ON public.leads(score DESC);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);

-- RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own leads" ON public.leads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own leads" ON public.leads
    FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- 6. RESELLER / PARTNER PROGRAM
-- =============================================================================

CREATE TABLE public.reseller_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Stats
    total_clients INTEGER DEFAULT 0,
    active_clients INTEGER DEFAULT 0,
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    total_commissions DECIMAL(10, 2) DEFAULT 0,
    pending_payout DECIMAL(10, 2) DEFAULT 0,

    -- Current tier (calculated)
    current_tier TEXT CHECK (current_tier IN ('Bronze', 'Silver', 'Gold', 'Platinum')),
    commission_rate DECIMAL(3, 2), -- e.g., 0.20 for 20%

    -- Timestamps
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.reseller_referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Commission tracking
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'churned', 'suspended')),
    monthly_revenue DECIMAL(10, 2) DEFAULT 0,
    commission_amount DECIMAL(10, 2) DEFAULT 0,
    lifetime_commissions DECIMAL(10, 2) DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.reseller_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reseller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Payout details
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
    method TEXT CHECK (method IN ('stripe', 'paypal', 'wire')),

    -- Stripe Connect
    stripe_transfer_id TEXT,

    -- Timestamps
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,

    -- Metadata
    notes TEXT
);

-- Indexes
CREATE INDEX idx_reseller_stats_reseller ON public.reseller_stats(reseller_id);
CREATE INDEX idx_referrals_reseller ON public.reseller_referrals(reseller_id);
CREATE INDEX idx_referrals_referred_user ON public.reseller_referrals(referred_user_id);

-- RLS
ALTER TABLE public.reseller_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resellers can view own stats" ON public.reseller_stats
    FOR SELECT USING (auth.uid() = reseller_id);

-- =============================================================================
-- 7. SUBSCRIPTIONS & USAGE
-- =============================================================================

CREATE TABLE public.usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Usage tracking
    resource_type TEXT NOT NULL CHECK (resource_type IN ('conversation', 'message', 'storage', 'api_call')),
    quantity INTEGER DEFAULT 1,

    -- Billing
    billable BOOLEAN DEFAULT TRUE,
    overage BOOLEAN DEFAULT FALSE, -- Exceeded plan limits
    cost DECIMAL(10, 4), -- For overage billing

    -- Metadata
    bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
    metadata JSONB,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partitioned by month for performance
CREATE INDEX idx_usage_logs_user_date ON public.usage_logs(user_id, created_at DESC);
CREATE INDEX idx_usage_logs_billable ON public.usage_logs(user_id, billable) WHERE billable = TRUE;

-- =============================================================================
-- 8. WEBHOOKS (Outgoing to customers)
-- =============================================================================

CREATE TABLE public.webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Endpoint config
    url TEXT NOT NULL,
    events TEXT[] NOT NULL, -- e.g., ['lead.captured', 'conversation.completed']
    secret TEXT, -- For signature verification

    -- Status
    active BOOLEAN DEFAULT TRUE,

    -- Stats
    total_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_delivery_at TIMESTAMPTZ
);

CREATE TABLE public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,

    -- Delivery details
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
    response_code INTEGER,
    response_body TEXT,

    -- Retry tracking
    attempt_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);

-- =============================================================================
-- 9. PHONE AGENT (Twilio Integration)
-- =============================================================================

CREATE TABLE public.phone_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,

    -- Twilio details
    twilio_call_sid TEXT UNIQUE NOT NULL,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,

    -- Call details
    status TEXT CHECK (status IN ('initiated', 'ringing', 'in-progress', 'completed', 'busy', 'no-answer', 'failed')),
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    duration_seconds INTEGER,

    -- Recording
    recording_url TEXT,
    transcription TEXT,

    -- AI details
    voice TEXT DEFAULT 'alloy', -- OpenAI voice

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- =============================================================================
-- 10. ANALYTICS & METRICS
-- =============================================================================

-- Pre-aggregated analytics for dashboard performance
CREATE TABLE public.daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,

    -- Date
    date DATE NOT NULL,

    -- Metrics
    conversations INTEGER DEFAULT 0,
    messages INTEGER DEFAULT 0,
    leads INTEGER DEFAULT 0,
    qualified_leads INTEGER DEFAULT 0,
    avg_sentiment_score DECIMAL(3, 2),
    avg_lead_score INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, bot_id, date)
);

CREATE INDEX idx_daily_analytics_user_date ON public.daily_analytics(user_id, date DESC);
CREATE INDEX idx_daily_analytics_bot_date ON public.daily_analytics(bot_id, date DESC);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON public.bots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calculate reseller tier based on client count
CREATE OR REPLACE FUNCTION calculate_reseller_tier(client_count INTEGER)
RETURNS TABLE(tier TEXT, commission_rate DECIMAL) AS $$
BEGIN
    IF client_count >= 250 THEN
        RETURN QUERY SELECT 'Platinum'::TEXT, 0.50::DECIMAL;
    ELSIF client_count >= 150 THEN
        RETURN QUERY SELECT 'Gold'::TEXT, 0.40::DECIMAL;
    ELSIF client_count >= 50 THEN
        RETURN QUERY SELECT 'Silver'::TEXT, 0.30::DECIMAL;
    ELSE
        RETURN QUERY SELECT 'Bronze'::TEXT, 0.20::DECIMAL;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SEED DATA (Optional - for development)
-- =============================================================================

-- Create admin user (update with your email)
-- INSERT INTO public.users (email, name, role, plan)
-- VALUES ('admin@buildmybot.app', 'Admin User', 'ADMIN', 'ENTERPRISE');

-- =============================================================================
-- COMPLETED
-- =============================================================================
-- Run these commands to verify:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Expected: 18 tables
-- =============================================================================
