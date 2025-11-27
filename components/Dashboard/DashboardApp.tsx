'use client';

import React, { useState } from 'react';
import { Sidebar } from '../Layout/Sidebar';
import { BotBuilder } from '../BotBuilder/BotBuilder';
import { ResellerDashboard } from '../Reseller/ResellerDashboard';
import { MarketingTools } from '../Marketing/MarketingTools';
import { LeadsCRM } from '../CRM/LeadsCRM';
import { WebsiteBuilder } from '../WebsiteBuilder/WebsiteBuilder';
import { Marketplace } from '../Marketplace/Marketplace';
import { PhoneAgent } from '../PhoneAgent/PhoneAgent';
import { ChatLogs } from '../Chat/ChatLogs';
import { Billing } from '../Billing/Billing';
import { AdminDashboard } from '../Admin/AdminDashboard';
import { Settings } from '../Settings/Settings';
import { LandingPage } from '../Landing/LandingPage';
import { PartnerProgramPage } from '../Landing/PartnerProgramPage';
import { PartnerSignup } from '../Auth/PartnerSignup';
import { User, UserRole, PlanType, Bot as BotType, ResellerStats, Lead, Conversation } from '../../types';
import { PLANS, MOCK_ANALYTICS_DATA } from '../../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { MessageSquare, Users, TrendingUp, DollarSign, Bell, Bot as BotIcon, ArrowRight, Menu, CheckCircle, Flame } from 'lucide-react';

const MOCK_USER: User = {
  id: 'u1',
  name: 'Alex Johnson',
  email: 'alex@enterprise.com',
  role: UserRole.OWNER,
  plan: PlanType.ENTERPRISE, 
  companyName: 'Apex Global',
  resellerCode: 'APEX2024',
  customDomain: 'app.apexglobal.com'
};

const MOCK_BOTS: BotType[] = [
  { 
    id: 'b1', 
    name: 'Sales Assistant', 
    type: 'Sales', 
    systemPrompt: 'You are a sales assistant.', 
    model: 'gpt-4o-mini', 
    temperature: 0.8, 
    knowledgeBase: [], 
    active: true, 
    conversationsCount: 342, 
    themeColor: '#1e3a8a',
    maxMessages: 20,
    randomizeIdentity: true
  },
  { 
    id: 'b2', 
    name: 'Support Bot', 
    type: 'Customer Support', 
    systemPrompt: 'You are a support agent.', 
    model: 'gpt-4o-mini', 
    temperature: 0.4, 
    knowledgeBase: [], 
    active: true, 
    conversationsCount: 156, 
    themeColor: '#10b981',
    maxMessages: 20,
    randomizeIdentity: false
  },
];

const MOCK_LEADS: Lead[] = [
    { id: '1', name: 'Sarah Connor', email: 'sarah@skynet.com', phone: '+1 555-0123', score: 95, status: 'New', sourceBotId: 'b1', createdAt: '2024-05-15T10:00:00Z' },
    { id: '2', name: 'John Doe', email: 'john.doe@example.com', phone: '+1 555-0199', score: 45, status: 'Contacted', sourceBotId: 'b2', createdAt: '2024-05-14T08:30:00Z' },
    { id: '3', name: 'Emily Blunt', email: 'emily@hollywood.com', phone: '', score: 82, status: 'Qualified', sourceBotId: 'b1', createdAt: '2024-05-12T14:20:00Z' },
    { id: '4', name: 'Michael Scott', email: 'michael@dunder.com', phone: '+1 555-9999', score: 10, status: 'Closed', sourceBotId: 'b1', createdAt: '2024-05-10T09:00:00Z' },
    { id: '5', name: 'Dwight Schrute', email: 'beetfarmer@farms.com', phone: '+1 555-2342', score: 65, status: 'New', sourceBotId: 'b2', createdAt: '2024-05-16T11:45:00Z' },
];

