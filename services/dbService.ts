import { Bot, Lead, Conversation, UserRole, PlanType } from '../types';

const STORAGE_KEYS = {
  BOTS: 'buildmybot_bots',
  LEADS: 'buildmybot_leads',
  CHAT_LOGS: 'buildmybot_chat_logs',
  USER: 'buildmybot_user'
};

// Default data for first-time load
const DEFAULT_BOTS: Bot[] = [
  { 
    id: 'b1', 
    name: 'Sales Assistant', 
    type: 'Sales', 
    systemPrompt: 'You are a sales assistant. Qualify leads and book meetings.', 
    model: 'gpt-4o-mini', 
    temperature: 0.8, 
    knowledgeBase: [], 
    active: true, 
    conversationsCount: 12, 
    themeColor: '#1e3a8a',
    maxMessages: 20,
    randomizeIdentity: true
  }
];

export const dbService = {
  getBots: (): Bot[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.BOTS);
    return stored ? JSON.parse(stored) : DEFAULT_BOTS;
  },

  saveBot: (bot: Bot) => {
    const bots = dbService.getBots();
    const existingIndex = bots.findIndex(b => b.id === bot.id);
    
    let newBots;
    if (existingIndex >= 0) {
      newBots = [...bots];
      newBots[existingIndex] = bot;
    } else {
      newBots = [...bots, bot];
    }
    
    localStorage.setItem(STORAGE_KEYS.BOTS, JSON.stringify(newBots));
    return newBots;
  },

  getBotById: (id: string): Bot | undefined => {
    const bots = dbService.getBots();
    return bots.find(b => b.id === id);
  },

  getLeads: (): Lead[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.LEADS);
    return stored ? JSON.parse(stored) : [];
  },

  saveLead: (lead: Lead) => {
    const leads = dbService.getLeads();
    // Avoid duplicates
    if (leads.some(l => l.email === lead.email)) return leads;
    
    const newLeads = [lead, ...leads];
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(newLeads));
    return newLeads;
  }
};