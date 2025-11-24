import React, { useState } from 'react';
import { Search, Filter, Phone, Mail, MoreHorizontal, User as UserIcon, Flame } from 'lucide-react';
import { Lead } from '../../types';

export const LeadsCRM: React.FC = () => {
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock Leads
  const [leads, setLeads] = useState<Lead[]>([
    { id: '1', name: 'Sarah Connor', email: 'sarah@skynet.com', phone: '+1 555-0123', score: 95, status: 'New', sourceBotId: 'b1', createdAt: '2024-05-15T10:00:00Z' },
    { id: '2', name: 'John Doe', email: 'john.doe@example.com', phone: '+1 555-0199', score: 45, status: 'Contacted', sourceBotId: 'b2', createdAt: '2024-05-14T08:30:00Z' },
    { id: '3', name: 'Emily Blunt', email: 'emily@hollywood.com', phone: '', score: 82, status: 'Qualified', sourceBotId: 'b1', createdAt: '2024-05-12T14:20:00Z' },
    { id: '4', name: 'Michael Scott', email: 'michael@dunder.com', phone: '+1 555-9999', score: 10, status: 'Closed', sourceBotId: 'b1', createdAt: '2024-05-10T09:00:00Z' },
    { id: '5', name: 'Dwight Schrute', email: 'beetfarmer@farms.com', phone: '+1 555-2342', score: 65, status: 'New', sourceBotId: 'b2', createdAt: '2024-05-16T11:45:00Z' },
  ]);

  const filteredLeads = leads.filter(lead => {
    const matchesFilter = filter === 'All' || lead.status === filter;
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-900';
      case 'Contacted': return 'bg-yellow-100 text-yellow-700';
      case 'Qualified': return 'bg-emerald-100 text-emerald-700';
      case 'Closed': return 'bg-slate-200 text-slate-600';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Lead CRM</h2>
          <p className="text-slate-500">Manage and track leads captured by your bots.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium">Export CSV</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
           <div className="relative w-full md:w-96">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
             <input 
               type="text" 
               placeholder="Search leads..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 text-sm"
             />
           </div>
           <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
             {['All', 'New', 'Contacted', 'Qualified', 'Closed'].map(status => (
               <button 
                 key={status}
                 onClick={() => setFilter(status)}
                 className={`px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                   filter === status ? 'bg-blue-900 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                 }`}
               >
                 {status}
               </button>
             ))}
           </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <th className="px-6 py-4">Lead Name</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Captured</th>
                <th className="px-6 py-4">Qualification Score</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => {
                const isHot = lead.score >= 75;
                return (
                <tr key={lead.id} className={`hover:bg-slate-50/50 transition group ${isHot ? 'bg-red-50/10' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isHot ? 'bg-red-100 text-red-700 ring-2 ring-red-200' : 'bg-blue-100 text-blue-900'}`}>
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-medium text-slate-800 text-sm block">{lead.name}</span>
                        {isHot && <span className="text-[10px] text-red-600 font-bold flex items-center gap-0.5"><Flame size={10} fill="currentColor"/> HOT LEAD</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Mail size={12} /> {lead.email}
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Phone size={12} /> {lead.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                       <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                         <div className={`h-full rounded-full ${lead.score >= 75 ? 'bg-red-500' : lead.score > 40 ? 'bg-yellow-500' : 'bg-slate-500'}`} style={{width: `${lead.score}%`}}></div>
                       </div>
                       <span className={`text-xs font-bold ${lead.score >= 75 ? 'text-red-600' : 'text-slate-600'}`}>{lead.score}</span>
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition">
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              )})}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <UserIcon size={32} className="mx-auto mb-2 opacity-20" />
                    <p>No leads found matching your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};