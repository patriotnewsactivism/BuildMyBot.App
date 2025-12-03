-- BuildMyBot.app Initial Data Seeding
-- Run this after migrations to populate initial data

-- ============================================================================
-- PLANS
-- ============================================================================
INSERT INTO plans (id, name, price_monthly, price_yearly, max_bots, max_conversations, features, is_active)
VALUES
  (gen_random_uuid(), 'FREE', 0, 0, 1, 60,
    '["1 bot", "60 conversations/month", "Basic analytics", "Community support"]'::jsonb,
    true),
  (gen_random_uuid(), 'STARTER', 29, 290, 1, 750,
    '["1 bot", "750 conversations/month", "GPT-4o Mini model", "Basic analytics", "Email support"]'::jsonb,
    true),
  (gen_random_uuid(), 'PROFESSIONAL', 99, 990, 5, 5000,
    '["5 bots", "5,000 conversations/month", "Advanced analytics", "API access", "Custom training data", "Priority support", "Multi-language support"]'::jsonb,
    true),
  (gen_random_uuid(), 'EXECUTIVE', 199, 1990, 10, 15000,
    '["10 bots", "15,000 conversations/month", "Custom integrations", "Premium analytics", "Priority support", "Team collaboration"]'::jsonb,
    true),
  (gen_random_uuid(), 'ENTERPRISE', 399, 3990, 9999, 50000,
    '["Unlimited bots", "50,000 conversations included", "$0.01 per overage conversation", "White-labeling", "SLA & Priority Support", "Enterprise analytics", "All Executive features"]'::jsonb,
    true)
ON CONFLICT (name) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_bots = EXCLUDED.max_bots,
  max_conversations = EXCLUDED.max_conversations,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- TEMPLATES (Marketplace)
