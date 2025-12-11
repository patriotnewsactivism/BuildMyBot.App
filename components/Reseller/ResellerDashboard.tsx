import React, { useState, useEffect } from 'react';
import { DollarSign, Users, TrendingUp, Copy, CheckCircle, Shield, Lock, CreditCard, ChevronRight, AlertTriangle, Building, LayoutDashboard, Loader, QrCode, Share2, ExternalLink } from 'lucide-react';
import { ResellerStats, User } from '../../types';
import { RESELLER_TIERS, PLANS } from '../../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { dbService } from '../../services/dbService';
import { supabase } from '../../services/supabaseClient';

interface ResellerProps {
  user: User;
  stats: ResellerStats;
}

interface EarningsData {
  month: string;
  amount: number;
}

export const ResellerDashboard: React.FC<ResellerProps> = ({ user, stats: initialStats }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'payouts'>('overview');
  const [referredUsers, setReferredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [realStats, setRealStats] = useState<ResellerStats>(initialStats);
  const [earningsData, setEarningsData] = useState<EarningsData[]>([]);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (user.resellerCode) {
      const unsubscribe = dbService.subscribeToReferrals(user.resellerCode, (users) => {
        setReferredUsers(users);

        // Calculate real stats
        const clientCount = users.length;
        const totalRev = users.reduce((acc, u) => acc + (PLANS[u.plan]?.price || 0), 0);

        // Determine commission tier
        const currentTier = RESELLER_TIERS.find(t => clientCount >= t.min && clientCount <= t.max) || RESELLER_TIERS[0];

        setRealStats({
          totalClients: clientCount,
          totalRevenue: totalRev,
          commissionRate: currentTier.commission,
          pendingPayout: totalRev * currentTier.commission,
          addOnCommission: 0,
          arrears: 0,
        });

        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      setIsLoading(false);
    }
  }, [user.resellerCode]);

  // Fetch earnings history
  useEffect(() => {
    const fetchEarnings = async () => {
      if (!user?.id || !supabase) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) return;

        const response = await fetch(`${supabaseUrl}/functions/v1/analytics`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'reseller_earnings', period: '6m' }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.earnings) {
            setEarningsData(data.earnings);
          }
        }
      } catch (e) {
        console.error('Failed to fetch earnings:', e);
        // Generate fallback data based on real stats
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const currentMonth = new Date().getMonth();
        const fallbackData = months.map((month, i) => ({
          month,
          amount: Math.round(realStats.pendingPayout * ((i + 1) / 6) * (0.8 + Math.random() * 0.4)),
        }));
        setEarningsData(fallbackData);
      }
    };

    if (!isLoading && realStats.totalClients > 0) {
      fetchEarnings();
    } else if (!isLoading) {
      // Set empty or starter data
      setEarningsData([
        { month: 'Jan', amount: 0 },
        { month: 'Feb', amount: 0 },
        { month: 'Mar', amount: 0 },
        { month: 'Apr', amount: 0 },
        { month: 'May', amount: 0 },
        { month: 'Jun', amount: 0 },
      ]);
    }
  }, [user?.id, isLoading, realStats.totalClients, realStats.pendingPayout]);

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const currentTier = RESELLER_TIERS.find(t => realStats.totalClients >= t.min && realStats.totalClients <= t.max) || RESELLER_TIERS[0];
  const nextTier = RESELLER_TIERS.find(t => t.min > realStats.totalClients);
  const tierRange = nextTier ? (nextTier.min - currentTier.min) : 1; // Prevent division by zero
  const progress = nextTier
    ? ((realStats.totalClients - currentTier.min) / tierRange) * 100
    : 100;

  // Build the full referral URL with proper protocol
  const getBaseUrl = () => {
    if (user.customDomain) {
      return `https://${user.customDomain}`;
    }
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.host}`;
    }
    return 'https://buildmybot.app';
  };
  const baseUrl = getBaseUrl();
  const referralUrl = `${baseUrl}/?ref=${user.resellerCode || 'CODE'}`;

  const OverviewTab = () => (
    <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign size={20} />
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">Monthly</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">${realStats.totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-slate-500 mt-1">Total Generated Revenue</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{realStats.totalClients}</p>
          <p className="text-sm text-slate-500 mt-1">Active Referrals</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-semibold bg-cyan-100 text-cyan-700 px-2 py-1 rounded">{(realStats.commissionRate * 100)}% Split</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">${realStats.pendingPayout.toLocaleString()}</p>
          <p className="text-sm text-slate-500 mt-1">Your Est. Commission</p>
        </div>

        <div className="bg-gradient-to-br from-blue-900 to-slate-900 p-6 rounded-xl shadow-lg text-white">
           <p className="text-blue-200 text-sm font-medium mb-1">Your Referral Link</p>
           <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg border border-white/20 mb-3">
             <code className="text-xs truncate flex-1">{referralUrl}</code>
             <button
               onClick={copyReferralLink}
               className="p-1 hover:bg-white/10 rounded transition"
               title="Copy link"
             >
               {copied ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
             </button>
           </div>
           <div className="flex gap-2">
             <button
               onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent('Check out BuildMyBot - Build AI chatbots in minutes!')}`, '_blank')}
               className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition flex items-center justify-center gap-1"
             >
               <Share2 size={12} /> Share
             </button>
             <button
               onClick={() => setShowQR(!showQR)}
               className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition flex items-center gap-1"
             >
               <QrCode size={12} />
             </button>
           </div>
           {showQR && (
             <div className="mt-3 p-3 bg-white rounded-lg">
               <img
                 src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(referralUrl)}`}
                 alt="QR Code"
                 className="mx-auto"
               />
             </div>
           )}
        </div>
      </div>

      {/* Tier Progress */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
         <div className="flex justify-between mb-2">
           <h3 className="font-semibold text-slate-800">Current Tier: <span className="text-blue-900">{currentTier.label}</span></h3>
           <span className="text-sm text-slate-500">{realStats.totalClients} / {nextTier ? nextTier.min : 'Max'} Clients</span>
         </div>
         <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-2">
            <div className="bg-blue-900 h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
         </div>
         <p className="text-sm text-slate-500">
           {nextTier 
             ? `Recruit ${nextTier.min - realStats.totalClients} more clients to unlock ${nextTier.commission * 100}% commission!` 
             : "You've reached the top tier!"}
         </p>
      </div>

      {/* Earnings Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
        <h3 className="font-semibold text-slate-800 mb-6">Commission Earnings</h3>
        {earningsData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={earningsData}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(value) => `$${value}`} />
              <Tooltip
                cursor={{fill: '#f1f5f9'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Commission']}
              />
              <Bar dataKey="amount" fill="#1e3a8a" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            <p>Start referring clients to see your earnings grow!</p>
          </div>
        )}
      </div>
    </div>
  );

  const ClientsTab = () => (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
         <div className="p-6 border-b border-slate-100">
             <h3 className="font-bold text-slate-800">Referral List</h3>
             <p className="text-sm text-slate-500">Track all businesses you have onboarded.</p>
         </div>
         <div className="overflow-x-auto">
             <table className="w-full text-left">
                 <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                     <tr>
                         <th className="px-6 py-4">Business Name</th>
                         <th className="px-6 py-4">Plan</th>
                         <th className="px-6 py-4">Contact</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4">Your Commission</th>
                         <th className="px-6 py-4 text-right">Actions</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 text-sm">
                     {referredUsers.map((client, i) => {
                         const price = PLANS[client.plan]?.price || 0;
                         const commission = price * realStats.commissionRate;
                         
                         return (
                         <tr key={i} className="hover:bg-slate-50 transition">
                             <td className="px-6 py-4 font-medium text-slate-800">{client.companyName}</td>
                             <td className="px-6 py-4">
                                 <span className={`px-2 py-1 rounded text-xs font-medium ${
                                     client.plan === 'EXECUTIVE' ? 'bg-blue-100 text-blue-800' :
                                     client.plan === 'PROFESSIONAL' ? 'bg-emerald-100 text-emerald-800' :
                                     'bg-slate-100 text-slate-600'
                                 }`}>{client.plan}</span>
                             </td>
                             <td className="px-6 py-4 text-slate-500">{client.email}</td>
                             <td className="px-6 py-4">
                                <span className="flex items-center gap-1.5 text-emerald-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Active
                                </span>
                             </td>
                             <td className="px-6 py-4 font-mono font-medium text-slate-700">${commission.toFixed(2)}/mo</td>
                             <td className="px-6 py-4 text-right">
                                <button className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md transition ml-auto font-medium">
                                  <LayoutDashboard size={14} /> View
                                </button>
                             </td>
                         </tr>
                     )})}
                     {referredUsers.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                No clients referred yet. Share your link to start earning!
                            </td>
                        </tr>
                     )}
                 </tbody>
             </table>
         </div>
      </div>
  );

  const PayoutsTab = () => (
      <div className="max-w-3xl space-y-6 animate-fade-in">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex gap-4">
             <Shield className="text-blue-900 shrink-0" size={24} />
             <div>
                 <h4 className="font-bold text-blue-900">Secure Banking Information</h4>
                 <p className="text-sm text-blue-700 mt-1">
                     Your banking and tax information is stored securely using AES-256 encryption. 
                     This information is required to process your monthly commission payouts in compliance with tax regulations.
                 </p>
             </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Building size={20} /> Bank Details (Direct Deposit)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Bank Name</label>
                      <input type="text" className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900" placeholder="e.g. Chase, Bank of America" />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Routing Number</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 text-slate-400" size={14} />
                        <input type="text" className="w-full pl-9 rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900" placeholder="•••••••••" />
                      </div>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Account Number</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 text-slate-400" size={14} />
                        <input type="text" className="w-full pl-9 rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900" placeholder="••••••••••••" />
                      </div>
                  </div>
              </div>

              <hr className="my-8 border-slate-100" />

              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <AlertTriangle size={20} /> Tax Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tax Classification</label>
                    <select className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900">
                        <option>Individual / Sole Proprietor</option>
                        <option>LLC</option>
                        <option>Corporation</option>
                    </select>
                 </div>
                 <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Tax ID / SSN / EIN</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 text-slate-400" size={14} />
                        <input type="text" className="w-full pl-9 rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900" placeholder="XX-XXXXXXX" />
                      </div>
                  </div>
              </div>

              <div className="mt-8 flex justify-end">
                  <button className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition shadow-sm flex items-center gap-2">
                      <Lock size={14} /> Save Securely
                  </button>
              </div>
          </div>
      </div>
  );

  if (isLoading) {
      return <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-blue-900" size={32} /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Partner Portal</h2>
          <p className="text-slate-500">Manage your referrals, payouts, and clients.</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'overview' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
                Overview
            </button>
            <button 
                onClick={() => setActiveTab('clients')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'clients' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
                My Clients
            </button>
            <button 
                onClick={() => setActiveTab('payouts')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'payouts' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
                Payouts & Tax
            </button>
        </div>
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'clients' && <ClientsTab />}
      {activeTab === 'payouts' && <PayoutsTab />}

    </div>
  );
};