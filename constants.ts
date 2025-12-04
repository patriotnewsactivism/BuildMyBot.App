import { PlanType } from './types';

// ============================================================================
// BRANDING & DOMAIN CONFIGURATION
// ============================================================================
export const APP_DOMAIN = 'buildmybot.app';
export const APP_NAME = 'BuildMyBot';
export const APP_URL = `https://${APP_DOMAIN}`;

// Referral link generator - always uses clean /ref=CODE format
export const generateReferralLink = (referralCode: string, customDomain?: string): string => {
  const domain = customDomain || APP_DOMAIN;
  return `https://${domain}/ref=${referralCode}`;
};

// ============================================================================
// PRICING PLANS
// ============================================================================
export const PLANS = {
  [PlanType.FREE]: { 
    price: 0, 
    bots: 1, 
    conversations: 60, 
    name: 'Free Tier',
    features: [
      '1 bot',
      '60 conversations/month',
      'Basic analytics',
      'Community support'
    ]
  },
  [PlanType.STARTER]: { 
    price: 29, 
    bots: 1, 
    conversations: 750, 
    name: 'Starter',
    features: [
      '1 bot',
      '750 conversations/month',
      'GPT-4o Mini model',
      'Basic analytics',
      'Email support'
    ]
  },
  [PlanType.PROFESSIONAL]: { 
    price: 99, 
    bots: 5, 
    conversations: 5000, 
    name: 'Professional',
    features: [
      '5 bots',
      '5,000 conversations/month',
      'Advanced analytics',
      'API access',
      'Custom training data',
      'Priority support',
      'Multi-language support'
    ]
  },
  [PlanType.EXECUTIVE]: { 
    price: 199, 
    bots: 10, 
    conversations: 15000, 
    name: 'Executive',
    features: [
      '10 bots',
      '15,000 conversations/month',
      'Custom integrations',
      'Premium analytics',
      'Priority support',
      'Team collaboration'
    ]
  },
  [PlanType.ENTERPRISE]: { 
    price: 399, 
    bots: 9999, // Represents Unlimited
    conversations: 50000, 
    name: 'Enterprise',
    overage: 0.01, // Cost per conversation over limit
    features: [
      'Unlimited bots',
      '50,000 convos included',
      '$0.01 per overage conversation',
      'White-labeling',
      'SLA & Priority Support',
      'Enterprise analytics',
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
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast, cost-effective. Best for most business tasks.' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'High intelligence. Best for complex reasoning and creative tasks.' },
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