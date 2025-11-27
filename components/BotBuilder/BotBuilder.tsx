import React, { useState, useEffect, useRef } from 'react';
import { Save, Play, FileText, Settings, Upload, Globe, Share2, Code, Bot as BotIcon, Shield, Users, RefreshCcw, Image as ImageIcon, X, Clock, Zap, Monitor, LayoutTemplate, Trash2, Plus, Sparkles, Link, ExternalLink, Linkedin, Facebook, Twitter } from 'lucide-react';
import { Bot as BotType } from '../../types';
import { generateBotResponse } from '../../services/geminiService';
import { AVAILABLE_MODELS } from '../../constants';
import { dbService } from '../../services/dbService';

interface BotBuilderProps {
  bots: BotType[];
  onSave: (bot: BotType) => void;
  customDomain?: string;
  onLeadDetected?: (email: string) => void;
}

const HUMAN_NAMES = ['Sarah', 'Michael', 'Jessica', 'David', 'Emma', 'James', 'Emily', 'Robert'];
const AVATAR_COLORS = ['#1e3a8a', '#be123c', '#047857', '#d97706', '#7c3aed', '#db2777'];

const PERSONAS = [
  { id: 'support', name: 'Customer Support Agent', prompt: 'You are a helpful customer support agent for {company}. Be polite, patient, and concise. Your goal is to resolve issues quickly. If you do not know the answer, ask for their contact info.' },
  { id: 'sales', name: 'Sales Representative', prompt: 'You are a top-performing sales representative for {company}. Your goal is to qualify leads and close deals. Be persuasive but not pushy. Focus on value and benefits. Always try to get a meeting booked.' },
  { id: 'receptionist', name: 'AI Receptionist', prompt: 'You are the front desk receptionist for {company}. Be warm and welcoming. Help schedule appointments and route calls. Keep responses short and professional.' },
  { id: 'hr', name: 'HR Assistant', prompt: 'You are a Human Resources assistant. Answer employee questions about benefits, holidays, and company policy. Maintain strict confidentiality and professionalism.' },
  { id: 'tech', name: 'Technical Support', prompt: 'You are a Tier 1 Technical Support agent. Walk users through troubleshooting steps logically. Ask clarifying questions to diagnose the issue.' },
];

export const BotBuilder: React.FC<BotBuilderProps> = ({ bots, onSave, customDomain, onLeadDetected }) => {
  const [selectedBotId, setSelectedBotId] = useState<string>(bots[0]?.id || 'new');
  // Initialize with the selected bot or a default new one
  const [activeBot, setActiveBot] = useState<BotType>(bots[0] || {
    id: `b${Date.now()}`,
    name: 'New Assistant',
    type: 'Customer Support',
    systemPrompt: 'You are a helpful customer support assistant.',
    model: 'gpt-4o-mini',
    temperature: 0.9,
    knowledgeBase: [],
    active: true,
    conversationsCount: 0,
    themeColor: '#1e3a8a',
    maxMessages: 20,
    randomizeIdentity: true,
    avatar: '',
    responseDelay: 2000
  });

  const [activeTab, setActiveTab] = useState<'config' | 'knowledge' | 'test' | 'embed'>('config');
  const [testInput, setTestInput] = useState('');
  const [testHistory, setTestHistory] = useState<{role: 'user'|'model', text: string, timestamp: number}[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  
  // Knowledge Base State
  const [kbInput, setKbInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Embed Config State
  const [embedConfig, setEmbedConfig] = useState({
    position: 'bottom-right',
    welcomeMessage: 'Hi there! How can I help you today?',
    buttonStyle: 'rounded-full'
  });
  
  // Random identity for preview
  const [previewIdentity, setPreviewIdentity] = useState({ name: 'Bot', color: '#1e3a8a' });

  // Determine domain for snippets
  const displayDomain = customDomain || (typeof window !== 'undefined' ? window.location.host : 'buildmybot.app');
  // Real working link
  const shareLink = `${window.location.protocol}//${displayDomain}/chat/${activeBot.id}`;

  useEffect(() => {
    if (activeBot.randomizeIdentity) {
      const randomName = HUMAN_NAMES[Math.floor(Math.random() * HUMAN_NAMES.length)];
      const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      setPreviewIdentity({ name: randomName, color: randomColor });
    } else {
      setPreviewIdentity({ name: activeBot.name, color: activeBot.themeColor });
    }
  }, [activeBot.randomizeIdentity, activeBot.name, activeBot.themeColor, selectedBotId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [testHistory, isTesting]);

  const handleBotSelect = (bot: BotType) => {
      setSelectedBotId(bot.id);
      setActiveBot(bot);
      setTestHistory([]);
  };

  const handleSaveBot = () => {
      // Ensure we have a valid ID if it's new
      const botToSave = { ...activeBot };
      if (botToSave.id === 'new') {
          botToSave.id = `b${Date.now()}`;
      }
      onSave(botToSave);
      // Update local view
      setActiveBot(botToSave);
      setSelectedBotId(botToSave.id);
  };

  const handleApplyPersona = (personaId: string) => {
    const persona = PERSONAS.find(p => p.id === personaId);
    if (persona) {
      setActiveBot({
        ...activeBot,
        systemPrompt: persona.prompt.replace('{company}', 'our company'),
        type: persona.name as any
      });
    }
  };

  const handleAddKnowledge = () => {
    if (!kbInput.trim()) return;
    setActiveBot({
      ...activeBot,
      knowledgeBase: [...(activeBot.knowledgeBase || []), kbInput]
    });
    setKbInput('');
  };

  const handleScrapeUrl = () => {
    if (!urlInput.trim()) return;
    setIsScraping(true);
    setTimeout(()