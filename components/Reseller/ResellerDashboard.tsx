import React from 'react';
import { DollarSign, Users, TrendingUp, Copy, CheckCircle } from 'lucide-react';
import { ResellerStats, User } from '../../types';
import { RESELLER_TIERS } from '../../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ResellerProps {
  user: User;
  stats: ResellerStats;
}

const mockEarnings = [
  { month: 'Jan', amount: 1200 },
  { month: 'Feb', amount: 1900 },
  { month: 'Mar', amount: 2400 },
  { month: 'Apr', amount: 3100 },
  { month: 'May', amount: 4500 },
  { month: 'Jun', amount: 5200 },
];

export const ResellerDashboard: React.FC<ResellerProps> = ({ user, stats }) => {
  const currentTier = RESELLER_TIERS.find(t => stats.totalClients >= t.min && stats.totalClients <= t.max) || RESELLER_TIERS[0];
  const nextTier = RESELLER_TIERS.find(t => t.min > stats.totalClients);
  const progress = nextTier 
    ? ((stats.totalClients - currentTier.min) / (nextTier.min - currentTier.min)) * 100 
    : 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Partner Portal</h2>
          <p className="text-slate-500">Manage your referrals, payouts, and clients.</p>
        </div>
        <button className="bg-blue-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-950 shadow-md shadow-blue-200 transition">
          Request Payout
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign size={20} />
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">Monthly</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">${stats.totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-slate-500 mt-1">Total Generated Revenue</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.totalClients}</p>
          <p className="text-sm text-slate-500 mt-1">Active Referrals</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-semibold bg-cyan-100 text-cyan-700 px-2 py-1 rounded">{(stats.commissionRate * 100)}% Split</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">${(stats.totalRevenue * stats.commissionRate).toLocaleString()}</p>
          <p className="text-sm text-slate-500 mt-1">Your Est. Commission</p>
        </div>

        <div className="bg-gradient-to-br from-blue-900 to-slate-900 p-6 rounded-xl shadow-lg text-white">
           <p className="text-blue-200 text-sm font-medium mb-1">Referral Link</p>
           <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg border border-white/20 mb-3">
             <code className="text-xs truncate flex-1">buildmybot.app/r/{user.resellerCode || 'user123'}</code>
             <Copy size={14} className="cursor-pointer hover:text-blue-300" />
           </div>
           <p className="text-xs text-blue-200">Share this link to track signups automatically.</p>
        </div>
      </div>

      {/* Tier Progress */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
         <div className="flex justify-between mb-2">
           <h3 className="font-semibold text-slate-800">Current Tier: <span className="text-blue-900">{currentTier.label}</span></h3>
           <span className="text-sm text-slate-500">{stats.totalClients} / {nextTier ? nextTier.min : 'Max'} Clients</span>
         </div>
         <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-2">
            <div className="bg-blue-900 h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
         </div>
         <p className="text-sm text-slate-500">
           {nextTier 
             ? `Recruit ${nextTier.min - stats.totalClients} more clients to unlock ${nextTier.commission * 100}% commission!` 
             : "You've reached the top tier!"}
         </p>
      </div>

      {/* Earnings Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
        <h3 className="font-semibold text-slate-800 mb-6">Revenue Growth</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mockEarnings}>
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(value) => `$${value}`} />
            <Tooltip 
              cursor={{fill: '#f1f5f9'}}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="amount" fill="#1e3a8a" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};