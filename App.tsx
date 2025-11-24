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
import { User, UserRole, PlanType, Bot as BotType, ResellerStats } from './types';
import { PLANS, MOCK_ANALYTICS_DATA } from './constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { MessageSquare, Users, TrendingUp, DollarSign, Bell, Bot as BotIcon, ArrowRight, Menu } from 'lucide-react';

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
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
           { label: 'Conversations (Session)', val: '652', icon: MessageSquare, color: 'blue', change: '+12%' },
           { label: 'Leads Captured', val: '142', icon: Users, color: 'sky', change: '+8%' },
           { label: 'Avg. Response Time', val: '1.2s', icon: TrendingUp, color: 'emerald', change: '-5%' },
           { label: 'Est. Savings', val: '$3,200', icon: DollarSign, color: 'slate', change: '+22%' },
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
             {bots.map(bot => (
               <div key={bot.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition cursor-pointer" onClick={() => setCurrentView('bots')}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm" style={{backgroundColor: bot.themeColor}}>
                    {bot.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-800">{bot.name}</p>
                    <p className="text-xs text-slate-500">{bot.conversationsCount} conversations</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></div>
               </div>
             ))}
          </div>
           <button onClick={() => setCurrentView('bots')} className="w-full mt-4 py-2 text-sm text-blue-900 font-medium hover:bg-blue-50 rounded-lg transition flex items-center justify-center gap-1">
             View All Bots <ArrowRight size={14} />
           </button>
        </div>
      </div>
    </div>
  );
}

export default App;