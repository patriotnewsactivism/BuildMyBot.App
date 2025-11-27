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
import { AuthModal } from './components/Auth/AuthModal';
import { User, UserRole, PlanType, Bot as BotType, ResellerStats, Lead, Conversation } from './types';
import { PLANS, MOCK_ANALYTICS_DATA } from './constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { MessageSquare, Users, TrendingUp, DollarSign, Bell, Bot as BotIcon, ArrowRight, Menu, CheckCircle, Flame } from 'lucide-react';
import { auth } from './services/firebaseConfig';
import { dbService } from './services/dbService';

const MOCK_USER: User = {
  id: 'guest',
  name: 'Guest User',
  email: 'guest@example.com',
  role: UserRole.OWNER,
  plan: PlanType.FREE,
  companyName: 'My Company'
};

const INITIAL_CHAT_LOGS: Conversation[] = [];

const MOCK_RESELLER_STATS: ResellerStats = {
  totalClients: 0,
  totalRevenue: 0,
  commissionRate: 0.20,
  pendingPayout: 0,
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showPartnerPage, setShowPartnerPage] = useState(false);
  const [showPartnerSignup, setShowPartnerSignup] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [user, setUser] = useState<User>(MOCK_USER);
  const [bots, setBots] = useState<BotType[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [chatLogs, setChatLogs] = useState<Conversation[]>(INITIAL_CHAT_LOGS);
  const [notification, setNotification] = useState<string | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch or create user profile
        const profile = await dbService.getUserProfile(firebaseUser.uid);
        if (profile) {
           setUser(profile);
        } else {
           // Fallback if profile missing
           setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              role: UserRole.OWNER,
              plan: PlanType.FREE,
              companyName: 'New Company'
           });
        }
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Data Listeners
  useEffect(() => {
    if (!isLoggedIn) return;

    // Real-time Bots
    const unsubBots = dbService.subscribeToBots((fetchedBots) => {
      setBots(fetchedBots);
    });

    // Real-time Leads
    const unsubLeads = dbService.subscribeToLeads((fetchedLeads) => {
      setLeads(fetchedLeads);
    });

    return () => {
      unsubBots();
      unsubLeads();
    };
  }, [isLoggedIn]);

  // Handle Full Page Chat Route
  const currentPath = window.location.pathname;
  if (currentPath.startsWith('/chat/')) {
     const botId = currentPath.split('/')[2];
     return <FullPageChat botId={botId} />;
  }

  const totalConversations = bots.reduce((acc, bot) => acc + bot.conversationsCount, 0);
  const totalLeads = leads.length;
  const estSavings = totalConversations * 5; 
  const avgResponseTime = "1.2s";

  const handleAdminLogin = () => {
      // For demo purposes, we simulate admin access. 
      // In real app, this would check Firebase claims or DB role.
      setUser({ ...user, role: UserRole.ADMIN, name: 'Master Admin' });
      setIsLoggedIn(true);
      setCurrentView('admin');
  };

  const handlePartnerSignup = (data: any) => {
    // In real app, create reseller profile in DB
    setUser({ ...user, role: UserRole.RESELLER, name: data.name, companyName: data.companyName || 'My Agency' });
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
    dbService.saveBot(newBot); // Save to Firestore
    setNotification(`Installed "${template.name}" successfully!`);
    setTimeout(() => setNotification(null), 3000);
    setCurrentView('bots');
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    dbService.saveLead(updatedLead); // Update in Firestore
  };

  const handleLeadDetected = (email: string) => {
    // Check if email already exists in local state (listener will handle sync but this prevents instant duplicate visual)
    if (leads.some(l => l.email === email)) return;

    const newLead: Lead = {
        id: Date.now().toString(),
        name: 'Website Visitor', 
        email: email,
        score: 85,
        status: 'New',
        sourceBotId: 'web-chat',
        createdAt: new Date().toISOString()
    };
    dbService.saveLead(newLead); // Save to Firestore
    setNotification("New Hot Lead Detected from Chat! 🔥");
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveBot = async (bot: BotType) => {
     await dbService.saveBot(bot);
     setNotification("Bot saved successfully!");
     setTimeout(() => setNotification(null), 2000);
  };

  if (!isLoggedIn) {
    if (showPartnerSignup) {
        return <PartnerSignup onBack={() => setShowPartnerSignup(false)} onComplete={handlePartnerSignup} />;
    }
    if (showPartnerPage) {
      return <PartnerProgramPage onBack={() => setShowPartnerPage(false)} onLogin={() => setShowAuthModal(true)} onSignup={() => setShowPartnerSignup(true)} />;
    }
    return (
      <>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onLoginSuccess={() => {}} />
        <LandingPage onLogin={() => setShowAuthModal(true)} onNavigateToPartner={() => setShowPartnerPage(true)} onAdminLogin={handleAdminLogin} />
      </>
    );
  }

  // Dashboard Component (Internal)
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
             {bots.length === 0 ? (
               <div className="text-center text-slate-400 py-8">No bots created yet.</div>
             ) : (
                bots.slice(0, 4).map(bot => (
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
                ))
             )}
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
      
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in border border-slate-700">
           {notification.includes('Lead') ? <Flame className="text-orange-500" size={20} /> : <CheckCircle className="text-emerald-400" size={20} />}
           <span className="font-medium text-sm">{notification}</span>
        </div>
      )}

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
             onSave={handleSaveBot} 
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

export default App;