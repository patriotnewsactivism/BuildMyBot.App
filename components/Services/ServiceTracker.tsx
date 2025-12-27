import React from 'react';
import { ArrowLeft, Clock, CheckCircle, Circle, Bot, Database, Plug, GraduationCap, FileText, Download, MessageSquare, Calendar, User, Package } from 'lucide-react';
import { ServiceRequest, ServiceDeliverable, ServiceRequestStatus } from '../../types';
import { SERVICE_TIERS } from '../../constants';

interface ServiceTrackerProps {
  request: ServiceRequest;
  onBack: () => void;
}

const DELIVERABLE_ICONS: Record<ServiceDeliverable['type'], React.ElementType> = {
  bot: Bot,
  knowledge_base: Database,
  integration: Plug,
  training: GraduationCap,
  documentation: FileText,
};

const STATUS_STEPS: { status: ServiceRequestStatus; label: string }[] = [
  { status: 'pending', label: 'Request Received' },
  { status: 'in_progress', label: 'Building Your Bot' },
  { status: 'review', label: 'Ready for Review' },
  { status: 'completed', label: 'Delivered' },
];

const getStatusIndex = (status: ServiceRequestStatus): number => {
  const index = STATUS_STEPS.findIndex(s => s.status === status);
  return index >= 0 ? index : 0;
};

export const ServiceTracker: React.FC<ServiceTrackerProps> = ({ request, onBack }) => {
  const tier = SERVICE_TIERS.find(t => t.id === request.tier);
  const currentStatusIndex = getStatusIndex(request.status);

  const estimatedDelivery = new Date(request.createdAt);
  estimatedDelivery.setDate(estimatedDelivery.getDate() + (tier?.deliveryDays || 7));

  const completedDeliverables = request.deliverables?.filter(d => d.status === 'completed').length || 0;
  const totalDeliverables = request.deliverables?.length || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Project Details</h1>
          <p className="text-sm text-slate-500">Request ID: {request.id}</p>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-6">Project Status</h2>

        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-slate-200 z-0">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${(currentStatusIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
            />
          </div>

          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index <= currentStatusIndex;
            const isCurrent = index === currentStatusIndex;

            return (
              <div key={step.status} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-400'
                  } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}
                >
                  {isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
                </div>
                <span
                  className={`text-xs mt-2 font-medium text-center max-w-[80px] ${
                    isCompleted ? 'text-blue-600' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project Info Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package size={20} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Package Details</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Package:</span>
              <span className="font-medium text-slate-900">{tier?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Price:</span>
              <span className="font-medium text-slate-900">${tier?.price}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Business Type:</span>
              <span className="font-medium text-slate-900">{request.businessType}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar size={20} className="text-green-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Timeline</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Started:</span>
              <span className="font-medium text-slate-900">
                {new Date(request.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Est. Delivery:</span>
              <span className="font-medium text-slate-900">
                {estimatedDelivery.toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Assigned To:</span>
              <span className="font-medium text-slate-900">
                {request.assignedTo || 'Pending Assignment'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Deliverables */}
      {request.deliverables && request.deliverables.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Deliverables</h3>
            <span className="text-sm text-slate-500">
              {completedDeliverables} of {totalDeliverables} complete
            </span>
          </div>

          <div className="space-y-3">
            {request.deliverables.map((deliverable) => {
              const Icon = DELIVERABLE_ICONS[deliverable.type];
              const isCompleted = deliverable.status === 'completed';
              const isInProgress = deliverable.status === 'in_progress';

              return (
                <div
                  key={deliverable.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                    isCompleted
                      ? 'bg-green-50 border-green-200'
                      : isInProgress
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isCompleted
                          ? 'bg-green-100'
                          : isInProgress
                          ? 'bg-blue-100'
                          : 'bg-slate-200'
                      }`}
                    >
                      <Icon
                        size={18}
                        className={
                          isCompleted
                            ? 'text-green-600'
                            : isInProgress
                            ? 'text-blue-600'
                            : 'text-slate-400'
                        }
                      />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{deliverable.name}</p>
                      {deliverable.notes && (
                        <p className="text-xs text-slate-500">{deliverable.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        isCompleted
                          ? 'bg-green-100 text-green-700'
                          : isInProgress
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isCompleted ? 'Complete' : isInProgress ? 'In Progress' : 'Pending'}
                    </span>
                    {deliverable.url && (
                      <a
                        href={deliverable.url}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download size={16} className="text-slate-600" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bot Purposes */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Bot Purposes</h3>
        <div className="flex flex-wrap gap-2">
          {request.botPurpose.map((purpose, i) => (
            <span
              key={i}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg"
            >
              {purpose}
            </span>
          ))}
        </div>
      </div>

      {/* Requested Features */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Requested Features</h3>
        <div className="grid md:grid-cols-2 gap-2">
          {request.desiredFeatures.map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
              <CheckCircle size={16} className="text-green-500" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Notes */}
      {request.additionalNotes && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Additional Notes</h3>
          <p className="text-sm text-slate-600">{request.additionalNotes}</p>
        </div>
      )}

      {/* Contact Support */}
      <div className="bg-slate-100 rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare size={20} className="text-slate-600" />
          <span className="text-sm text-slate-700">
            Have questions about your project?
          </span>
        </div>
        <a
          href="mailto:support@buildmybot.app"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
};

export default ServiceTracker;
