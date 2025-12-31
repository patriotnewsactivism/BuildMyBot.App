import React, { useState } from 'react';
import { Book, Key, Zap, Shield, Code, Globe, Users, MessageSquare, Database, Webhook, Copy, Check, AlertCircle, ChevronDown, Clock, Activity } from 'lucide-react';
import { PlanType, User } from '../../types';
import { RATE_LIMITS, PLANS } from '../../constants';
import { CodeExample, MultiCodeExample } from './CodeExample';
import { IntegrationGuides } from './IntegrationGuides';

interface ApiDocumentationProps {
  user?: User;
}

type DocSection = 'quickstart' | 'authentication' | 'endpoints' | 'rate-limits' | 'webhooks' | 'integrations';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  category: string;
  requiresAuth: boolean;
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  responseExample?: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'POST',
    path: '/api/ai',
    description: 'Send a message to your bot and receive an AI-generated response',
    category: 'Chat',
    requiresAuth: true,
    parameters: [
      { name: 'action', type: 'string', required: true, description: '"generateBotResponse"' },
      { name: 'payload.messages', type: 'array', required: true, description: 'Array of message objects with role and content' },
      { name: 'payload.model', type: 'string', required: false, description: 'Model ID (default: gpt-4o-mini)' },
    ],
    responseExample: `{
  "content": "Hello! How can I assist you today?"
}`,
  },
  {
    method: 'GET',
    path: '/api/bots',
    description: 'List all bots for the authenticated user',
    category: 'Bots',
    requiresAuth: true,
    responseExample: `{
  "bots": [
    {
      "id": "bot_123",
      "name": "Support Agent",
      "model": "gpt-4o-mini",
      "active": true
    }
  ]
}`,
  },
  {
    method: 'POST',
    path: '/api/bots',
    description: 'Create a new bot with the specified configuration',
    category: 'Bots',
    requiresAuth: true,
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Bot display name' },
      { name: 'systemPrompt', type: 'string', required: true, description: 'System instructions for the bot' },
      { name: 'model', type: 'string', required: false, description: 'AI model to use' },
    ],
  },
  {
    method: 'GET',
    path: '/api/leads',
    description: 'Retrieve leads captured by your bots',
    category: 'Leads',
    requiresAuth: true,
    parameters: [
      { name: 'botId', type: 'string', required: false, description: 'Filter by bot ID' },
      { name: 'status', type: 'string', required: false, description: 'Filter by status (New, Contacted, Qualified, Closed)' },
      { name: 'limit', type: 'number', required: false, description: 'Max results to return (default: 50)' },
    ],
  },
  {
    method: 'POST',
    path: '/api/leads',
    description: 'Create a new lead manually',
    category: 'Leads',
    requiresAuth: true,
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Lead name' },
      { name: 'email', type: 'string', required: true, description: 'Lead email' },
      { name: 'phone', type: 'string', required: false, description: 'Lead phone number' },
      { name: 'botId', type: 'string', required: true, description: 'Associated bot ID' },
    ],
  },
  {
    method: 'GET',
    path: '/api/conversations',
    description: 'Retrieve conversation history',
    category: 'Conversations',
    requiresAuth: true,
    parameters: [
      { name: 'botId', type: 'string', required: false, description: 'Filter by bot ID' },
      { name: 'sessionId', type: 'string', required: false, description: 'Filter by session ID' },
    ],
  },
  {
    method: 'POST',
    path: '/api/knowledge',
    description: 'Upload content to a bot\'s knowledge base',
    category: 'Knowledge Base',
    requiresAuth: true,
    parameters: [
      { name: 'botId', type: 'string', required: true, description: 'Bot to add knowledge to' },
      { name: 'content', type: 'string', required: true, description: 'Text content to embed' },
      { name: 'fileName', type: 'string', required: false, description: 'Source file name' },
    ],
  },
];

const METHOD_COLORS = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
};

const NAV_ITEMS = [
  { id: 'quickstart', label: 'Quick Start', icon: Zap },
  { id: 'authentication', label: 'Authentication', icon: Key },
  { id: 'endpoints', label: 'API Endpoints', icon: Code },
  { id: 'rate-limits', label: 'Rate Limits', icon: Activity },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'integrations', label: 'Integrations', icon: Globe },
];

