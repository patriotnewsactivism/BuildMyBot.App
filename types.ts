
export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  RESELLER = 'RESELLER',
}

export enum PlanType {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  EXECUTIVE = 'EXECUTIVE',
  ENTERPRISE = 'ENTERPRISE',
}

export interface PhoneAgentConfig {
  enabled: boolean;
  phoneNumber: string;
  voiceId: string;
  introMessage: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  plan: PlanType;
  companyName: string;
  avatarUrl?: string;
  resellerCode?: string;
  resellerClientCount?: number; // For tier calculation
  customDomain?: string; // White-label domain (e.g., app.myagency.com)
  referredBy?: string; // Code of the reseller who referred this user
  phoneConfig?: PhoneAgentConfig;
  status?: 'Active' | 'Suspended' | 'Pending'; // For admin management
  createdAt?: string; // ISO date string
  isMasterAdmin?: boolean; // SEC-002 FIX: Admin status from database
}

export interface Bot {
  id: string;
  name: string;
  type: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  knowledgeBase: string[]; // Mocking file contents as strings for now
  active: boolean;
  conversationsCount: number;
  themeColor: string;
  websiteUrl?: string; // For the AI website builder
  maxMessages?: number; // Fail-safe for billing (soft limit)
  randomizeIdentity?: boolean; // Human-like behavior
  avatar?: string; // Custom avatar URL/Base64
  responseDelay?: number; // Simulated typing delay in ms
  userId?: string; // Optional during creation, required in DB
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  score: number;
  status: 'New' | 'Contacted' | 'Qualified' | 'Closed';
  botId: string; // References bots(id) - renamed from sourceBotId to match database
  sourceUrl?: string; // Source URL where lead was captured
  createdAt: string;
  userId?: string; // Optional during capture, required in DB
}

export interface Conversation {
  id: string;
  botId: string;
  messages: { role: 'user' | 'model'; text: string; timestamp: number }[];
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  timestamp: number;
}

export interface AnalyticsData {
  date: string;
  conversations: number;
  leads: number;
}

export interface ResellerStats {
  totalClients: number;
  totalRevenue: number;
  commissionRate: number;
  pendingPayout: number;
  addOnCommission: number; // 50% of add-on sales
  arrears: number; // Deducted from next payment
}

// Add-on features that can be sold to clients
export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number; // Monthly price
  oneTimePrice?: number; // One-time setup fee (optional)
  category: 'ai' | 'integration' | 'support' | 'feature' | 'storage';
  resellerCommission: number; // Always 0.50 (50%)
  isActive: boolean;
}

// Add-on purchase record
export interface AddOnPurchase {
  id: string;
  userId: string;
  addOnId: string;
  resellerId?: string; // Reseller who sold it
  purchaseDate: string;
  price: number;
  resellerEarnings: number; // 50% of price
  companyEarnings: number; // 50% of price
  status: 'active' | 'cancelled' | 'pending';
  waivedBy?: string; // Reseller ID if waived
  discountPercent?: number; // If reseller reduced price
}

// Reseller payment record with arrears tracking
export interface ResellerPayment {
  id: string;
  resellerId: string;
  amount: number;
  arrears: number; // Deducted from this payment
  netAmount: number; // amount - arrears
  periodStart: string;
  periodEnd: string;
  status: 'pending' | 'processed' | 'failed';
  processedAt?: string;
}
