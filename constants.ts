import { PlanType, AddOn, ServiceTier } from './types';

export const PLANS = {
  [PlanType.FREE]: {
    price: 0,
    bots: 1,
    conversations: 60,
    name: 'Free Tier',
    features: [
      'Drag-and-drop website widget',
      '1 bot with branded colors',
      '60 conversations/month',
      'Basic FAQs & lead capture',
      'Email transcript export',
      'Community support'
    ]
  },
  [PlanType.STARTER]: {
    price: 29,
    bots: 1,
    conversations: 750,
    name: 'Starter',
    features: [
      'Website + landing page embeds',
      'Multi-page training (URLs, PDFs)',
      '750 conversations/month',
      'GPT-4o Mini model',
      'Lead capture via email & SMS alerts',
      'Office-hours & scheduling rules',
      'Basic analytics dashboard',
      'Email support'
    ]
  },
  [PlanType.PROFESSIONAL]: {
    price: 99,
    bots: 5,
    conversations: 5000,
    name: 'Professional',
    features: [
      '5 bots for multiple brands',
      '5,000 conversations/month',
      'Multi-language support',
      'CRM & calendar integrations',
      'Proactive lead scoring & alerts',
      'Knowledge base + custom training',
      'Advanced analytics & conversion tracking',
      'API access & webhooks',
      'Priority chat & email support'
    ]
  },
  [PlanType.EXECUTIVE]: {
    price: 199,
    bots: 10,
    conversations: 30000,
    name: 'Executive',
    features: [
      '10 bots with shared knowledge bases',
      '30,000 conversations/month',
      'Voice & phone agent included',
      'Workflow automation & triggers',
      'Premium analytics with attribution',
      'AB testing & copy experiments',
      'Team seats & roles',
      'Priority onboarding concierge'
    ]
  },
  [PlanType.ENTERPRISE]: {
    price: 499,
    bots: 9999, // Represents Unlimited
    conversations: 100000,
    name: 'Enterprise / White-label',
    overage: 0.01, // Cost per conversation over limit
    features: [
      'Unlimited bots & workspaces',
      '100,000 convos included',
      '$0.01 per overage conversation',
      'Full white-label (domains, emails, branding)',
      'SAML/SSO + SCIM provisioning',
      'Dedicated Slack/phone support with SLA',
      'Security reviews, DPA & audit logs',
      'Custom data residency & backups',
      'Dedicated success manager',
      'All Executive features'
    ]
  },
};

export const RESELLER_TIERS = [
  { min: 0, max: 49, commission: 0.20, label: 'Bronze' },
  { min: 50, max: 149, commission: 0.30, label: 'Silver' },
  { min: 150, max: 249, commission: 0.40, label: 'Gold' },
  { min: 250, max: 999999, commission: 0.50, label: 'Platinum' },
];

export const AVAILABLE_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast, cost-effective. Best for real-time chat.' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'High reasoning. Best for complex tasks and coding.' },
];

export const MOCK_ANALYTICS_DATA = [
  { date: 'Mon', conversations: 45, leads: 2 },
  { date: 'Tue', conversations: 52, leads: 5 },
  { date: 'Wed', conversations: 38, leads: 1 },
  { date: 'Thu', conversations: 65, leads: 8 },
  { date: 'Fri', conversations: 89, leads: 12 },
  { date: 'Sat', conversations: 120, leads: 15 },
  { date: 'Sun', conversations: 95, leads: 9 },
];

// Add-on features with pricing
// Resellers get 50% commission on all add-ons
// Resellers can waive or reduce costs for clients
// Arrears are deducted from next processed payment
export const ADDON_RESELLER_COMMISSION = 0.50; // 50% flat commission

