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
  status?: 'Active' | 'Suspended'; // For admin management
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
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  score: number;
  status: 'New' | 'Contacted' | 'Qualified' | 'Closed';
  sourceBotId: string;
  createdAt: string;
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
}