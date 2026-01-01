import { PlanType } from './types';

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
      '50MB knowledge base storage',
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
      '500MB knowledge base storage',
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
      '2GB knowledge base storage',
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
      '10GB knowledge base storage',
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
    conversations: 50000, 
    name: 'Enterprise', // Displayed as Ultimate Power / Enterprise
    overage: 0.01, // Cost per conversation over limit
    features: [
      'Unlimited bots & workspaces',
      '50,000 convos included',
      '100GB knowledge base storage',
      '$0.01 per overage conversation',
      'Full white-label (domains, emails, branding)',
      'SAML/SSO + SCIM provisioning',
      'Dedicated Slack/phone support with SLA',
      'Security reviews, DPA & audit logs',
      'Custom data residency & backups',
      'Dedicated success manager'
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