-- ============================================================================
INSERT INTO templates (id, name, description, category, system_prompt, model, temperature, preview_image, is_featured, metadata)
VALUES
  (gen_random_uuid(),
   'Customer Support Bot',
   'Empathetic assistant for handling customer inquiries and resolving issues efficiently',
   'Customer Support',
   'You are a helpful and empathetic customer support assistant. Your goal is to understand customer issues, provide clear solutions, and ensure customer satisfaction. Always be professional, patient, and solution-oriented. If you cannot resolve an issue, escalate to a human agent.',
   'gpt-4o-mini',
   0.7,
   null,
   true,
   '{"tags": ["support", "customer-service", "help-desk"], "industry": "general"}'::jsonb),

  (gen_random_uuid(),
   'Sales Assistant',
   'Qualify leads, answer product questions, and schedule demos',
   'Sales',
   'You are a sales assistant focused on qualifying leads and scheduling product demos. Ask about the prospect''s needs, budget, timeline, and decision-making process. Be consultative, not pushy. Your goal is to understand if our product is a good fit and schedule a demo with qualified leads.',
   'gpt-4o-mini',
   0.8,
   null,
   true,
   '{"tags": ["sales", "lead-qualification", "demo-scheduling"], "industry": "b2b"}'::jsonb),

  (gen_random_uuid(),
   'Real Estate Agent',
   'Help clients find properties and schedule viewings',
   'Real Estate',
   'You are a knowledgeable real estate agent. Help clients find properties that match their criteria (location, price, size, amenities). Ask qualifying questions about their preferences, budget, and timeline. Schedule property viewings and provide market insights. Be professional and enthusiastic.',
   'gpt-4o-mini',
   0.7,
   null,
   true,
   '{"tags": ["real-estate", "property", "housing"], "industry": "real-estate"}'::jsonb),

  (gen_random_uuid(),
   'Recruitment Bot',
   'Screen candidates and schedule interviews',
   'Recruitment',
   'You are a professional recruiter conducting initial candidate screening. Ask about their experience, skills, career goals, salary expectations, and availability. Evaluate if they match the job requirements. Schedule interviews with qualified candidates. Be professional, respectful, and unbiased.',
   'gpt-4o-mini',
   0.6,
   null,
   true,
   '{"tags": ["recruitment", "hr", "hiring"], "industry": "hr"}'::jsonb),

  (gen_random_uuid(),
   'City Services Assistant',
   'Help residents access city services and information',
   'Government',
   'You are a city services assistant helping residents access information about permits, utilities, city events, regulations, and public services. Provide clear, official, and accurate information. Direct residents to appropriate city departments when needed. Be helpful and professional.',
   'gpt-4o-mini',
   0.5,
   null,
   true,
   '{"tags": ["government", "city-services", "public-service"], "industry": "government"}'::jsonb),

  (gen_random_uuid(),
   'Travel Concierge',
   'Assist travelers with bookings and recommendations',
   'Travel',
   'You are a travel concierge helping customers plan trips, book accommodations, and discover destinations. Provide personalized recommendations based on their preferences, budget, and travel style. Be enthusiastic and knowledgeable about destinations worldwide.',
   'gpt-4o-mini',
   0.8,
   null,
   true,
   '{"tags": ["travel", "hospitality", "booking"], "industry": "travel"}'::jsonb),

  (gen_random_uuid(),
   'E-commerce Assistant',
   'Help shoppers find products and complete purchases',
   'E-commerce',
   'You are an e-commerce shopping assistant. Help customers find products that meet their needs, answer product questions, explain policies (shipping, returns, etc.), and guide them through the checkout process. Be friendly and helpful.',
   'gpt-4o-mini',
   0.7,
   null,
   true,
   '{"tags": ["ecommerce", "shopping", "retail"], "industry": "retail"}'::jsonb),

  (gen_random_uuid(),
   'Healthcare Scheduler',
   'Schedule appointments and answer basic health questions',
   'Healthcare',
   'You are a healthcare appointment scheduler. Help patients schedule appointments, provide information about services, explain insurance requirements, and answer general questions. IMPORTANT: Do not provide medical advice. Direct medical questions to healthcare professionals.',
   'gpt-4o-mini',
   0.6,
   null,
   false,
   '{"tags": ["healthcare", "medical", "appointments"], "industry": "healthcare", "disclaimer": "Not for medical advice"}'::jsonb),

  (gen_random_uuid(),
   'Financial Advisor Bot',
   'Provide financial guidance and answer money questions',
   'Finance',
   'You are a financial advisor providing general financial guidance. Help users understand financial concepts, budgeting, saving, and investment basics. IMPORTANT: This is general education only, not personalized financial advice. Recommend consulting licensed professionals for specific financial decisions.',
   'gpt-4o-mini',
   0.6,
   null,
   false,
   '{"tags": ["finance", "banking", "advisory"], "industry": "finance", "disclaimer": "Not personalized financial advice"}'::jsonb),

  (gen_random_uuid(),
   'Tech Support Bot',
   'Troubleshoot technical issues step-by-step',
   'IT Support',
   'You are a technical support specialist. Help users troubleshoot software and hardware issues through step-by-step guidance. Ask diagnostic questions, provide clear instructions, and escalate complex issues. Be patient and avoid technical jargon when possible.',
   'gpt-4o-mini',
   0.5,
   null,
   true,
   '{"tags": ["tech-support", "it", "troubleshooting"], "industry": "technology"}'::jsonb);

-- ============================================================================
-- DEMO ADMIN USER (Optional - Comment out for production)
-- ============================================================================

-- NOTE: Create admin user via Supabase dashboard first, then run:
-- UPDATE profiles SET role = 'ADMIN', plan = 'ENTERPRISE'
-- WHERE email = 'admin@buildmybot.app';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify plans inserted
SELECT name, price_monthly, max_bots, max_conversations FROM plans ORDER BY price_monthly;

-- Verify templates inserted
SELECT name, category, is_featured FROM templates ORDER BY category, name;

-- Count records
SELECT
  (SELECT COUNT(*) FROM plans) as plan_count,
  (SELECT COUNT(*) FROM templates) as template_count;
