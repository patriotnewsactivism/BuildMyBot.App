
export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MASTER_ADMIN = 'MASTER_ADMIN',
  LIMITED_ADMIN = 'LIMITED_ADMIN',
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

export type CallStatus = 'initiated' | 'in-progress' | 'completed' | 'failed';

export interface PhoneCall {
  id: string;
  userId: string;
  botId?: string | null;
  twilioCallSid?: string | null;
  fromNumber?: string | null;
  toNumber?: string | null;
  status: CallStatus;
  durationSeconds?: number | null;
  recordingUrl?: string | null;
  transcript?: string | null;
  metadata?: Record<string, unknown>;
  leadId?: string | null;
  createdAt?: string;
  endedAt?: string | null;
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

export interface PageContent {
  headline: string;
  subheadline?: string;
  features?: string[];
  ctaText?: string;
  heroImage?: string;
  sections?: { title: string; body: string }[];
  brandColor?: string;
}

export interface SeoMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
}

export interface WebsitePage {
  id?: string;
  userId?: string;
  botId?: string;
  title: string;
  slug: string;
  content: PageContent;
  seoMetadata?: SeoMetadata;
  published?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  sessionId: string;
  messages: { role: 'user' | 'model' | 'assistant'; text: string; timestamp: number }[];
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  timestamp: number;
  leadId?: string;
  createdAt?: string;
  updatedAt?: string;
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

export interface ReferralRecord {
  id: string;
  resellerId: string;
  referredUserId: string;
  code: string;
  status: string;
  createdAt: string;
  clientProfile?: Pick<User, 'id' | 'name' | 'email' | 'companyName' | 'plan'>;
}

export interface ResellerEarning {
  id: string;
  resellerId: string;
  customerId: string;
  amount: number;
  commissionRate: number;
  status: 'pending' | 'paid' | 'failed';
  periodStart?: string;
  periodEnd?: string;
  paidAt?: string;
}

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

export type MarketingContentType = 'email' | 'ad' | 'blog' | 'social';

// AI Model types for multi-provider support
export type AIProvider = 'openai' | 'anthropic' | 'google';
export type AIModelTier = 'standard' | 'premium';
export type AIModelSpeed = 'fast' | 'medium' | 'slow';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  tier: AIModelTier;
  contextWindow: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
  speed: AIModelSpeed;
  capabilities: string[];
  description?: string;
}

export interface StorageUsage {
  usedMB: number;
  limitMB: number;
  percentage: number;
}

export interface MarketingContent {
  id: string;
  userId: string;
  contentType: MarketingContentType;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface MarketplaceTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  installCount: number;
  rating: number;
  featured: boolean;
  botConfig: Record<string, any>;
  tags: string[];
  previewUrl?: string;
  image?: string;
  author?: string;
  installs?: number;
}

// BuildMyBot 4Me Done-For-You Service Types
export type ServiceTierId = 'quick_start' | 'professional' | 'enterprise';
export type ServiceRequestStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';

export interface ServiceTier {
  id: ServiceTierId;
  name: string;
  price: number;
  deliveryDays: number;
  features: string[];
  description: string;
  popular?: boolean;
}

export interface ServiceRequest {
  id: string;
  userId: string;
  tier: ServiceTierId;
  status: ServiceRequestStatus;
  businessType: string;
  botPurpose: string[];
  desiredFeatures: string[];
  budgetRange?: string;
  timeline?: string;
  additionalNotes?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  deliverables?: ServiceDeliverable[];
}

export interface ServiceDeliverable {
  id: string;
  name: string;
  type: 'bot' | 'knowledge_base' | 'integration' | 'training' | 'documentation';
  status: 'pending' | 'in_progress' | 'completed';
  url?: string;
  notes?: string;
}
