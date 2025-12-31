import React, { useState } from 'react';
import { Zap, Workflow, Globe, Link2, ExternalLink, ChevronRight, CheckCircle } from 'lucide-react';

interface IntegrationGuide {
  id: string;
  name: string;
  logo: string;
  description: string;
  steps: string[];
  webhookSupport: boolean;
  documentationUrl: string;
}

const INTEGRATIONS: IntegrationGuide[] = [
  {
    id: 'zapier',
    name: 'Zapier',
    logo: 'https://cdn.zapier.com/zapier/images/favicon.ico',
    description: 'Connect BuildMyBot to 5,000+ apps with Zapier. Trigger workflows when leads are captured or conversations end.',
    steps: [
      'Create a new Zap in Zapier',
      'Search for "Webhooks by Zapier" as the trigger',
      'Select "Catch Hook" as the trigger event',
      'Copy the webhook URL provided by Zapier',
      'In BuildMyBot, go to Settings > Webhooks',
      'Add the Zapier webhook URL for "lead.created" events',
      'Test the connection by capturing a test lead',
      'Continue setting up your Zap actions (e.g., add to CRM, send email)',
    ],
    webhookSupport: true,
    documentationUrl: 'https://zapier.com/apps/webhook',
  },
  {
    id: 'pabbly',
    name: 'Pabbly Connect',
    logo: 'https://www.pabbly.com/favicon.ico',
    description: 'Cost-effective automation with Pabbly Connect. One-time payment for unlimited workflows.',
    steps: [
      'Create a new workflow in Pabbly Connect',
      'Add "Webhook" as the trigger',
      'Copy the webhook URL from Pabbly',
      'In BuildMyBot Settings > Webhooks, add the URL',
      'Select which events to send (leads, conversations)',
      'Map the incoming data fields in Pabbly',
      'Add your desired actions (Google Sheets, Email, CRM)',
    ],
    webhookSupport: true,
    documentationUrl: 'https://www.pabbly.com/connect/',
  },
  {
    id: 'make',
    name: 'Make (Integromat)',
    logo: 'https://www.make.com/favicon.ico',
    description: 'Visual automation builder with powerful data transformation. Perfect for complex workflows.',
    steps: [
      'Create a new Scenario in Make',
      'Add a Webhooks module as the trigger',
      'Select "Custom webhook" and create a new webhook',
      'Copy the generated webhook URL',
      'Configure BuildMyBot to send events to this URL',
      'Run the scenario once to capture the data structure',
      'Build your automation flow with filters and routers',
    ],
    webhookSupport: true,
    documentationUrl: 'https://www.make.com/en/integrations/webhook',
  },
  {
    id: 'n8n',
    name: 'n8n',
    logo: 'https://n8n.io/favicon.ico',
    description: 'Self-hosted automation with full control over your data. Open-source alternative to Zapier.',
    steps: [
      'Create a new Workflow in n8n',
      'Add a Webhook node as the trigger',
      'Configure the webhook method as POST',
      'Copy the webhook URL (production or test)',
      'Add the URL to BuildMyBot webhook settings',
      'Test the connection with a sample event',
      'Add subsequent nodes for your automation logic',
    ],
    webhookSupport: true,
    documentationUrl: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/',
  },
];

interface IntegrationCardProps {
  integration: IntegrationGuide;
  isExpanded: boolean;
  onToggle: () => void;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  integration,
  isExpanded,
  onToggle,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
            <img
              src={integration.logo}
              alt={integration.name}
              className="w-8 h-8 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="text-slate-400 text-lg font-bold">' + integration.name[0] + '</div>';
              }}
            />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-slate-900">{integration.name}</h4>
            <p className="text-sm text-slate-500 line-clamp-1">{integration.description}</p>
          </div>
        </div>
        <ChevronRight
          size={20}
          className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <p className="text-sm text-slate-600 mb-4">{integration.description}</p>

          <div className="space-y-3 mb-4">
            <h5 className="text-sm font-semibold text-slate-800">Setup Steps:</h5>
            {integration.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {index + 1}
                </div>
                <p className="text-sm text-slate-600 pt-0.5">{step}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-sm">
              {integration.webhookSupport && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg">
                  <CheckCircle size={14} />
                  Webhook Support
                </span>
              )}
            </div>
            <a
              href={integration.documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              View Docs <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export const IntegrationGuides: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Workflow className="text-blue-900" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Integration Guides</h3>
          <p className="text-sm text-slate-500">Connect BuildMyBot to your favorite automation tools</p>
        </div>
      </div>

      <div className="grid gap-4">
        {INTEGRATIONS.map(integration => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            isExpanded={expandedId === integration.id}
            onToggle={() => setExpandedId(expandedId === integration.id ? null : integration.id)}
          />
        ))}
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <Link2 size={24} />
          </div>
          <div>
            <h4 className="font-bold text-lg mb-2">Custom Webhooks</h4>
            <p className="text-slate-300 text-sm mb-4">
              BuildMyBot supports custom webhook endpoints for any platform. Configure webhooks in
              Settings to receive real-time notifications for leads, conversations, and bot events.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white/10 rounded-full text-sm">lead.created</span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-sm">conversation.completed</span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-sm">bot.trained</span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-sm">appointment.booked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationGuides;
