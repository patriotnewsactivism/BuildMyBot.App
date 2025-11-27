import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { BotBuilder } from './components/BotBuilder/BotBuilder';
import { ResellerDashboard } from './components/Reseller/ResellerDashboard';
import { MarketingTools } from './components/Marketing/MarketingTools';
import { LeadsCRM } from './components/CRM/LeadsCRM';
import { WebsiteBuilder } from './components/WebsiteBuilder/WebsiteBuilder';
import { Marketplace } from './components/Marketplace/Marketplace';
import { PhoneAgent } from './components/PhoneAgent/PhoneAgent';
import { ChatLogs } from './components/Chat/ChatLogs';
import { Billing } from './components/Billing/Billing';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { Settings } from './components/Settings/Settings';
import { LandingPage } from './components/Landing/LandingPage';
import { PartnerProgramPage } from './components/Landing/PartnerProgramPage';
import { PartnerSignup } from './components/Auth/PartnerSignup';
import { FullPageChat } from './components/Chat/FullPageChat';
import { User, UserRole, PlanType, Bot as BotType, ResellerStats, Lead, Conversation } from './types';
import { PLANS, MOCK_ANALYTICS_DATA } from './constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { MessageSquare, Users, TrendingUp, DollarSign, Bell, Bot as BotIcon, ArrowRight, Menu, CheckCircle, Flame } from 'lucide-react';
import { auth } from './services/firebaseConfig'; // Initialize Firebase

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

function App() {
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

  // Manual Routing Check for Full Page Chat
  const currentPath = window.location.pathname;
  if (currentPath.startsWith('/chat/')) {
     const botId = currentPath.split('/')[2];
     return <FullPageChat botId={botId} />;
  }

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

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        role={user.role} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        usage={totalConversations}
      />
      
      <main className="flex-1 overflow-hidden relative flex flex-col h-full">
        {/* Mobile Header */}
        <div className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
           <div className="flex items-center gap-2 font-bold text-slate-800">
              <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center border border-blue-800 shadow-lg shadow-blue-900/50 text-white">
                <BotIcon size={20} />
              </div>
              BuildMyBot
           </div>
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600">
              <Menu size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {notification && (
              <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-6 py-3 rounded-lg shadow-xl animate-bounce-slow flex items-center gap-3">
                 <Bell size={18} className="text-blue-400" /> {notification}
              </div>
          )}

          {currentView === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-10">
               {/* Dashboard Content */}
               <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
                    <p className="text-slate-500">Welcome back, {user.name.split(' ')[0]}.</p>
                  </div>
                  <button onClick={() => setCurrentView('bots')} className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-950 transition">
                    + Create New Bot
                  </button>
               </div>
               
               {/* Stats Cards */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><MessageSquare size={18}/></div>
                        <span className="text-sm font-medium text-slate-500">Total Chats</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-800">{totalConversations}</p>
                   </div>
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Users size={18}/></div>
                        <span className="text-sm font-medium text-slate-500">Leads Captured</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-800">{totalLeads}</p>
                   </div>
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg"><DollarSign size={18}/></div>
                        <span className="text-sm font-medium text-slate-500">Est. Savings</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-800">${estSavings}</p>
                   </div>
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><TrendingUp size={18}/></div>
                        <span className="text-sm font-medium text-slate-500">Avg. Response</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-800">{avgResponseTime}</p>
                   </div>
               </div>
               
               {/* Charts */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
                     <h3 className="font-bold text-slate-800 mb-4">Conversation Volume</h3>
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={MOCK_ANALYTICS_DATA}>
                          <defs>
                            <linearGradient id="colorConvos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                          <Tooltip />
                          <Area type="monotone" dataKey="conversations" stroke="#1e3a8a" strokeWidth={3} fillOpacity={1} fill="url(#colorConvos)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 flex flex-col">
                      <h3 className="font-bold text-slate-800 mb-4">Lead Sources</h3>
                      <div className="flex-1 flex items-center justify-center">
                         <div className="text-center space-y-2">
                            <div className="text-4xl font-bold text-blue-900">82%</div>
                            <p className="text-sm text-slate-500">from Sales Bot</p>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                               <div className="bg-blue-900 h-full w-[82%]"></div>
                            </div>
                         </div>
                      </div>
                  </div>
               </div>
            </div>
          )}

          {currentView === 'bots' && <BotBuilder bots={bots} onSave={(bot) => {
              if (bot.id === 'new' || !bots.find(b => b.id === bot.id)) {
                  setBots([...bots, { ...bot, id: bot.id === 'new' ? `b${Date.now()}` : bot.id }]);
              } else {
                  setBots(bots.map(b => b.id === bot.id ? bot : b));
              }
          }} customDomain={user.customDomain} onLeadDetected={handleLeadDetected} />}
          
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
          
        </div>
      </main>
    </div>
  );
}

export default App;
