import React, { useState, useEffect } from 'react';
import { Phone, Mic, Settings, PlayCircle, Save, Voicemail, Play, Loader, AlertCircle, CheckCircle, ExternalLink, PhoneCall, PhoneOff, Volume2 } from 'lucide-react';
import { User } from '../../types';
import {
  RETELL_VOICES,
  RetellVoice,
  RetellCall,
  isRetellConfigured,
  listRetellCalls,
} from '../../services/retellService';

interface PhoneAgentProps {
  user?: User;
  onUpdate?: (user: User) => void;
}

export const PhoneAgent: React.FC<PhoneAgentProps> = ({ user, onUpdate }) => {
  const [enabled, setEnabled] = useState(user?.phoneConfig?.enabled || false);
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneConfig?.phoneNumber || '');
  const [voice, setVoice] = useState(user?.phoneConfig?.voiceId || 'eleven_turbo_v2_rachel');
  const [introMessage, setIntroMessage] = useState(
    user?.phoneConfig?.introMessage || "Hello! Thanks for calling. How can I help you today?"
  );

  // Agent Configuration
  const [agentName, setAgentName] = useState('My AI Receptionist');
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a friendly and professional AI receptionist. Help callers with their questions, schedule appointments, and collect contact information when appropriate. Be warm, conversational, and helpful."
  );

  // State
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingCall, setIsTestingCall] = useState(false);
  const [testCallStatus, setTestCallStatus] = useState<string>('');
  const [recentCalls, setRecentCalls] = useState<RetellCall[]>([]);
  const [selectedVoiceProvider, setSelectedVoiceProvider] = useState<string>('ElevenLabs');
  const [activeTab, setActiveTab] = useState<'setup' | 'voice' | 'calls'>('setup');

  // Check configuration on mount
  useEffect(() => {
    setIsConfigured(isRetellConfigured());
    if (isRetellConfigured()) {
      loadRecentCalls();
    }
  }, []);

  const loadRecentCalls = async () => {
    const calls = await listRetellCalls(undefined, 10);
    setRecentCalls(calls);
  };

  const filteredVoices = RETELL_VOICES.filter(v =>
    selectedVoiceProvider === 'All' || v.provider === selectedVoiceProvider
  );

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (onUpdate && user) {
        onUpdate({
          ...user,
          phoneConfig: {
            enabled,
            phoneNumber,
            voiceId: voice,
            introMessage
          }
        });
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestCall = async () => {
    setIsTestingCall(true);
    setTestCallStatus('Initiating test call...');

    try {
      setTestCallStatus('Connecting to AI agent...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      setTestCallStatus('Connected! AI Agent is ready to speak...');

      // Play intro message using browser speech synthesis for demo
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(introMessage);
        utter.rate = 0.9;
        utter.pitch = 1;
        window.speechSynthesis.speak(utter);

        utter.onend = () => {
          setTestCallStatus('AI Agent: "I\'m listening..."');
        };
      }
    } catch (error) {
      setTestCallStatus('Test call failed. Please check your configuration.');
    }
  };

  const endTestCall = () => {
    setIsTestingCall(false);
    setTestCallStatus('');
    window.speechSynthesis?.cancel();
  };

  const formatDuration = (startTs?: number, endTs?: number): string => {
    if (!startTs || !endTs) return '-';
    const seconds = Math.round((endTs - startTs) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTime = (timestamp?: number): string => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.round(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">AI Phone Agent</h2>
          <p className="text-slate-500">Deploy a human-like AI receptionist powered by Retell AI</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${enabled ? 'text-emerald-600' : 'text-slate-500'}`}>
              {enabled ? 'Agent Active' : 'Agent Disabled'}
            </span>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`w-12 h-6 rounded-full transition-colors relative ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${enabled ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Warning */}
      {!isConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-medium text-amber-800">Retell AI Not Configured</h4>
            <p className="text-sm text-amber-700 mt-1">
              Add your Retell API key to <code className="bg-amber-100 px-1 rounded">VITE_RETELL_API_KEY</code> in your environment variables.
              <a href="https://retellai.com" target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-amber-800 font-medium hover:underline">
                Get API Key <ExternalLink size={12} />
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {[
          { id: 'setup', label: 'Setup', icon: Settings },
          { id: 'voice', label: 'Voice Selection', icon: Volume2 },
          { id: 'calls', label: 'Call History', icon: PhoneCall },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Config Area */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'setup' && (
            <>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Settings size={18} className="text-blue-900" /> Agent Configuration
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Agent Name</label>
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="e.g., Apex Digital Receptionist"
                      className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    />
                    <p className="text-xs text-slate-500 mt-1">Connect your Twilio number or purchase one through Retell</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Greeting Message</label>
                    <textarea
                      value={introMessage}
                      onChange={(e) => setIntroMessage(e.target.value)}
                      className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 h-20 p-3 text-sm"
                      placeholder="Hello! Thanks for calling..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Agent Behavior (System Prompt)</label>
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 h-32 p-3 text-sm"
                      placeholder="Define how your AI agent should behave..."
                    />
                    <p className="text-xs text-slate-500 mt-1">This defines your agent's personality and capabilities</p>
                  </div>
                </div>
              </div>

              {/* Features Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                <h3 className="font-bold text-slate-800 mb-4">Retell AI Features</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Ultra-low latency', value: '<500ms response' },
                    { label: 'Human-like voices', value: 'ElevenLabs & Azure' },
                    { label: 'Natural interruption', value: 'Handles overlapping speech' },
                    { label: 'Backchannel', value: '"Uh-huh", "I see" etc.' },
                    { label: 'Call recording', value: 'Full transcripts' },
                    { label: 'Compliance', value: 'HIPAA, SOC2, GDPR' },
                  ].map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-slate-700">{feature.label}</div>
                        <div className="text-xs text-slate-500">{feature.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'voice' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Mic size={18} className="text-blue-900" /> Voice Selection
                </h3>
                <select
                  value={selectedVoiceProvider}
                  onChange={(e) => setSelectedVoiceProvider(e.target.value)}
                  className="text-sm rounded-lg border-slate-200"
                >
                  <option value="All">All Providers</option>
                  <option value="ElevenLabs">ElevenLabs (Best Quality)</option>
                  <option value="Azure">Azure (Good Value)</option>
                  <option value="Retell">Retell Native</option>
                </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredVoices.map((v) => (
                  <div
                    key={v.voice_id}
                    onClick={() => setVoice(v.voice_id)}
                    className={`p-4 rounded-xl border cursor-pointer transition hover:shadow-md ${
                      voice === v.voice_id
                        ? 'border-blue-900 bg-blue-50 ring-2 ring-blue-900'
                        : 'border-slate-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-800">{v.voice_name}</span>
                      <button
                        className="text-slate-400 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Play voice sample using browser TTS for demo
                          const utter = new SpeechSynthesisUtterance("Hello! How can I help you today?");
                          window.speechSynthesis.speak(utter);
                        }}
                      >
                        <PlayCircle size={18} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className={`px-2 py-0.5 rounded-full ${
                        v.provider === 'ElevenLabs' ? 'bg-purple-100 text-purple-700' :
                        v.provider === 'Azure' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {v.provider}
                      </span>
                      <span>{v.gender}</span>
                      {v.accent && <span>• {v.accent}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                <p className="text-sm text-purple-800">
                  <strong>Recommendation:</strong> ElevenLabs voices provide the most human-like experience with natural prosody and emotion.
                  They're indistinguishable from human voices in most cases.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'calls' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Voicemail size={18} className="text-blue-900" /> Call History
              </h3>

              {recentCalls.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <PhoneCall size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No calls yet</p>
                  <p className="text-sm">Calls will appear here once your agent starts receiving them</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCalls.map((call) => (
                    <div key={call.call_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          call.call_status === 'ended' ? 'bg-emerald-100 text-emerald-600' :
                          call.call_status === 'error' ? 'bg-red-100 text-red-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          <Phone size={18} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{call.from_number || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{formatTime(call.start_timestamp)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium capitalize ${
                          call.call_status === 'ended' ? 'text-emerald-600' :
                          call.call_status === 'error' ? 'text-red-600' :
                          'text-blue-600'
                        }`}>
                          {call.call_status}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDuration(call.start_timestamp, call.end_timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Test Call */}
        <div className="space-y-6">
          {/* Test Call Simulator */}
          <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-transparent"></div>
            <div className="relative z-10 text-center">
              <h3 className="font-bold text-lg mb-4">Test Your Agent</h3>

              <div
                className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 transition-all duration-500 cursor-pointer ${
                  isTestingCall
                    ? 'bg-red-500 animate-pulse hover:bg-red-600'
                    : 'bg-emerald-500 hover:bg-emerald-400 hover:scale-105'
                }`}
                onClick={isTestingCall ? endTestCall : handleTestCall}
              >
                {isTestingCall ? <PhoneOff size={32} /> : <Phone size={32} />}
              </div>

              <p className="text-sm font-medium mb-2">
                {isTestingCall ? 'Click to End Call' : 'Click to Start Test Call'}
              </p>

              {testCallStatus && (
                <p className="text-xs text-slate-300 mt-2 animate-fade-in">
                  {testCallStatus}
                </p>
              )}

              {isTestingCall && (
                <div className="mt-4 flex justify-center gap-1">
                  <div className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse"></div>
                  <div className="w-1 h-6 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1 h-5 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Info */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Pricing</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Per minute</span>
                <span className="font-bold text-slate-800">$0.07</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Phone number</span>
                <span className="font-bold text-slate-800">$2/mo</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Setup fee</span>
                <span className="font-bold text-emerald-600">Free</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Powered by Retell AI with ElevenLabs voices. No hidden fees. Pay only for what you use.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full px-6 py-3 bg-blue-900 text-white rounded-xl font-medium hover:bg-blue-950 shadow-lg shadow-blue-900/20 transition flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isSaving ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