export const ADDONS: AddOn[] = [
  // AI & Intelligence Add-ons
  {
    id: 'addon-gpt4',
    name: 'GPT-4o Premium',
    description: 'Upgrade to GPT-4o for advanced reasoning, complex tasks, and higher accuracy responses.',
    price: 49,
    category: 'ai',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },
  {
    id: 'addon-voice',
    name: 'Voice AI Agent',
    description: '24/7 AI phone receptionist with human-like voice. Handles calls, schedules appointments, and captures leads.',
    price: 99,
    oneTimePrice: 199,
    category: 'ai',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },
  {
    id: 'addon-multilingual',
    name: 'Multi-Language Support',
    description: 'Enable your bot to converse fluently in 50+ languages with automatic detection.',
    price: 29,
    category: 'ai',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },
  {
    id: 'addon-sentiment',
    name: 'Advanced Sentiment Analysis',
    description: 'Real-time emotion detection with alerts for frustrated customers and escalation triggers.',
    price: 39,
    category: 'ai',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },

  // Integration Add-ons
  {
    id: 'addon-crm-sync',
    name: 'CRM Integration',
    description: 'Sync leads directly to Salesforce, HubSpot, Zoho, or Pipedrive in real-time.',
    price: 49,
    oneTimePrice: 99,
    category: 'integration',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },
  {
    id: 'addon-calendar',
    name: 'Calendar Booking',
    description: 'Direct integration with Google Calendar, Outlook, and Calendly for instant appointment booking.',
    price: 19,
    category: 'integration',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },
  {
    id: 'addon-zapier',
    name: 'Zapier Pro Integration',
    description: 'Connect to 5,000+ apps. Automate workflows with triggers and actions from your bot.',
    price: 29,
    category: 'integration',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },
  {
    id: 'addon-sms',
    name: 'SMS Notifications',
    description: 'Instant SMS alerts for hot leads, missed chats, and appointment confirmations.',
    price: 25,
    category: 'integration',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },
  {
    id: 'addon-whatsapp',
    name: 'WhatsApp Business',
    description: 'Deploy your bot on WhatsApp Business. Reach customers on their preferred platform.',
    price: 59,
    oneTimePrice: 149,
    category: 'integration',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },

  // Support & Service Add-ons
  {
    id: 'addon-priority',
    name: 'Priority Support',
    description: '24/7 priority support with dedicated account manager and 1-hour response SLA.',
    price: 79,
    category: 'support',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },
  {
    id: 'addon-training',
    name: 'Custom Bot Training',
    description: 'Our AI specialists fine-tune your bot with your data for maximum accuracy.',
    price: 199,
    oneTimePrice: 499,
    category: 'support',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },
  {
    id: 'addon-onboarding',
    name: 'White-Glove Onboarding',
    description: 'Complete setup service: bot configuration, knowledge base upload, and launch assistance.',
    price: 0,
    oneTimePrice: 299,
    category: 'support',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },

  // Feature Add-ons
  {
    id: 'addon-analytics',
    name: 'Advanced Analytics',
    description: 'Deep insights with conversion funnels, heatmaps, A/B testing, and custom reports.',
    price: 39,
    category: 'feature',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },
  {
    id: 'addon-whitelabel',
    name: 'White-Label Branding',
    description: 'Remove all BuildMyBot branding. Custom domain, logos, and colors for your brand.',
    price: 49,
    oneTimePrice: 99,
    category: 'feature',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },
  {
    id: 'addon-api',
    name: 'API Access',
    description: 'Full REST API access for custom integrations and development.',
    price: 59,
    category: 'feature',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },
  {
    id: 'addon-team',
    name: 'Team Collaboration',
    description: 'Add team members with role-based access. Manager, Agent, and Viewer roles.',
    price: 29,
    category: 'feature',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },

  // Storage Add-ons
  {
    id: 'addon-storage-10gb',
    name: 'Extra Storage (10GB)',
    description: 'Additional 10GB storage for knowledge base files, documents, and media.',
    price: 9,
    category: 'storage',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },
  {
    id: 'addon-storage-50gb',
    name: 'Extra Storage (50GB)',
    description: 'Additional 50GB storage for enterprise-level document libraries.',
    price: 29,
    category: 'storage',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },
  {
    id: 'addon-conversations-5k',
    name: 'Extra Conversations (5,000)',
    description: 'Additional 5,000 conversations per month for high-volume needs.',
    price: 49,
    category: 'storage',
    resellerCommission: ADDON_RESELLER_COMMISSION,
    isActive: true,
  },
];

// BuildMyBot 4Me Done-For-You Service Tiers
export const SERVICE_TIERS: ServiceTier[] = [
  {
    id: 'quick_start',
    name: 'Quick Start',
    price: 299,
    deliveryDays: 3,
    description: 'Perfect for small businesses that need a simple chatbot up and running fast.',
    features: [
      'Single AI chatbot setup',
      'Basic knowledge base (up to 10 pages)',
      'Website embed code',
      'Standard bot persona',
      'Email support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 799,
    deliveryDays: 7,
    description: 'Comprehensive setup for businesses that need a fully-trained, customized chatbot.',
    popular: true,
    features: [
      'Custom AI chatbot with advanced training',
      'Full knowledge base setup (up to 50 pages)',
      'Lead capture form integration',
      'CRM webhook setup',
      'Custom branding & styling',
      '2 rounds of revisions',
      'Priority email support',
      '30-minute onboarding call',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 1999,
    deliveryDays: 14,
    description: 'White-glove service for organizations needing multiple bots, integrations, and ongoing support.',
    features: [
      'Up to 5 AI chatbots',
      'Unlimited knowledge base pages',
      'Multi-channel deployment (web, SMS, phone)',
      'API & Zapier integrations',
      'Custom workflows & automations',
      'Advanced analytics dashboard setup',
      'Dedicated account manager',
      '60-minute strategy call',
      '30 days of priority support',
      'Quarterly performance review',
    ],
  },
];

// Bot purpose options for service request form
export const BOT_PURPOSE_OPTIONS = [
  'Customer Support',
  'Lead Generation',
  'Appointment Booking',
  'FAQ Automation',
  'Sales Assistance',
  'Technical Support',
  'HR & Recruiting',
  'Real Estate',
  'Healthcare',
  'Legal Intake',
  'Other',
];

// Business type options for service request form
export const BUSINESS_TYPE_OPTIONS = [
  'E-commerce / Retail',
  'Professional Services',
  'Healthcare / Medical',
  'Real Estate',
  'Legal',
  'Financial Services',
  'Education',
  'Technology / SaaS',
  'Hospitality',
  'Non-profit',
  'Government',
  'Other',
];

// Desired features for service request form
export const FEATURE_OPTIONS = [
  'Lead capture & qualification',
  'Appointment scheduling',
  'FAQ automation',
  'Live chat handoff',
  'CRM integration',
  'Email notifications',
  'SMS alerts',
  'Phone agent',
  'Multi-language support',
  'Custom branding',
  'Analytics & reporting',
  'API access',
];