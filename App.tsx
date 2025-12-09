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
import { MessageSquare, Users, TrendingUp, DollarSign, Bell, Bot as BotIcon, ArrowRight, Menu, CheckCircle, Flame, Loader } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { dbService } from './services/dbService';

const INITIAL_CHAT_LOGS: Conversation[] = []; 
const INITIAL_RESELLER_STATS: ResellerStats = {
  totalClients: 0,
  totalRevenue: 0,
  commissionRate: 0.20,
  pendingPayout: 0,
};

// Define Master Admins here
const MASTER_EMAILS = ['admin@buildmybot.app', 'master@buildmybot.app', 'ceo@buildmybot.app', 'mreardon@wtpnews.org', 'ben@texasplanninglaw.com'];

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBooting, setIsBooting] = useState(true); // Premium loading state
  const [currentView, setCurrentView] = useState('dashboard');
  const [showPartnerPage, setShowPartnerPage] = useState(false);
  const [showPartnerSignup, setShowPartnerSignup] = useState(false);
  
  // Real State
  const [user, setUser] = useState<User | null>(null);
  const [bots, setBots] = useState<BotType[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [chatLogs, setChatLogs] = useState<Conversation[]>(INITIAL_CHAT_LOGS);
  
  // UI State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [notification, setNotification] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Manual Routing Check for Full Page Chat
  const currentPath = window.location.pathname;
  if (currentPath.startsWith('/chat/')) {
     const botId = currentPath.split('/')[2];
     return <FullPageChat botId={botId} />;
  }

  // --- Capture Referral Code ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      localStorage.setItem('bmb_ref_code', refCode);
      console.log('Referral captured:', refCode);
    }
    
    // Fake boot sequence for premium feel
    setTimeout(() => setIsBooting(false), 1200);
  }, []);

  // --- Real-time Data Subscriptions ---
  useEffect(() => {
    if (!supabase) return;

    // Supabase Auth Listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setIsLoggedIn(true);
        const email = session.user.email;
        
        // CHECK FOR GOD MODE (Master Emails)
        if (email && MASTER_EMAILS.includes(email.toLowerCase())) {
           setUser({
              id: session.user.id,
              name: 'Master Admin',
              email: email,
              role: UserRole.ADMIN, // Grant Full Access
              plan: PlanType.ENTERPRISE, // Grant Uncapped Limits
              companyName: 'BuildMyBot HQ',
              avatarUrl: session.user.user_metadata?.avatar_url
           });
           return;
        }

        // Standard User Flow
        const profile = await dbService.getUserProfile(session.user.id);
        if (profile) {
          setUser(profile);
        } else {
          // Fallback if profile creation is lagging (create a basic free user in state)
          setUser({
            id: session.user.id,
            name: email?.split('@')[0] || 'User',
            email: email || '',
            role: UserRole.OWNER,
            plan: PlanType.FREE,
            companyName: 'My Company'
          });
        }
      } else if (event === 'SIGNED_OUT') {
        // Do not reset if user was set manually (Demo Mode fallback)
        if (!user || !user.id.startsWith('demo-user')) {
             setIsLoggedIn(false);
             setUser(null);
        }
      }
    });

    // Subscribe to Bots
    const unsubscribeBots = dbService.subscribeToBots((updatedBots) => {
       setBots(updatedBots);
    });

    // Subscribe to Leads
    const unsubscribeLeads = dbService.subscribeToLeads((updatedLeads) => {
       setLeads(updatedLeads);
    });

    return () => {
      authListener.subscription.unsubscribe();
      unsubscribeBots();
      unsubscribeLeads();
    };
  }, [user]); // Add user to dependancy array to prevent clobbering demo user

  // Calculated Stats
  const totalConversations = bots.reduce((acc, bot) => acc + bot.conversationsCount, 0);
  const totalLeads = leads.length;
  const estSavings = totalConversations * 5; 
  const avgResponseTime = "0.8s";

  const handleAdminLogin = () => {
      // Manual trigger for demo purposes if needed (from footer)
      handleManualAuth('admin@buildmybot.app', 'Master Admin', 'BuildMyBot HQ');
  };

  // Fallback authentication for when Supabase Config is invalid or blocked
  const handleManualAuth = (email: string, name?: string, companyName?: string) => {
      const isMaster = MASTER_EMAILS.includes(email.toLowerCase());
      
      const newUser: User = {
          id: isMaster ? 'master-admin' : 'demo-user-' + Date.now(),
          name: name || email.split('@')[0],
          email: email,
          role: isMaster ? UserRole.ADMIN : UserRole.OWNER,
          plan: isMaster ? PlanType.ENTERPRISE : PlanType.FREE,
          companyName: companyName || (isMaster ? 'BuildMyBot HQ' : 'Demo Company'),
          createdAt: new Date().toISOString()
      };

      setUser(newUser);
      setIsLoggedIn(true);
      setAuthModalOpen(false);
      
      if (isMaster) {
          setCurrentView('admin');
      }
      
      setNotification("Logged in (Demo Mode)");
      setTimeout(() => setNotification(null), 3000);
  };

  const handlePartnerSignup = (data: any) => {
    // In a real flow, this would create the user in DB with RESELLER role
    setUser({ 
      id: 'reseller-' + Date.now(),
      email: data.email,
      name: data.name,
      role: UserRole.RESELLER, 
      plan: PlanType.FREE,
      companyName: data.companyName,
      resellerCode: data.companyName.substring(0,3).toUpperCase() + '2024'
    });
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
    
    // Save to DB
    dbService.saveBot(newBot);
    
    setNotification(`Installed "${template.name}" successfully!`);
    setTimeout(() => setNotification(null), 3000);
    setCurrentView('bots');
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    dbService.saveLead(updatedLead);
  };

  const handleLeadDetected = (email: string) => {
    // This is called by BotBuilder test chat
    const newLead: Lead = {
      id: Date.now().toString(),
      name: 'Website Visitor',
      email: email,
      score: 85,
      status: 'New',
      botId: 'test-bot',
      createdAt: new Date().toISOString()
    };
    dbService.saveLead(newLead);
    setNotification("New Hot Lead Detected from Chat! 🔥");
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveBot = (bot: BotType) => {
     dbService.saveBot(bot);
     setNotification("Bot saved successfully!");
     setTimeout(() => setNotification(null), 2000);
  };

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  if (isBooting) {
      return (
        <div className="h-screen w-full bg-slate-900 flex items-center justify-center">
            <div className="flex flex-col items-center animate-fade-in">
                <div className="w-20 h-20 bg-blue-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/50 mb-6 animate-bounce-slow">
                    <BotIcon size={48} className="text-white" />
                </div>
                <h1 className="text-white font-bold text-2xl tracking-widest uppercase mb-2">BuildMyBot</h1>
                <p className="text-blue-400 text-xs font-mono tracking-wide mb-6">INITIALIZING SYSTEM...</p>
                <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                </div>
            </div>
        </div>
      );
  }

  // If not logged in, show Public Landing Page or Partner Page
  // This logic guarantees the landing page is the default view
  if (!isLoggedIn || !user) {
    if (showPartnerSignup) {
        return <PartnerSignup onBack={() => setShowPartnerSignup(false)} onComplete={handlePartnerSignup} />;
    }
    if (showPartnerPage) {
      return <PartnerProgramPage onBack={() => setShowPartnerPage(false)} onLogin={() => openAuth('login')} onSignup={() => setShowPartnerSignup(true)} />;
    }
    return (
      <>
        <LandingPage 
          onLogin={() => openAuth('login')} 
          onNavigateToPartner={() => setShowPartnerPage(true)} 
          onAdminLogin={handleAdminLogin} 
        />
        <AuthModal 
          isOpen={authModalOpen} 
          onClose={() => setAuthModalOpen(false)} 
          defaultMode={authMode} 
          onLoginSuccess={handleManualAuth}
        />
      </>
    );
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

          {currentView === 'bots' && <BotBuilder 
              bots={bots} 
              onSave={handleSaveBot} 
              customDomain={user.customDomain} 
              onLeadDetected={handleLeadDetected} 
          />}
          
          {currentView === 'reseller' && <ResellerDashboard user={user} stats={INITIAL_RESELLER_STATS} />}
          
          {currentView === 'marketing' && <MarketingTools />}
          
          {currentView === 'leads' && <LeadsCRM leads={leads} onUpdateLead={handleUpdateLead} />}
          
          {currentView === 'website' && <WebsiteBuilder />}
          
          {currentView === 'marketplace' && <Marketplace onInstall={handleInstallTemplate} />}
          
          {currentView === 'phone' && <PhoneAgent user={user} onUpdate={(u) => { setUser(u); dbService.saveUserProfile(u); }} />}
          
          {currentView === 'chat-logs' && <ChatLogs conversations={chatLogs} />}
          
          {currentView === 'billing' && <Billing user={user} />}
          
          {currentView === 'admin' && <AdminDashboard />}
          
          {currentView === 'settings' && <Settings user={user} onUpdateUser={(u) => { setUser(u); dbService.saveUserProfile(u); }} />}
          
        </div>
      </main>
    </div>
  );
}

export default App;