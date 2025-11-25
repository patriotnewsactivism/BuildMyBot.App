import React, { useState } from 'react';
import { Users, DollarSign, Server, Activity, AlertTriangle, CheckCircle, Search, Briefcase, Eye, Globe, Ban, MoreHorizontal } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const GLOBAL_STATS = [
  { label: 'Total MRR', value: '$42,590', change: '+15%', icon: DollarSign, color: 'emerald' },
  { label: 'Total Users', value: '1,240', change: '+8%', icon: Users, color: 'blue' },
  { label: 'Active Bots', value: '3,850', change: '+12%', icon: Activity, color: 'blue' },
  { label: 'Partners', value: '142', change: '+5', icon: Briefcase, color: 'purple' },
];

const REVENUE_DATA = [
  { month: 'Jan', amount: 12000 },
  { month: 'Feb', amount: 18000 },
  { month: 'Mar', amount: 22000 },
  { month: 'Apr', amount: 35000 },
  { month: 'May', amount: 38000 },
  { month: 'Jun', amount: 42590 },
];

const INITIAL_BUSINESSES = [
  { id: 1, name: 'TechFlow Agency', plan: 'Enterprise', status: 'Active', joined: '2 hrs ago', bots: 12, revenue: '$399' },
  { id: 2, name: 'Dr. Smith Dental', plan: 'Starter', status: 'Active', joined: '5 hrs ago', bots: 1, revenue: '$29' },
  { id: 3, name: 'Pizza Palace', plan: 'Free', status: 'Inactive', joined: '1 day ago', bots: 1, revenue: '$0' },
  { id: 4, name: 'Legal Eagles', plan: 'Professional', status: 'Active', joined: '1 day ago', bots: 3, revenue: '$99' },
  { id: 5, name: 'Startup Inc', plan: 'Executive', status: 'Active', joined: '2 days ago', bots: 8, revenue: '$199' },
];

const INITIAL_PARTNERS = [
  { id: 101, name: 'Digital Growth', tier: 'Platinum', clients: 312, earnings: '$12,400', status: 'Active' },
  { id: 102, name: 'Marketer Mike', tier: 'Gold', clients: 156, earnings: '$4,200', status: 'Active' },
  { id: 103, name: 'Local SEO Pros', tier: 'Silver', clients: 89, earnings: '$1,800', status: 'Active' },
  { id: 104, name: 'Jane Doe', tier: 'Bronze', clients: 0, earnings: '$0', status: 'Pending Approval' },
];

export const AdminDashboard: React.FC = () => {
  const [businesses, setBusinesses] = useState(INITIAL_BUSINESSES);
  const [partners, setPartners] = useState(INITIAL_PARTNERS);

  const handleApprovePartner = (id: number) => {
    setPartners(partners.map(p => p.id === id ? { ...p, status: 'Active' } : p));
  };

  const handleToggleBusinessStatus = (id: number) => {
    setBusinesses(businesses.map(b => b.id === id ? { ...b, status: b.status === 'Active' ? 'Suspended' : 'Active' } : b));
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="bg-slate-900 text-white p-6 -mx-4 -mt-4 md:-mx-8 md:-mt-8 md:rounded-b-2xl mb-8 shadow-lg">
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold flex items-center gap-2">
                    <Globe className="text-blue-400"/> Master Platform Access
                </h2>
                <p className="text-slate-400">System-wide visibility and control.</p>
            </div>
            <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow-lg shadow-blue-900/20">
                    <Server size={16} /> Live System Status
                </button>
            </div>
          </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {GLOBAL_STATS.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg`}>
                <stat.icon size={20} />
              </div>
              <span className="text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full">
                {stat.change}
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-6">MRR Growth (System Wide)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Operational Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-emerald-600" size={20} />
                <div>
                  <p className="font-medium text-slate-800 text-sm">API Gateway</p>
                  <p className="text-xs text-emerald-600">Operational</p>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-700">45ms</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-emerald-600" size={20} />
                <div>
                  <p className="font-medium text-slate-800 text-sm">Database</p>
                  <p className="text-xs text-emerald-600">Operational</p>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-700">12ms</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-yellow-600" size={20} />
                <div>
                  <p className="font-medium text-slate-800 text-sm">Email Queues</p>
                  <p className="text-xs text-yellow-600">High Latency</p>
                </div>
              </div>
              <span className="text-xs font-mono text-yellow-700">2.4s</span>
            </div>
          </div>
        </div>
      </div>

      {/* All Businesses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
              <h3 className="font-bold text-slate-800">All Businesses</h3>
              <p className="text-xs text-slate-500">Master list of all client accounts.</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input type="text" placeholder="Search businesses..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-blue-900 focus:border-blue-900" />
          </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                <th className="px-6 py-3">Company</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Bots</th>
                <th className="px-6 py-3">MRR</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
                {businesses.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{user.name}</td>
                    <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.plan === 'Enterprise' ? 'bg-slate-800 text-white' :
                        user.plan === 'Executive' ? 'bg-blue-100 text-blue-900' :
                        'bg-slate-100 text-slate-600'
                    }`}>{user.plan}</span>
                    </td>
                    <td className="px-6 py-4">{user.bots}</td>
                    <td className="px-6 py-4 font-mono">{user.revenue}</td>
                    <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 ${user.status === 'Active' ? 'text-emerald-600' : 'text-red-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        {user.status}
                    </span>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <button 
                        onClick={() => handleToggleBusinessStatus(user.id)}
                        className={`text-xs px-2 py-1 rounded border ${user.status === 'Active' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                      >
                         {user.status === 'Active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>

      {/* All Partners Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
              <h3 className="font-bold text-slate-800">All Partners & Resellers</h3>
              <p className="text-xs text-slate-500">Master list of all affiliate partners.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                <th className="px-6 py-3">Partner Name</th>
                <th className="px-6 py-3">Tier</th>
                <th className="px-6 py-3">Clients Referred</th>
                <th className="px-6 py-3">Total Earnings</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
                {partners.map((partner) => (
                <tr key={partner.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{partner.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          partner.tier === 'Platinum' ? 'bg-slate-900 text-white' : 
                          partner.tier === 'Gold' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-orange-100 text-orange-800'
                      }`}>
                          {partner.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4">{partner.clients}</td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600">{partner.earnings}</td>
                    <td className="px-6 py-4">
                        <span className={`text-xs ${partner.status === 'Active' ? 'text-emerald-600' : 'text-orange-600'}`}>{partner.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      {partner.status === 'Pending Approval' ? (
                         <button 
                           onClick={() => handleApprovePartner(partner.id)}
                           className="bg-blue-900 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-950 shadow-sm"
                         >
                            Approve Application
                         </button>
                      ) : (
                        <span className="text-xs text-slate-400">Approved</span>
                      )}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};