import React, { useState } from 'react';
import { Search, Filter, Phone, Mail, MoreHorizontal, User as UserIcon, Flame, Send, X, Check, Download, ArrowUpRight } from 'lucide-react';
import { Lead } from '../../types';

interface LeadsCRMProps {
  leads: Lead[];
  onUpdateLead: (lead: Lead) => void;
}

export const LeadsCRM: React.FC<LeadsCRMProps> = ({ leads, onUpdateLead }) => {
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSent, setEmailSent] = useState(false);

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

  const handleStatusChange = (leadId: string, newStatus: any) => {
    const leadToUpdate = leads.find(l => l.id === leadId);
    if (leadToUpdate) {
        onUpdateLead({ ...leadToUpdate, status: newStatus });
    }
  };

  const openEmailModal = (lead: Lead) => {
    setSelectedLead(lead);
    setEmailSubject(`Follow up: ${lead.name}`);
    setEmailBody(`Hi ${lead.name.split(' ')[0]},\n\nThanks for chatting with our AI assistant earlier. I wanted to personally reach out and see if you had any other questions?\n\nBest,\nTeam Apex`);
    setEmailModalOpen(true);
    setEmailSent(false);
  };

  const handleSendEmail = () => {
    // Mock send
    setEmailSent(true);
    setTimeout(() => {
        setEmailModalOpen(false);
        if (selectedLead) handleStatusChange(selectedLead.id, 'Contacted');
    }, 1500);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Score', 'Status', 'Date'];
    const rows = leads.map(l => [l.id, l.name, l.email, l.phone || '', l.score, l.status, l.createdAt]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Lead CRM</h2>
          <p className="text-slate-500">Manage and track leads captured by your bots.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"
          >
            <Download size={16} /> Export CSV
          </button>
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
                 <tr key={lead.id} className="hover:bg-slate-50/80 transition">
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
                        {lead.score > 75 && <Flame size={16} className="text-orange-500 fill-orange-500" />}
                        <span className={`font-bold ${lead.score > 75 ? 'text-orange-600' : 'text-slate-600'}`}>
                          {lead.score}
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
                        className={`text-xs font-semibold px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${getStatusColor(lead.status)}`}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Closed">Closed</option>
                      </select>
                   </td>
                   <td className="px-6 py-4 text-slate-500">
                      Bot #{lead.sourceBotId}
                   </td>
                   <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openEmailModal(lead)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" 
                        title="Send Email"
                      >
                         <ArrowUpRight size={18} />
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
    </div>
  );
};