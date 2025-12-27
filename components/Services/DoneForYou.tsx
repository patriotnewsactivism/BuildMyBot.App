import React, { useState } from 'react';
import { Briefcase, Clock, CheckCircle, AlertCircle, FileText, MessageSquare, Bot, Download, Plus, ExternalLink, ChevronRight } from 'lucide-react';
import { User, ServiceRequest, ServiceRequestStatus, ServiceDeliverable } from '../../types';
import { SERVICE_TIERS } from '../../constants';
import { ServiceTracker } from './ServiceTracker';

interface DoneForYouProps {
  user?: User;
  serviceRequests?: ServiceRequest[];
  onNewRequest?: () => void;
}

const STATUS_CONFIG: Record<ServiceRequestStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Bot },
  review: { label: 'Ready for Review', color: 'bg-purple-100 text-purple-700', icon: FileText },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-700', icon: AlertCircle },
};

// Mock data for demonstration
const MOCK_REQUESTS: ServiceRequest[] = [
  {
    id: 'sr-001',
    userId: 'user-1',
    tier: 'professional',
    status: 'in_progress',
    businessType: 'Professional Services',
    botPurpose: ['Customer Support', 'Lead Generation'],
    desiredFeatures: ['Lead capture & qualification', 'CRM integration', 'Email notifications'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: 'BuildMyBot Expert Team',
    deliverables: [
      { id: 'd1', name: 'Custom AI Chatbot', type: 'bot', status: 'completed' },
      { id: 'd2', name: 'Knowledge Base Setup', type: 'knowledge_base', status: 'in_progress' },
      { id: 'd3', name: 'CRM Integration', type: 'integration', status: 'pending' },
    ],
  },
];

const RequestCard: React.FC<{
  request: ServiceRequest;
  onView: () => void;
}> = ({ request, onView }) => {
  const tier = SERVICE_TIERS.find(t => t.id === request.tier);
  const status = STATUS_CONFIG[request.status];
  const StatusIcon = status.icon;

  const completedDeliverables = request.deliverables?.filter(d => d.status === 'completed').length || 0;
  const totalDeliverables = request.deliverables?.length || 0;
  const progressPercent = totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900">{tier?.name} Package</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
              <StatusIcon size={12} />
              {status.label}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Started {new Date(request.createdAt).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={onView}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
        >
          View Details <ChevronRight size={16} />
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-slate-600">Progress</span>
          <span className="font-medium text-slate-900">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {request.botPurpose.slice(0, 3).map((purpose, i) => (
          <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg">
            {purpose}
          </span>
        ))}
        {request.botPurpose.length > 3 && (
          <span className="px-2 py-1 bg-slate-100 text-slate-400 text-xs rounded-lg">
            +{request.botPurpose.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
};

export const DoneForYou: React.FC<DoneForYouProps> = ({
  user,
  serviceRequests = MOCK_REQUESTS,
  onNewRequest,
}) => {
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  const activeRequests = serviceRequests.filter(r => r.status !== 'completed' && r.status !== 'cancelled');
  const completedRequests = serviceRequests.filter(r => r.status === 'completed');

  if (selectedRequest) {
    return (
      <ServiceTracker
        request={selectedRequest}
        onBack={() => setSelectedRequest(null)}
      />
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Briefcase size={24} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Done-For-You Projects</h2>
            <p className="text-sm text-slate-500">Track your BuildMyBot 4Me service requests</p>
          </div>
        </div>
        <button
          onClick={onNewRequest}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          New Request
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">Active Projects</p>
          <p className="text-2xl font-bold text-slate-900">{activeRequests.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-600">{completedRequests.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">Total Invested</p>
          <p className="text-2xl font-bold text-slate-900">
            ${serviceRequests.reduce((sum, r) => {
              const tier = SERVICE_TIERS.find(t => t.id === r.tier);
              return sum + (tier?.price || 0);
            }, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Active Projects */}
      {activeRequests.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-900 mb-3">Active Projects</h3>
          <div className="space-y-3">
            {activeRequests.map(request => (
              <RequestCard
                key={request.id}
                request={request}
                onView={() => setSelectedRequest(request)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Projects */}
      {completedRequests.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-900 mb-3">Completed Projects</h3>
          <div className="space-y-3">
            {completedRequests.map(request => (
              <RequestCard
                key={request.id}
                request={request}
                onView={() => setSelectedRequest(request)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {serviceRequests.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Briefcase size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Projects Yet</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Let our experts build your perfect AI chatbot. Choose a package and we&apos;ll handle everything.
          </p>
          <button
            onClick={onNewRequest}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Start Your First Project
          </button>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <MessageSquare size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-lg mb-2">Need Help?</h4>
            <p className="text-slate-300 text-sm mb-4">
              Our team is here to answer any questions about your project or our services.
            </p>
            <a
              href="mailto:support@buildmybot.app"
              className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1"
            >
              Contact Support <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoneForYou;
