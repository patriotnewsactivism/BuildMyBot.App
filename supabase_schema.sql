-- BuildMyBot.App - Complete Database Schema
-- This schema supports: Multi-tenant SaaS, Reseller system, CRM, AI Bots, Analytics

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- =============================================
-- PROFILES TABLE (User Accounts)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  company_name TEXT,
  role TEXT DEFAULT 'OWNER' CHECK (role IN ('OWNER', 'ADMIN', 'RESELLER')),
  plan TEXT DEFAULT 'FREE' CHECK (plan IN ('FREE', 'STARTER', 'PROFESSIONAL', 'EXECUTIVE', 'ENTERPRISE')),
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Pending')),
  avatar_url TEXT,
  reseller_code TEXT UNIQUE,
  referred_by TEXT, -- Reseller code that referred this user
  custom_domain TEXT,
  phone_number TEXT,
  voice_id TEXT,
  intro_message TEXT,
  phone_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BOTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  system_prompt TEXT NOT NULL,
  model TEXT DEFAULT 'gpt-4o-mini',
  temperature NUMERIC DEFAULT 0.7,
  knowledge_base TEXT[] DEFAULT '{}',
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

-- =============================================
-- KNOWLEDGE BASE TABLE (with vector embeddings)
-- =============================================
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  source_type TEXT, -- 'upload', 'url', 'manual'
  source_url TEXT,
  embedding vector(1536), -- OpenAI ada-002 embeddings
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_owner ON knowledge_base(owner_id);
CREATE INDEX idx_kb_bot ON knowledge_base(bot_id);
CREATE INDEX idx_kb_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops);

-- =============================================
-- CONVERSATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]', -- Array of {role, text, timestamp}
  sentiment TEXT DEFAULT 'Neutral' CHECK (sentiment IN ('Positive', 'Neutral', 'Negative')),
  lead_captured BOOLEAN DEFAULT false,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_owner ON conversations(owner_id);
CREATE INDEX idx_conversations_bot ON conversations(bot_id);
CREATE INDEX idx_conversations_created ON conversations(created_at DESC);

-- =============================================
-- LEADS TABLE (CRM)
-- =============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Qualified', 'Closed')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_owner ON leads(owner_id);
CREATE INDEX idx_leads_bot ON leads(bot_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created ON leads(created_at DESC);

-- =============================================
-- MARKETING CONTENT TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS marketing_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'email', 'ad', 'blog', 'script', 'social'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  topic TEXT,
  tone TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_owner ON marketing_content(owner_id);
CREATE INDEX idx_marketing_type ON marketing_content(type);

-- =============================================
-- WEBSITE PAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS website_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL, -- Page structure
  published BOOLEAN DEFAULT false,
  seo_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, slug)
);

CREATE INDEX idx_website_owner ON website_pages(owner_id);

-- =============================================
-- USAGE EVENTS TABLE (for billing & analytics)
-- =============================================
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'conversation', 'ai_tokens', 'lead_created', 'website_view'
  bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_owner ON usage_events(owner_id);
CREATE INDEX idx_usage_type ON usage_events(event_type);
CREATE INDEX idx_usage_created ON usage_events(created_at DESC);

-- =============================================
-- BILLING ACCOUNTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS billing_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  conversations_used INTEGER DEFAULT 0,
  conversations_limit INTEGER DEFAULT 60,
  overage_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_owner ON billing_accounts(owner_id);

-- =============================================
-- RESELLER ACCOUNTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS reseller_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reseller_code TEXT UNIQUE NOT NULL,
  commission_rate NUMERIC DEFAULT 0.20,
  total_clients INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  pending_payout NUMERIC DEFAULT 0,
  white_label_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reseller_owner ON reseller_accounts(owner_id);
CREATE INDEX idx_reseller_code ON reseller_accounts(reseller_code);

-- =============================================
-- RESELLER CLIENTS TABLE (relationship tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS reseller_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reseller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reseller_id, client_id)
);

CREATE INDEX idx_reseller_clients_reseller ON reseller_clients(reseller_id);
CREATE INDEX idx_reseller_clients_client ON reseller_clients(client_id);

-- =============================================
-- COMMISSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reseller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commissions_reseller ON commissions(reseller_id);

