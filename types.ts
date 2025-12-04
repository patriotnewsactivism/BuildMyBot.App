// ============================================================================
// BuildMyBot.app - Type Definitions
// Production-Ready TypeScript Interfaces
// ============================================================================

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

// ============================================================================
// User / Profile Interface
// Matches: profiles table in Supabase
// ============================================================================
export interface User {
  id: string;                           // UUID from auth.users
  name: string;
  email: string;
  role: UserRole;
  plan: PlanType;
  companyName: string;
  avatarUrl?: string;

  // Billing & Usage
  credits_used?: number;                // Total conversations consumed this billing cycle
  credits_limit?: number;               // Max conversations allowed based on plan

  // Reseller Fields
  resellerCode?: string;                // Unique code for referral tracking
  resellerClientCount?: number;         // Count of referred clients (for tier calculation)
  referredBy?: string;                  // Code of the reseller who referred this user

  // White-Label & Customization
  customDomain?: string;                // Custom domain (e.g., app.myagency.com)

  // Phone Agent
  phoneConfig?: PhoneAgentConfig;

  // Admin Management
  status?: 'Active' | 'Suspended' | 'Pending';

  // Timestamps
  createdAt?: string;                   // ISO date string
  updatedAt?: string;                   // ISO date string
}

// ============================================================================
// Bot Interface
// Matches: bots table in Supabase (id is TEXT, not UUID)
// ============================================================================
export interface Bot {
  id: string;                           // TEXT: e.g., "b174..." (NOT a UUID)
  userId: string;                       // UUID: Foreign key to profiles.id
  name: string;
  type: string;                         // e.g., "Sales", "Support", "Custom"
  systemPrompt: string;
  model: string;                        // e.g., "gpt-4o-mini"
  temperature: number;
  knowledgeBase: string[];              // Array of scraped/uploaded content
  active: boolean;
  conversationsCount: number;
  themeColor: string;                   // Hex color for widget

  // Optional Features
  websiteUrl?: string;                  // For AI website builder
  maxMessages?: number;                 // Soft limit per conversation
  randomizeIdentity?: boolean;          // Human-like behavior
  avatar?: string;                      // Custom avatar URL/Base64
  responseDelay?: number;               // Simulated typing delay in ms

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Lead Interface
// Matches: leads table in Supabase
// IMPORTANT: source_bot_id is TEXT (references bots.id which is TEXT)
// ============================================================================
export interface Lead {
  id: string;                           // UUID
  userId: string;                       // UUID: Foreign key to profiles.id (bot owner)
  name: string;
  email: string;
  phone?: string;
  score: number;                        // 0-100 (auto-calculated by AI)
  status: 'New' | 'Contacted' | 'Qualified' | 'Closed';
  sourceBotId: string;                  // TEXT: Foreign key to bots.id (which is TEXT)

  // Timestamps
  createdAt: string;                    // ISO date string
  updatedAt?: string;
}

// ============================================================================
// Conversation Interface
// For storing full chat history (optional table)
// ============================================================================
export interface Conversation {
  id: string;                           // UUID
  botId: string;                        // TEXT: Foreign key to bots.id
  userId: string;                       // UUID: Owner of the bot
  messages: ConversationMessage[];
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
  leadCaptured?: boolean;               // Did this conversation result in a lead?

  // Timestamps
  timestamp: number;                    // Unix timestamp
  createdAt?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
}

// ============================================================================
// Analytics & Dashboard
// ============================================================================
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
}

// ============================================================================
// API Response Types
// ============================================================================
export interface ChatCompletionRequest {
  systemPrompt: string;
  messages: ConversationMessage[];
  model?: string;
  context?: string;                     // Knowledge base context
}

export interface ChatCompletionResponse {
  reply: string;
  error?: string;
}

// ============================================================================
// Usage Limit Check
// ============================================================================
export interface UsageLimitResult {
  allowed: boolean;
  creditsUsed: number;
  creditsLimit: number;
  message?: string;
}