export const ApiDocumentation: React.FC<ApiDocumentationProps> = ({ user }) => {
  const [activeSection, setActiveSection] = useState<DocSection>('quickstart');
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);

  const userPlan = user?.plan || PlanType.FREE;
  const rateLimits = RATE_LIMITS[userPlan];
  const mockApiKey = 'bmb_sk_live_' + 'x'.repeat(32);

  const handleCopyApiKey = async () => {
    await navigator.clipboard.writeText(mockApiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  const categories = [...new Set(ENDPOINTS.map(e => e.category))];

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 animate-fade-in">
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-64 shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 p-4 lg:sticky lg:top-0 lg:h-fit">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-200">
          <div className="p-2 bg-blue-900 rounded-lg text-white">
            <Book size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">API Docs</h2>
            <p className="text-xs text-slate-500">v1.0</p>
          </div>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as DocSection)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === item.id
                  ? 'bg-blue-50 text-blue-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {activeSection === 'quickstart' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Quick Start</h3>
              <p className="text-slate-600 mb-6">
                Get started with the BuildMyBot API in minutes. Follow these steps to make your first API call.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Get your API key</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Generate an API key from your Settings page. Keep this key secure and never expose it in client-side code.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Make your first request</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Use the API key in the Authorization header to authenticate your requests.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Handle the response</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      All responses are JSON formatted. Check for error codes and handle them appropriately.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <MultiCodeExample
              title="Send a Chat Message"
              description="Example of sending a message to your bot and receiving a response"
              examples={[
                {
                  language: 'curl',
                  code: `curl -X POST https://api.buildmybot.app/api/ai \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "generateBotResponse",
    "payload": {
      "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello, how can you help me?"}
      ],
      "model": "gpt-4o-mini"
    }
  }'`,
                },
                {
                  language: 'javascript',
                  code: `const response = await fetch('https://api.buildmybot.app/api/ai', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'generateBotResponse',
    payload: {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, how can you help me?' }
      ],
      model: 'gpt-4o-mini'
    }
  })
});

const data = await response.json();
console.log(data.content);`,
                },
                {
                  language: 'python',
                  code: `import requests

response = requests.post(
    'https://api.buildmybot.app/api/ai',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json',
    },
    json={
        'action': 'generateBotResponse',
        'payload': {
            'messages': [
                {'role': 'system', 'content': 'You are a helpful assistant.'},
                {'role': 'user', 'content': 'Hello, how can you help me?'}
            ],
            'model': 'gpt-4o-mini'
        }
    }
)

print(response.json()['content'])`,
                },
              ]}
            />
          </div>
        )}

        {activeSection === 'authentication' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Key className="text-amber-600" size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Authentication</h3>
              </div>

              <p className="text-slate-600 mb-6">
                The BuildMyBot API uses Bearer token authentication. Include your API key in the
                <code className="mx-1 px-2 py-0.5 bg-slate-100 rounded text-sm">Authorization</code>
                header of all requests.
              </p>

              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Your API Key</span>
                  <button
                    onClick={handleCopyApiKey}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                  >
                    {apiKeyCopied ? <Check size={14} /> : <Copy size={14} />}
                    {apiKeyCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="font-mono text-sm bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-600 overflow-x-auto">
                  {mockApiKey}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  This is a sample key. Generate real keys from Settings.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-amber-600 shrink-0" size={20} />
                <div>
                  <h4 className="font-semibold text-amber-900">Security Warning</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Never expose your API key in client-side code, public repositories, or share it
                    with unauthorized users. Rotate your key immediately if compromised.
                  </p>
                </div>
              </div>
            </div>

            <CodeExample
              title="Authorization Header"
              language="curl"
              code={`Authorization: Bearer bmb_sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
              description="Include this header in all API requests"
            />
          </div>
        )}

        {activeSection === 'endpoints' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Code className="text-blue-600" size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">API Endpoints</h3>
              </div>
              <p className="text-slate-600">
                Base URL: <code className="px-2 py-0.5 bg-slate-100 rounded text-sm">https://api.buildmybot.app</code>
              </p>
            </div>

            {categories.map(category => (
              <div key={category} className="space-y-3">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide">{category}</h4>
                {ENDPOINTS.filter(e => e.category === category).map(endpoint => (
                  <div
                    key={`${endpoint.method}-${endpoint.path}`}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedEndpoint(
                          expandedEndpoint === `${endpoint.method}-${endpoint.path}`
                            ? null
                            : `${endpoint.method}-${endpoint.path}`
                        )
                      }
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${METHOD_COLORS[endpoint.method]}`}>
                          {endpoint.method}
                        </span>
                        <code className="text-sm text-slate-800">{endpoint.path}</code>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500 hidden md:block">{endpoint.description}</span>
                        <ChevronDown
                          size={18}
                          className={`text-slate-400 transition-transform ${
                            expandedEndpoint === `${endpoint.method}-${endpoint.path}` ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {expandedEndpoint === `${endpoint.method}-${endpoint.path}` && (
                      <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-4">
                        <p className="text-sm text-slate-600">{endpoint.description}</p>

                        {endpoint.parameters && endpoint.parameters.length > 0 && (
                          <div>
                            <h5 className="text-sm font-semibold text-slate-800 mb-2">Parameters</h5>
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium text-slate-600">Name</th>
                                    <th className="px-3 py-2 text-left font-medium text-slate-600">Type</th>
                                    <th className="px-3 py-2 text-left font-medium text-slate-600">Required</th>
                                    <th className="px-3 py-2 text-left font-medium text-slate-600">Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {endpoint.parameters.map(param => (
                                    <tr key={param.name} className="border-t border-slate-100">
                                      <td className="px-3 py-2 font-mono text-blue-600">{param.name}</td>
                                      <td className="px-3 py-2 text-slate-600">{param.type}</td>
                                      <td className="px-3 py-2">
                                        {param.required ? (
                                          <span className="text-red-600">Yes</span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-slate-600">{param.description}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {endpoint.responseExample && (
                          <div>
                            <h5 className="text-sm font-semibold text-slate-800 mb-2">Response Example</h5>
                            <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-sm overflow-x-auto">
                              <code>{endpoint.responseExample}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {activeSection === 'rate-limits' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="text-purple-600" size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Rate Limits</h3>
              </div>
              <p className="text-slate-600 mb-6">
                API rate limits vary by plan. Exceeding your limit will result in 429 Too Many Requests errors.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Plan</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Requests/Minute</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Requests/Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(RATE_LIMITS).map(([planKey, limits]) => (
                      <tr key={planKey} className="border-t border-slate-200">
                        <td className="px-4 py-3">
                          <span className={`font-medium ${planKey === userPlan ? 'text-blue-600' : 'text-slate-700'}`}>
                            {PLANS[planKey as PlanType]?.name || planKey}
                            {planKey === userPlan && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                Your Plan
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{limits.requestsPerMinute}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {limits.requestsPerDay === -1 ? 'Unlimited' : limits.requestsPerDay.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Rate Limit Headers</h4>
              <p className="text-sm text-blue-700 mb-3">
                Each API response includes headers to help you track your rate limit status:
              </p>
              <div className="bg-white rounded-lg p-3 font-mono text-sm text-slate-700 space-y-1">
                <div>X-RateLimit-Limit: 60</div>
                <div>X-RateLimit-Remaining: 45</div>
                <div>X-RateLimit-Reset: 1703616000</div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'webhooks' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Webhook className="text-green-600" size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Webhooks</h3>
              </div>
              <p className="text-slate-600 mb-6">
                Receive real-time notifications when events occur in your BuildMyBot account.
                Configure webhook endpoints in Settings to subscribe to events.
              </p>

              <h4 className="font-semibold text-slate-800 mb-3">Available Events</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { event: 'lead.created', description: 'A new lead was captured by your bot' },
                  { event: 'lead.updated', description: 'Lead status or details were updated' },
                  { event: 'conversation.completed', description: 'A chat session ended' },
                  { event: 'bot.trained', description: 'Knowledge base was updated' },
                  { event: 'appointment.booked', description: 'An appointment was scheduled' },
                  { event: 'subscription.changed', description: 'Plan was upgraded or downgraded' },
                ].map(item => (
                  <div key={item.event} className="p-3 bg-slate-50 rounded-lg">
                    <code className="text-sm text-blue-600 font-medium">{item.event}</code>
                    <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <CodeExample
              title="Webhook Payload Example"
              language="json"
              code={`{
  "event": "lead.created",
  "timestamp": "2024-12-26T10:30:00Z",
  "data": {
    "id": "lead_abc123",
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "+1-555-123-4567",
    "score": 85,
    "botId": "bot_xyz789",
    "sourceUrl": "https://yoursite.com/contact"
  }
}`}
              description="All webhook payloads follow this structure with event type and data"
            />

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Shield className="text-amber-600 shrink-0" size={20} />
              <div>
                <h4 className="font-semibold text-amber-900">Webhook Security</h4>
                <p className="text-sm text-amber-700 mt-1">
                  All webhooks include a signature header (<code>X-BuildMyBot-Signature</code>) for
                  verification. Validate signatures on your server to ensure requests originate from BuildMyBot.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'integrations' && <IntegrationGuides />}
      </div>
    </div>
  );
};

export default ApiDocumentation;
