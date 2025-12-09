import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Server, Activity, AlertTriangle, CheckCircle, Search, Briefcase, Globe, Loader } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { dbService } from '../../services/dbService';
import { User, UserRole } from '../../types';
import { PLANS, RESELLER_TIERS } from '../../constants';

interface AdminDashboardProps {
  readOnly?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ readOnly = false }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [partners, setPartners] = useState<User[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [stats, setStats] = useState({
      totalMRR: 0,
      totalUsers: 0,
      activeBots: 3850, // Mock for now until we query all bots
      partnerCount: 0
  });

  useEffect(() => {
    const fetchData = async () => {
        try {
            const allUsers = await dbService.getAllUsers();
            
            // Calculate MRR
            const mrr = allUsers.reduce((acc, u) => acc + (PLANS[u.plan]?.price || 0), 0);
            
            // Segregate Partners
            const partnerList = allUsers.filter(u => u.role === UserRole.RESELLER);
            
            setUsers(allUsers);
            setPartners(partnerList);
            
            setStats({
                totalMRR: mrr,
                totalUsers: allUsers.length,
                activeBots: 3850, // Placeholder
                partnerCount: partnerList.length
            });

            // Mock Revenue Data based on MRR for visualization
            setRevenueData([
                { month: 'Jan', amount: mrr * 0.4 },
                { month: 'Feb', amount: mrr * 0.55 },
                { month: 'Mar', amount: mrr * 0.7 },
                { month: 'Apr', amount: mrr * 0.85 },
                { month: 'May', amount: mrr * 0.92 },
                { month: 'Jun', amount: mrr },
            ]);

        } catch (e) {
            console.error("Admin Load Error:", e);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, []);

  const handleApprovePartner = async (id: string) => {
    if (readOnly) return;
    await dbService.approvePartner(id);
    // Optimistic update
    setPartners(prev => prev.map(p => p.id === id ? { ...p, status: 'Active' } : p));
  };

  const handleToggleBusinessStatus = async (id: string, currentStatus: string) => {
    if (readOnly) return;
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    await dbService.updateUserStatus(id, newStatus);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
  };

  if (loading) {
      return <div className="flex items-center justify-center h-96"><Loader className="animate-spin text-blue-900" size={32}/></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {readOnly && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
          <AlertTriangle size={18} className="mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Read-only admin access</p>
            <p className="text-xs">You can review all system data, but account or platform changes are disabled for this user.</p>
          </div>
        </div>
      )}

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
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={20} /></div>
              <span className="text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full">+15%</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">${stats.totalMRR.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-1">Total MRR</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={20} /></div>
              <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-full">+8%</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats.totalUsers}</p>
            <p className="text-sm text-slate-500 mt-1">Total Users</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity size={20} /></div>
              <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-full">+12%</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats.activeBots.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-1">Active Bots</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Briefcase size={20} /></div>
              <span className="text-xs font-medium bg-purple-50 text-purple-600 px-2 py-1 rounded-full">New</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats.partnerCount}</p>
            <p className="text-sm text-slate-500 mt-1">Active Partners</p>
          </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-6">MRR Growth (System Wide)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
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
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">MRR</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{user.companyName}</td>
                    <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.plan === 'ENTERPRISE' ? 'bg-slate-800 text-white' :
                        user.plan === 'EXECUTIVE' ? 'bg-blue-100 text-blue-900' :
                        'bg-slate-100 text-slate-600'
                    }`}>{user.plan}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{user.email}</td>
                    <td className="px-6 py-4 font-mono">${PLANS[user.plan]?.price}</td>
                    <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 ${user.status === 'Active' ? 'text-emerald-600' : 'text-red-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        {user.status || 'Active'}
                    </span>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      {readOnly ? (
                        <span className="text-xs text-slate-400">View only</span>
                      ) : (
                        <button
                          onClick={() => handleToggleBusinessStatus(user.id, user.status || 'Active')}
                          className={`text-xs px-2 py-1 rounded border ${user.status === 'Active' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                        >
                           {user.status === 'Active' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
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
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
                {partners.map((partner) => {
                    const clientCount = partner.resellerClientCount || 0;
                    // Determine Tier
                    const tier = RESELLER_TIERS.find(t => clientCount >= t.min && clientCount <= t.max) || RESELLER_TIERS[0];
                    
                    return (
                    <tr key={partner.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-800">{partner.companyName}</td>
                        <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            tier.label === 'Platinum' ? 'bg-slate-900 text-white' : 
                            tier.label === 'Gold' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-orange-100 text-orange-800'
                        }`}>
                            {tier.label}
                        </span>
                        </td>
                        <td className="px-6 py-4">{clientCount}</td>
                        <td className="px-6 py-4 font-mono text-slate-500">{partner.resellerCode}</td>
                        <td className="px-6 py-4">
                            <span className={`text-xs ${partner.status === 'Active' ? 'text-emerald-600' : 'text-orange-600'}`}>{partner.status || 'Pending'}</span>
                        </td>
                        <td className="px-6 py-4">
                        {(partner.status === 'Pending' || !partner.status) ? (
                            readOnly ? (
                              <span className="text-xs text-slate-400">Pending (view only)</span>
                            ) : (
                              <button
                                onClick={() => handleApprovePartner(partner.id)}
                                className="bg-blue-900 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-950 shadow-sm"
                              >
                                  Approve Application
                              </button>
                            )
                        ) : (
                            <span className="text-xs text-slate-400">Approved</span>
                        )}
                        </td>
                    </tr>
                )})}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};