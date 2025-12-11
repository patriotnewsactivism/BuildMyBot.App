-- Rate Limiting and Analytics Tables Migration
-- Migration: 20250111000000_rate_limiting_and_analytics
-- Description: Adds rate limiting table and analytics tracking for production

-- ============================================
-- API RATE LIMITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint ON api_rate_limits(user_id, endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint ON api_rate_limits(ip_address, endpoint, created_at DESC);

-- Auto-cleanup old rate limit records (keep only last hour)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM api_rate_limits WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ANALYTICS EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    page_url TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_bot ON analytics_events(bot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);

-- RLS for analytics_events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics" ON analytics_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics" ON analytics_events
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============================================
-- DAILY ANALYTICS AGGREGATES
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    conversations INTEGER DEFAULT 0,
    messages INTEGER DEFAULT 0,
    leads_captured INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    avg_session_duration INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, bot_id, date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_user_date ON analytics_daily(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_bot_date ON analytics_daily(bot_id, date DESC);

-- RLS for daily analytics
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily analytics" ON analytics_daily
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- FUNCTION: Aggregate daily analytics
-- ============================================
CREATE OR REPLACE FUNCTION aggregate_daily_analytics()
RETURNS void AS $$
DECLARE
    target_date DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
    -- Aggregate conversations
    INSERT INTO analytics_daily (user_id, bot_id, date, conversations, messages, leads_captured, unique_visitors)
    SELECT
        c.user_id,
        c.bot_id,
        target_date,
        COUNT(DISTINCT c.id) as conversations,
        COALESCE(SUM(msg_count.count), 0) as messages,
        0 as leads_captured,
        COUNT(DISTINCT c.session_id) as unique_visitors
    FROM conversations c
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as count FROM messages m WHERE m.conversation_id = c.id
    ) msg_count ON true
    WHERE DATE(c.created_at) = target_date
    GROUP BY c.user_id, c.bot_id
    ON CONFLICT (user_id, bot_id, date)
    DO UPDATE SET
        conversations = EXCLUDED.conversations,
        messages = EXCLUDED.messages,
        unique_visitors = EXCLUDED.unique_visitors;

    -- Update leads_captured
    UPDATE analytics_daily ad
    SET leads_captured = (
        SELECT COUNT(*) FROM leads l
        WHERE l.user_id = ad.user_id
        AND (l.bot_id = ad.bot_id OR ad.bot_id IS NULL)
        AND DATE(l.created_at) = ad.date
    )
    WHERE ad.date = target_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STRIPE PRODUCTS/PRICES (for reference)
-- ============================================
CREATE TABLE IF NOT EXISTS stripe_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_product_id TEXT UNIQUE NOT NULL,
    stripe_price_id TEXT UNIQUE NOT NULL,
    plan_type TEXT NOT NULL,
    name TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    interval TEXT DEFAULT 'month',
    active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default products (update with real Stripe IDs after creation)
INSERT INTO stripe_products (stripe_product_id, stripe_price_id, plan_type, name, price_cents, interval) VALUES
    ('prod_starter', 'price_starter', 'STARTER', 'Starter Plan', 2900, 'month'),
    ('prod_professional', 'price_professional', 'PROFESSIONAL', 'Professional Plan', 9900, 'month'),
    ('prod_executive', 'price_executive', 'EXECUTIVE', 'Executive Plan', 19900, 'month'),
    ('prod_enterprise', 'price_enterprise', 'ENTERPRISE', 'Enterprise Plan', 39900, 'month')
ON CONFLICT (stripe_product_id) DO NOTHING;

-- ============================================
-- TRANSCRIPT CONCATENATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION concat_transcript(call_id TEXT, new_text TEXT)
RETURNS TEXT AS $$
DECLARE
    current_transcript TEXT;
BEGIN
    SELECT transcript INTO current_transcript
    FROM phone_calls
    WHERE twilio_call_sid = call_id;

    RETURN COALESCE(current_transcript, '') || new_text;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ADD is_master_admin TO PROFILES
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'is_master_admin'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_master_admin BOOLEAN DEFAULT false;
    END IF;
END $$;

-- ============================================
-- GRANTS
-- ============================================
GRANT ALL ON api_rate_limits TO service_role;
GRANT ALL ON analytics_events TO service_role;
GRANT ALL ON analytics_daily TO service_role;
GRANT ALL ON stripe_products TO service_role;
