'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';
import { Lead } from '@/types';
import { Mail, Phone, Star, Filter } from 'lucide-react';

export default function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  useEffect(() => {
    if (user) {
      loadLeads();
    }
  }, [user, filterStatus]);

  const loadLeads = async () => {
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('owner_id', user!.id)
        .order('score', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLeads(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading leads:', error);
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: Lead['status']) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;
      loadLeads();
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'Hot';
    if (score >= 40) return 'Warm';
    return 'Cold';
  };

  if (loading) {
    return <div>Loading leads...</div>;
  }

  const statuses: Lead['status'][] = ['New', 'Contacted', 'Qualified', 'Closed'];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">CRM - Leads</h1>

        <div className="flex gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {viewMode === 'list' ? 'Kanban View' : 'List View'}
          </button>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Leads</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {viewMode === 'list' ? (
        /* List View */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {lead.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="w-3 h-3" />
                          {lead.email}
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(lead.score)}`}>
                      <Star className="w-3 h-3" />
                      {lead.score} - {getScoreLabel(lead.score)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead.id, e.target.value as Lead['status'])}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-blue-600 hover:text-blue-800">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {leads.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No leads found. Start collecting leads with your bots!</p>
            </div>
          )}
        </div>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statuses.map((status) => {
            const statusLeads = leads.filter((lead) => lead.status === status);
            return (
              <div key={status} className="bg-gray-100 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {status} ({statusLeads.length})
                </h3>
                <div className="space-y-3">
                  {statusLeads.map((lead) => (
                    <div key={lead.id} className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="font-medium text-gray-900 mb-2">{lead.name}</div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getScoreColor(lead.score)}`}>
                          {lead.score}
                        </span>
                      </div>
                      {lead.email && (
                        <div className="text-xs text-gray-600 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {lead.email}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
