import { PlanType } from './types';

export const PLANS = {
  [PlanType.FREE]: { price: 0, bots: 1, conversations: 20, name: 'Free Tier' },
  [PlanType.STARTER]: { price: 29, bots: 1, conversations: 100, name: 'Starter' },
  [PlanType.PROFESSIONAL]: { price: 99, bots: 5, conversations: 1000, name: 'Professional' },
  [PlanType.EXECUTIVE]: { price: 199, bots: 10, conversations: 5000, name: 'Executive' },
  [PlanType.ENTERPRISE]: { 
    price: 399, 
    bots: 9999, // Represents Unlimited in UI logic
    conversations: 20000, 
    name: 'Enterprise',
    overage: 0.05 // Cost per conversation over limit
  },
};

export const RESELLER_TIERS = [
  { min: 0, max: 49, commission: 0.20, label: 'Bronze' },
  { min: 50, max: 149, commission: 0.30, label: 'Silver' },
  { min: 150, max: 249, commission: 0.40, label: 'Gold' },
  { min: 250, max: 999999, commission: 0.50, label: 'Platinum' },
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