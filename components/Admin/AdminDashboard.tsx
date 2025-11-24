import React from 'react';
import { Users, DollarSign, Server, Activity, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const GLOBAL_STATS = [
  { label: 'Total MRR', value: '$42,590', change: '+15%', icon: DollarSign, color: 'emerald' },
  { label: 'Total Users', value: '1,240', change: '+8%', icon: Users, color: 'blue' },
  { label: 'Active Bots', value: '3,850', change: '+12%', icon: Activity, color: 'blue' },
  { label: 'System Load', value: '24%', change: 'Stable', icon: Server, color: 'slate' },
];

const REVENUE_DATA = [
  { month: 'Jan', amount: 12000 },
  { month: 'Feb', amount: 18000 },
  { month: 'Mar', amount: 22000 },
  { month: 'Apr', amount: 35000 },
  { month: 'May', amount: 38000 },
  { month: 'Jun', amount: 42590 },
];

const RECENT_USERS = [
  { id: 1, name: 'TechFlow Agency', plan: 'Enterprise', status: 'Active', joined: '2 hrs ago' },
  { id: 2, name: 'Dr. Smith Dental', plan: 'Starter', status: 'Active', joined: '5 hrs ago' },
  { id: 3, name: 'Pizza Palace', plan: 'Free', status: 'Inactive', joined: '1 day ago' },
  { id: 4, name: 'Legal Eagles', plan: 'Professional', status: 'Active', joined: '1 day ago' },
  { id: 5, name: 'Startup Inc', plan: 'Executive', status: 'Active', joined: '2 days ago' },
];

export const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Super Admin</h2>
          <p className="text-slate-500">Platform-wide overview and management.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
            <Server size={16} /> System Logs
          </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-6">MRR Growth</h3>
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

        {/* System Health */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">System Health</h3>
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
                  <p className="font-medium text-slate-800 text-sm">Database (Postgres)</p>
                  <p className="text-xs text-emerald-600">Operational</p>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-700">12ms</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-yellow-600" size={20} />
                <div>
                  <p className="font-medium text-slate-800 text-sm">Email Worker</p>
                  <p className="text-xs text-yellow-600">High Latency</p>
                </div>
              </div>
              <span className="text-xs font-mono text-yellow-700">2.4s</span>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-100">
             <h4 className="text-sm font-semibold text-slate-700 mb-3">Pending Approvals</h4>
             <div className="flex justify-between items-center text-sm text-slate-600 mb-2">
                <span>Reseller Payouts</span>
                <span className="font-medium text-slate-900">4 pending ($1,250)</span>
             </div>
             <button className="w-full py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">
               Manage Approvals
             </button>
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Recent Signups</h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input type="text" placeholder="Search users..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-blue-900 focus:border-blue-900" />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3">Company</th>
              <th className="px-6 py-3">Plan</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Joined</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {RECENT_USERS.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">{user.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user.plan === 'Enterprise' ? 'bg-slate-200 text-slate-800' :
                    user.plan === 'Executive' ? 'bg-blue-100 text-blue-900' :
                    'bg-slate-100 text-slate-600'
                  }`}>{user.plan}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`flex items-center gap-1.5 text-sm ${user.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{user.joined}</td>
                <td className="px-6 py-4 text-sm text-blue-900 hover:text-blue-950 cursor-pointer font-medium">
                  Login as
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};