-- =============================================
-- TEMPLATES TABLE (Marketplace)
-- =============================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  icon TEXT,
  system_prompt TEXT NOT NULL,
  model TEXT DEFAULT 'gpt-4o-mini',
  temperature NUMERIC DEFAULT 0.7,
  sample_questions TEXT[],
  use_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PHONE CALLS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS phone_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
  call_sid TEXT UNIQUE,
  from_number TEXT,
  to_number TEXT,
  duration INTEGER,
  transcript TEXT,
  recording_url TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calls_owner ON phone_calls(owner_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_calls ENABLE ROW LEVEL SECURITY;

-- PROFILES: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- BOTS: Users can CRUD their own bots
CREATE POLICY "Users can view own bots" ON bots FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create own bots" ON bots FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own bots" ON bots FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own bots" ON bots FOR DELETE USING (auth.uid() = owner_id);

-- KNOWLEDGE BASE: Users can CRUD their own KB entries
CREATE POLICY "Users can view own KB" ON knowledge_base FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create own KB" ON knowledge_base FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own KB" ON knowledge_base FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own KB" ON knowledge_base FOR DELETE USING (auth.uid() = owner_id);

-- CONVERSATIONS: Users can CRUD their own conversations
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create own conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own conversations" ON conversations FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own conversations" ON conversations FOR DELETE USING (auth.uid() = owner_id);

-- LEADS: Users can CRUD their own leads
CREATE POLICY "Users can view own leads" ON leads FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create own leads" ON leads FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own leads" ON leads FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own leads" ON leads FOR DELETE USING (auth.uid() = owner_id);

-- MARKETING CONTENT: Users can CRUD their own content
CREATE POLICY "Users can view own marketing" ON marketing_content FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create own marketing" ON marketing_content FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own marketing" ON marketing_content FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own marketing" ON marketing_content FOR DELETE USING (auth.uid() = owner_id);

-- WEBSITE PAGES: Users can CRUD their own pages
CREATE POLICY "Users can view own pages" ON website_pages FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create own pages" ON website_pages FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own pages" ON website_pages FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own pages" ON website_pages FOR DELETE USING (auth.uid() = owner_id);

-- USAGE EVENTS: Users can view their own usage
CREATE POLICY "Users can view own usage" ON usage_events FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "System can create usage events" ON usage_events FOR INSERT WITH CHECK (true); -- Will be created by backend

-- BILLING: Users can view/update their own billing
CREATE POLICY "Users can view own billing" ON billing_accounts FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can update own billing" ON billing_accounts FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can create own billing" ON billing_accounts FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- RESELLER ACCOUNTS: Users can view/update their own reseller account
CREATE POLICY "Users can view own reseller account" ON reseller_accounts FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create own reseller account" ON reseller_accounts FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own reseller account" ON reseller_accounts FOR UPDATE USING (auth.uid() = owner_id);

-- RESELLER CLIENTS: Resellers can view their clients
CREATE POLICY "Resellers can view their clients" ON reseller_clients FOR SELECT USING (auth.uid() = reseller_id);
CREATE POLICY "System can create reseller relationships" ON reseller_clients FOR INSERT WITH CHECK (true);

-- COMMISSIONS: Resellers can view their commissions
CREATE POLICY "Resellers can view their commissions" ON commissions FOR SELECT USING (auth.uid() = reseller_id);

-- TEMPLATES: Public read access
CREATE POLICY "Anyone can view templates" ON templates FOR SELECT USING (true);

-- PHONE CALLS: Users can view their own calls
CREATE POLICY "Users can view own calls" ON phone_calls FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "System can create calls" ON phone_calls FOR INSERT WITH CHECK (true);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON bots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_pages_updated_at BEFORE UPDATE ON website_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_updated_at BEFORE UPDATE ON billing_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reseller_updated_at BEFORE UPDATE ON reseller_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment bot conversation count
CREATE OR REPLACE FUNCTION increment_bot_conversations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bots SET conversations_count = conversations_count + 1 WHERE id = NEW.bot_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_conversations_trigger
  AFTER INSERT ON conversations
  FOR EACH ROW EXECUTE FUNCTION increment_bot_conversations();

-- Function to track usage events on conversation creation
CREATE OR REPLACE FUNCTION track_conversation_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usage_events (owner_id, event_type, bot_id, quantity)
  VALUES (NEW.owner_id, 'conversation', NEW.bot_id, 1);

  -- Update billing account usage
  UPDATE billing_accounts
  SET conversations_used = conversations_used + 1
  WHERE owner_id = NEW.owner_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_conversation_usage_trigger
  AFTER INSERT ON conversations
  FOR EACH ROW EXECUTE FUNCTION track_conversation_usage();

-- =============================================
-- SEED DATA: Templates
-- =============================================
INSERT INTO templates (name, description, category, icon, system_prompt, sample_questions) VALUES
('City Government Assistant', 'Help citizens navigate city services, permits, and information', 'Government', '🏛️', 'You are a helpful city government assistant. Provide information about city services, permits, licenses, and local government operations. Be professional, accurate, and guide citizens to the right departments.', ARRAY['How do I apply for a building permit?', 'When is trash collection in my area?', 'How can I report a pothole?']),
('Recruitment Assistant', 'Screen candidates and answer employment questions', 'HR', '👔', 'You are a professional recruitment assistant. Help candidates learn about job openings, company culture, and application processes. Screen basic qualifications and schedule interviews.', ARRAY['What positions are currently open?', 'What benefits does the company offer?', 'How long is the interview process?']),
('Travel Concierge', 'Assist travelers with bookings, recommendations, and trip planning', 'Travel', '✈️', 'You are a knowledgeable travel concierge. Help customers plan trips, find accommodations, discover attractions, and answer travel-related questions. Be enthusiastic and informative.', ARRAY['What are the best hotels in Paris?', 'Can you help me plan a 7-day Italy itinerary?', 'What documents do I need for international travel?']),
('Real Estate Assistant', 'Help buyers and sellers with property inquiries', 'Real Estate', '🏡', 'You are a professional real estate assistant. Help clients find properties, schedule viewings, answer questions about listings, and provide market insights. Be knowledgeable about local real estate.', ARRAY['What homes are available in my price range?', 'Can I schedule a showing?', 'What are the current market trends?']),
('E-commerce Support', 'Handle customer service for online stores', 'Retail', '🛍️', 'You are a friendly e-commerce customer support agent. Help customers with product inquiries, order tracking, returns, and general shopping questions. Be helpful and solution-oriented.', ARRAY['Where is my order?', 'What is your return policy?', 'Do you have this in a different size?']),
('Healthcare Navigator', 'Guide patients through healthcare services and appointments', 'Healthcare', '⚕️', 'You are a compassionate healthcare navigator. Help patients schedule appointments, understand services, and answer general healthcare questions. Always advise consulting healthcare professionals for medical advice.', ARRAY['How do I schedule an appointment?', 'What insurance do you accept?', 'What are your office hours?']),
('Restaurant Host', 'Take reservations and answer dining questions', 'Hospitality', '🍽️', 'You are a friendly restaurant host. Help customers make reservations, answer menu questions, accommodate dietary restrictions, and provide information about the restaurant. Be warm and welcoming.', ARRAY['Can I make a reservation for tonight?', 'Do you have vegetarian options?', 'What are your hours?']),
('Fitness Coach', 'Provide workout guidance and fitness motivation', 'Fitness', '💪', 'You are an enthusiastic fitness coach. Provide workout suggestions, answer fitness questions, and motivate clients to reach their goals. Always recommend consulting professionals for personalized plans.', ARRAY['What exercises are good for beginners?', 'How often should I work out?', 'Can you suggest a home workout?']);

-- =============================================
-- ANALYTICS VIEWS (for efficient querying)
-- =============================================

CREATE OR REPLACE VIEW daily_analytics AS
SELECT
  owner_id,
  DATE(created_at) as date,
  COUNT(*) as conversation_count,
  COUNT(DISTINCT bot_id) as active_bots
FROM conversations
GROUP BY owner_id, DATE(created_at);

CREATE OR REPLACE VIEW lead_analytics AS
SELECT
  owner_id,
  DATE(created_at) as date,
  COUNT(*) as lead_count,
  AVG(score) as avg_score
FROM leads
GROUP BY owner_id, DATE(created_at);