const INITIAL_CHAT_LOGS: Conversation[] = [
    {
      id: 'c1',
      botId: 'b1',
      sentiment: 'Positive',
      timestamp: Date.now() - 1000 * 60 * 5,
      messages: [
        { role: 'user', text: 'Hi, I need help with pricing.', timestamp: Date.now() - 1000 * 60 * 5 },
        { role: 'model', text: 'Sure! Our Enterprise plan is $399/mo and includes unlimited bots. Would you like to know more?', timestamp: Date.now() - 1000 * 60 * 4 },
        { role: 'user', text: 'That sounds perfect. Does it include SLA?', timestamp: Date.now() - 1000 * 60 * 3 },
        { role: 'model', text: 'Yes, the Enterprise plan includes Priority SLA support and a dedicated account manager.', timestamp: Date.now() - 1000 * 60 * 2 },
      ]
    },
    {
      id: 'c2',
      botId: 'b1',
      sentiment: 'Neutral',
      timestamp: Date.now() - 1000 * 60 * 60,
      messages: [
        { role: 'user', text: 'Where are you located?', timestamp: Date.now() - 1000 * 60 * 60 },
        { role: 'model', text: 'We are a digital-first company with headquarters in San Francisco.', timestamp: Date.now() - 1000 * 60 * 59 },
      ]
    },
    {
      id: 'c3',
      botId: 'b2',
      sentiment: 'Negative',
      timestamp: Date.now() - 1000 * 60 * 60 * 24,
      messages: [
        { role: 'user', text: 'My login is not working.', timestamp: Date.now() - 1000 * 60 * 60 * 24 },
        { role: 'model', text: 'I apologize. Have you tried resetting your password?', timestamp: Date.now() - 1000 * 60 * 60 * 24 },
        { role: 'user', text: 'Yes, it is still broken. This sucks.', timestamp: Date.now() - 1000 * 60 * 60 * 24 },
      ]
    }
];

const MOCK_RESELLER_STATS: ResellerStats = {
  totalClients: 64,
  totalRevenue: 5200,
  commissionRate: 0.30,
  pendingPayout: 1560,
};

function DashboardApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showPartnerPage, setShowPartnerPage] = useState(false);
  const [showPartnerSignup, setShowPartnerSignup] = useState(false);
  const [user, setUser] = useState<User>(MOCK_USER);
  const [bots, setBots] = useState<BotType[]>(MOCK_BOTS);
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [chatLogs, setChatLogs] = useState<Conversation[]>(INITIAL_CHAT_LOGS);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Calculated Stats
  const totalConversations = bots.reduce((acc, bot) => acc + bot.conversationsCount, 0);
  const totalLeads = leads.length;
  // Estimate savings: $5 per conversation (support cost)
  const estSavings = totalConversations * 5; 
  // Avg Response Time (Mocked but variable)
  const avgResponseTime = "1.2s";

  // Handle Admin Portal Access
  const handleAdminLogin = () => {
      setUser({ ...MOCK_USER, role: UserRole.ADMIN, name: 'Master Admin' });
      setIsLoggedIn(true);
      setCurrentView('admin');
  };

  const handlePartnerSignup = (data: any) => {
    setUser({ ...MOCK_USER, role: UserRole.RESELLER, name: data.name, companyName: data.companyName || 'My Agency' });
    setIsLoggedIn(true);
    setCurrentView('reseller');
    setShowPartnerSignup(false);
    setShowPartnerPage(false);
  };

  const handleInstallTemplate = (template: any) => {
    const newBot: BotType = {
      id: `b${Date.now()}`,
      name: template.name,
      type: template.category === 'All' ? 'Custom' : template.category,
      systemPrompt: `You are a helpful assistant specialized in ${template.category}. ${template.description}. Act professionally and help the user achieve their goals.`,
      model: 'gpt-4o-mini',
      temperature: 0.7,
      knowledgeBase: [],
      active: true,
      conversationsCount: 0,
      themeColor: ['#1e3a8a', '#be123c', '#047857', '#d97706'][Math.floor(Math.random() * 4)],
      maxMessages: 20,
      randomizeIdentity: true
    };
    setBots([...bots, newBot]);
    setNotification(`Installed "${template.name}" successfully!`);
    setTimeout(() => setNotification(null), 3000);
    setCurrentView('bots');
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    setLeads(leads.map(l => l.id === updatedLead.id ? updatedLead : l));
  };

  const handleLeadDetected = (email: string) => {
    const existing = leads.find(l => l.email === email);
    if (!existing) {
      const newLead: Lead = {
        id: Date.now().toString(),
        name: 'Website Visitor', // In a real app, we'd extract this too
        email: email,
        score: 85, // High score for direct entry
        status: 'New',
        sourceBotId: 'test-bot',
        createdAt: new Date().toISOString()
      };
      setLeads(prev => [newLead, ...prev]);
      setNotification("New Hot Lead Detected from Chat! 🔥");
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // If not logged in, show Public Landing Page or Partner Page
  if (!isLoggedIn) {
    if (showPartnerSignup) {
        return <PartnerSignup onBack={() => setShowPartnerSignup(false)} onComplete={handlePartnerSignup} />;
    }
    if (showPartnerPage) {
      return <PartnerProgramPage onBack={() => setShowPartnerPage(false)} onLogin={() => setIsLoggedIn(true)} onSignup={() => setShowPartnerSignup(true)} />;
    }
    return <LandingPage onLogin={() => setIsLoggedIn(true)} onNavigateToPartner={() => setShowPartnerPage(true)} onAdminLogin={handleAdminLogin} />;
  }

  // Simple Dashboard View Component
  const Dashboard = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <div className="flex items-center gap-2">
             <h2 className="text-2xl font-bold text-slate-800">Welcome back, {user.name.split(' ')[0]}</h2>
             {user.plan === PlanType.ENTERPRISE && (
               <span className="bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide border border-slate-700">Enterprise</span>
             )}
           </div>
           <p className="text-slate-500">Here's what's happening with your bots today.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-950 shadow-sm shadow-blue-200 flex items-center gap-2" onClick={() => setCurrentView('bots')}>
             <BotIcon size={16} /> Create Bot
          </button>
          <button className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-blue-900 transition shadow-sm relative">
            <Bell size={20} />
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: 'Conversations', val: totalConversations.toLocaleString(), icon: MessageSquare, color: 'blue', change: '+12%' },
           { label: 'Leads Captured', val: totalLeads.toLocaleString(), icon: Users, color: 'sky', change: '+8%' },
           { label: 'Avg. Response Time', val: avgResponseTime, icon: TrendingUp, color: 'emerald', change: '-5%' },
           { label: 'Est. Savings', val: `$${estSavings.toLocaleString()}`, icon: DollarSign, color: 'slate', change: '+22%' },
         ].map((stat, i) => (
           <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                 <div className={`p-2 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg`}>
                   <stat.icon size={20} />
                 </div>
                 <span className={`text-xs font-medium px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                   {stat.change}
                 </span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stat.val}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-6">Conversation Volume</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_ANALYTICS_DATA}>
                <defs>
                  <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="conversations" stroke="#1e3a8a" strokeWidth={3} fillOpacity={1} fill="url(#colorConv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-semibold text-slate-800 mb-4">Active Bots</h3>
          <div className="space-y-4 flex-1">
             {bots.slice(0, 4).map(bot => (
               <div key={bot.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition cursor-pointer" onClick={() => setCurrentView('bots')}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm" style={{backgroundColor: bot.themeColor}}>
                    {bot.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-800">{bot.name}</p>
                    <p className="text-xs text-slate-500">{bot.conversationsCount} conversations</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ring-2 ${bot.active ? 'bg-emerald-500 ring-emerald-100' : 'bg-slate-300 ring-slate-100'}`}></div>
               </div>
             ))}
          </div>
           <button onClick={() => setCurrentView('bots')} className="w-full mt-4 py-2 text-sm text-blue-900 font-medium hover:bg-blue-50 rounded-lg transition flex items-center justify-center gap-1">
             View All {bots.length} Bots <ArrowRight size={14} />
           </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 relative">
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        role={user.role} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        user={user}
        usage={totalConversations}
      />
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in border border-slate-700">
           {notification.includes('Lead') ? <Flame className="text-orange-500" size={20} /> : <CheckCircle className="text-emerald-400" size={20} />}
           <span className="font-medium text-sm">{notification}</span>
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-slate-900 text-white p-4 flex items-center justify-between z-30 shadow-md">
         <div className="flex items-center gap-2 font-bold">
            <BotIcon size={20} /> BuildMyBot
         </div>
         <button onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
      </div>

      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 p-4 md:p-8 relative">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'bots' && (
           <BotBuilder 
             bots={bots} 
             onSave={(updatedBot) => setBots(bots.map(b => b.id === updatedBot.id ? updatedBot : b))} 
             customDomain={user.customDomain} 
             onLeadDetected={handleLeadDetected}
           />
        )}
        {currentView === 'reseller' && <ResellerDashboard user={user} stats={MOCK_RESELLER_STATS} />}
        {currentView === 'marketing' && <MarketingTools />}
        {currentView === 'leads' && <LeadsCRM leads={leads} onUpdateLead={handleUpdateLead} />}
        {currentView === 'website' && <WebsiteBuilder />}
        {currentView === 'marketplace' && <Marketplace onInstall={handleInstallTemplate} />}
        {currentView === 'phone' && <PhoneAgent />}
        {currentView === 'chat-logs' && <ChatLogs conversations={chatLogs} />}
        {currentView === 'billing' && <Billing />}
        {currentView === 'admin' && <AdminDashboard />}
        {currentView === 'settings' && <Settings user={user} onUpdateUser={(u) => setUser(u)} />}
      </main>
    </div>
  );
}

export default DashboardApp;