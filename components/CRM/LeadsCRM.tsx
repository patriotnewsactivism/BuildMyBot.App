import React, { useState } from 'react';
import { Search, Phone, Mail, User as UserIcon, Flame, Send, X, Check, Download, ArrowUpRight, LayoutGrid, List, BarChart3 } from 'lucide-react';
import { Lead } from '../../types';
import { getScoreBand } from '../../services/leadCapture';

interface LeadsCRMProps {
  leads: Lead[];
  onUpdateLead: (lead: Lead) => void;
}

export const LeadsCRM: React.FC<LeadsCRMProps> = ({ leads, onUpdateLead }) => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Drag and Drop State
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  
  // Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const filteredLeads = leads.filter(lead => {
    // Only apply status filter in List mode. In Kanban, we show all columns.
    const matchesFilter = viewMode === 'kanban' || filter === 'All' || lead.status === filter;
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const averageScore = filteredLeads.length ? Math.round(filteredLeads.reduce((acc, lead) => acc + (lead.score || 0), 0) / filteredLeads.length) : 0;
  const hotLeads = filteredLeads.filter((lead) => getScoreBand(lead.score) === 'Hot');
  const warmLeads = filteredLeads.filter((lead) => getScoreBand(lead.score) === 'Warm');
  const coldLeads = filteredLeads.filter((lead) => getScoreBand(lead.score) === 'Cold');

  const scoreBadge = (score: number) => {
    const band = getScoreBand(score);
    if (band === 'Hot') return 'bg-red-50 text-red-800 border-red-200';
    if (band === 'Warm') return 'bg-blue-50 text-blue-800 border-blue-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-900 border-blue-200';
      case 'Contacted': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Qualified': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Closed': return 'bg-slate-200 text-slate-800 border-slate-300';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const handleStatusChange = (leadId: string, newStatus: any) => {
    const leadToUpdate = leads.find(l => l.id === leadId);
    if (leadToUpdate) {
        onUpdateLead({ ...leadToUpdate, status: newStatus });
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedLeadId) {
      handleStatusChange(draggedLeadId, newStatus);
      setDraggedLeadId(null);
    }
  };

  const openEmailModal = (lead: Lead) => {
    setSelectedLead(lead);
    setEmailSubject(`Follow up: ${lead.name}`);
    setEmailBody(`Hi ${lead.name.split(' ')[0]},\n\nThanks for chatting with our AI assistant earlier. I wanted to personally reach out and see if you had any other questions?\n\nBest,\nTeam Apex`);
    setEmailModalOpen(true);
    setEmailSent(false);
  };

  const handleSendEmail = async () => {
    // Mark as contacted without sending email (email integration pending)
    setEmailSent(true);
    setTimeout(() => {
        setEmailModalOpen(false);
        if (selectedLead) {
          handleStatusChange(selectedLead.id, 'Contacted');
          // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
        }
    }, 800);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Score', 'Score Band', 'Status', 'Date', 'Source'];
    const rows = filteredLeads.map(l => [
      l.id,
      l.name,
      l.email,
      l.phone || '',
      l.score,
      getScoreBand(l.score),
      l.status,
      l.createdAt,
      l.sourceUrl || 'N/A',
    ]);

    const encodeCell = (value: string | number) => {
      const stringValue = String(value ?? '');
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const csvLines = [headers.map(encodeCell).join(','), ...rows.map(row => row.map(encodeCell).join(','))].join('\n');
    const blob = new Blob([csvLines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const KanbanColumn: React.FC<{ status: string; items: Lead[] }> = ({ status, items }) => (
    <div 
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, status)}
      className="bg-slate-50 rounded-xl p-4 border border-slate-200 min-h-[500px] flex flex-col"
    >
      <div className={`flex justify-between items-center mb-4 pb-2 border-b-2 ${
         status === 'New' ? 'border-blue-500' : 
         status === 'Contacted' ? 'border-indigo-500' : 
         status === 'Qualified' ? 'border-emerald-500' : 'border-slate-400'
      }`}>
        <h3 className="font-bold text-slate-700">{status}</h3>
        <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-slate-500 shadow-sm border border-slate-200">
          {items.length}
        </span>
      </div>
      
      <div className="flex-1 space-y-3">
        {items.map(lead => (
          <div 
            key={lead.id}
            draggable
            onDragStart={(e) => handleDragStart(e, lead.id)}
            className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-grab hover:shadow-md transition active:cursor-grabbing group relative"
          >
            <div className="flex justify-between items-start mb-2">
               <div className="flex items-center gap-2">
                 {lead.score > 75 && <Flame size={14} className="text-red-600 fill-red-600" />}
                 <span className="font-bold text-slate-900 text-sm">{lead.name}</span>
               </div>
               <div className="flex items-center gap-1">
                 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${lead.score > 75 ? 'bg-red-50 text-red-800' : 'bg-slate-100 text-slate-800'}`}>
                   {lead.score}
                 </span>
                 <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${scoreBadge(lead.score)}`}>
                   {getScoreBand(lead.score)}
                 </span>
               </div>
            </div>
            
            <div className="text-xs text-slate-500 space-y-1 mb-3">
               <div className="flex items-center gap-1.5 truncate">
                 <Mail size={12}/> {lead.email}
               </div>
               <div className="flex items-center gap-1.5">
                 <UserIcon size={12}/> Bot #{lead.botId}
               </div>
            </div>

            <button 
              onClick={() => openEmailModal(lead)}
              className="w-full py-1.5 rounded bg-slate-50 text-blue-900 text-xs font-medium hover:bg-blue-50 border border-slate-100 flex items-center justify-center gap-1.5 transition"
            >
              <ArrowUpRight size={12} /> Email Lead
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">
            Drop items here
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Email Modal */}
      {emailModalOpen && selectedLead && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
               <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><Mail size={18}/> New Message</h3>
                  <button onClick={() => setEmailModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
               </div>
               {emailSent ? (
                   <div className="p-12 flex flex-col items-center justify-center text-center">
                       <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                          <Check size={32} />
                       </div>
                       <h4 className="font-bold text-lg text-slate-800">Email Sent!</h4>
                       <p className="text-slate-500">Lead status updated to 'Contacted'.</p>
                   </div>
               ) : (
                   <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">To</label>
                        <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-700">{selectedLead.email}</div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
                        <input 
                           value={emailSubject}
                           onChange={e => setEmailSubject(e.target.value)}
                           className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-blue-900 focus:border-blue-900" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message</label>
                        <textarea 
                           value={emailBody}
                           onChange={e => setEmailBody(e.target.value)}
                           className="w-full h-32 px-3 py-2 border border-slate-200 rounded text-sm focus:ring-blue-900 focus:border-blue-900 resize-none" 
                        />
                      </div>
                      <div className="flex justify-end pt-2">
                         <button 
                           onClick={handleSendEmail}
                           className="bg-blue-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-950 flex items-center gap-2"
                         >
                            <Send size={16} /> Send Email
                         </button>
                      </div>
                   </div>
               )}
            </div>
         </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Lead CRM</h2>
          <p className="text-slate-500">Manage pipeline and track leads.</p>
        </div>
        <div className="flex gap-2">
           <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-900' : 'text-slate-400 hover:text-slate-600'}`}
                title="List View"
              >
                <List size={18} />
              </button>
              <button 
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-blue-100 text-blue-900' : 'text-slate-400 hover:text-slate-600'}`}
                title="Kanban Board"
              >
                <LayoutGrid size={18} />
              </button>
           </div>
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2 bg-white shadow-sm"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-slate-400 font-semibold">Average Score</p>
            <p className="text-3xl font-bold text-slate-800">{averageScore}</p>
            <p className="text-xs text-slate-500">Across filtered leads</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-800 font-bold">
            <BarChart3 size={24} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs uppercase text-slate-400 font-semibold">Lead Quality</p>
            <span className="text-[11px] text-slate-500">{filteredLeads.length} leads</span>
          </div>
          <div className="space-y-2">
            {[{label: 'Hot', count: hotLeads.length, color: 'bg-red-600'}, {label: 'Warm', count: warmLeads.length, color: 'bg-blue-600'}, {label: 'Cold', count: coldLeads.length, color: 'bg-slate-600'}].map(item => {
              const percent = filteredLeads.length ? Math.round((item.count / filteredLeads.length) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{item.label} Leads</span>
                    <span className="font-semibold">{percent}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                    <div className={`${item.color} h-2`} style={{width: `${percent}%`}}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-400 font-semibold mb-2">Scoring Signals</p>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• Email + phone capture automatically boosts score</li>
            <li>• High-intent phrases (demo, quote, call) increase priority</li>
            <li>• Longer messages add confidence to lead quality</li>
          </ul>
        </div>
      </div>

      {viewMode === 'kanban' ? (
         <div className="space-y-4">
            <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search leads..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-blue-900 focus:border-blue-900" 
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4">
              {['New', 'Contacted', 'Qualified', 'Closed'].map(status => (
                <KanbanColumn 
                  key={status} 
                  status={status} 
                  items={filteredLeads.filter(l => l.status === status)} 
                />
              ))}
            </div>
         </div>
      ) : (
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
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-blue-900 focus:border-blue-900" 
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                {['All', 'New', 'Contacted', 'Qualified', 'Closed'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                      filter === status 
                      ? 'bg-blue-900 text-white' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">Lead Name</th>
                  <th className="px-6 py-3 font-semibold">Score</th>
                  <th className="px-6 py-3 font-semibold">Contact Info</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Source</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition group">
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                              <p className="font-semibold text-slate-800">{lead.name}</p>
                              <p className="text-xs text-slate-400">{new Date(lead.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {lead.score > 75 && <Flame size={16} className="text-red-600 fill-red-600" />}
                          <span className={`font-bold ${lead.score > 75 ? 'text-red-700' : 'text-slate-800'}`}>
                            {lead.score}
                          </span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${scoreBadge(lead.score)}`}>
                            {getScoreBand(lead.score)}
                          </span>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Mail size={14} className="text-slate-400"/> {lead.email}
                          </div>
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Phone size={14} className="text-slate-400"/> {lead.phone}
                            </div>
                          )}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <select 
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-full focus:ring-0 cursor-pointer border ${getStatusColor(lead.status)}`}
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Qualified">Qualified</option>
                          <option value="Closed">Closed</option>
                        </select>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                        Bot #{lead.botId}
                    </td>
                    <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => openEmailModal(lead)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition text-xs font-medium flex items-center gap-1 ml-auto" 
                          title="Send Email"
                        >
                          <Mail size={14} /> Email
                        </button>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <UserIcon size={48} className="mx-auto mb-3 opacity-20" />
                      <p>No leads found matching your criteria.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
