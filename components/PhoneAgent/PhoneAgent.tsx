'use client';

import React, { useState, useEffect } from 'react';
import { Phone, Mic, Settings, PlayCircle, Save, Voicemail } from 'lucide-react';

interface PhoneAgentProps {
  botId: string;
}

interface PhoneCall {
  id: string;
  from_number: string;
  to_number: string;
  status: string;
  duration: number | null;
  created_at: string;
  transcription: string | null;
}

export const PhoneAgent: React.FC<PhoneAgentProps> = ({ botId }) => {
  const [enabled, setEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [voice, setVoice] = useState('Polly.Joanna');
  const [phoneGreeting, setPhoneGreeting] = useState("Hi! Thanks for calling. How can I help you today?");
  const [calls, setCalls] = useState<PhoneCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBotSettings();
    loadCalls();
  }, [botId]);

  const loadBotSettings = async () => {
    try {
      const response = await fetch(`/api/bots/${botId}`);
      if (response.ok) {
        const { bot } = await response.json();
        setPhoneNumber(bot.phone_number || '');
        setPhoneGreeting(bot.phone_greeting || "Hi! Thanks for calling. How can I help you today?");
        setEnabled(bot.phone_enabled || false);
      }
    } catch (err) {
      console.error('Failed to load bot settings:', err);
    }
  };

  const loadCalls = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/phone/calls?botId=${botId}`);
      if (response.ok) {
        const { calls } = await response.json();
        setCalls(calls || []);
      }
    } catch (err) {
      console.error('Failed to load calls:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/bots/${botId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          phone_greeting: phoneGreeting,
          phone_enabled: enabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      // Reload settings
      await loadBotSettings();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTimeAgo = (date: string): string => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-2xl font-bold text-slate-800">AI Phone Agent</h2>
           <p className="text-slate-500">Deploy an AI receptionist to answer calls 24/7.</p>
         </div>
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

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Config */}
          <div className="md:col-span-2 space-y-6">
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-blue-50 text-blue-900 rounded-lg"><Settings size={18} /></div>
                  <h3 className="font-bold text-slate-800">Configuration</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1234567890"
                      className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 font-mono text-sm"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Configure this number in Twilio to point to: {process.env.NEXT_PUBLIC_APP_URL}/api/phone/incoming
                    </p>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">Greeting Message</label>
                     <textarea
                       value={phoneGreeting}
                       onChange={(e) => setPhoneGreeting(e.target.value)}
                       className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 h-24 p-3 text-sm"
                     />
                  </div>
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                      {error}
                    </div>
                  )}
                </div>
             </div>

             <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h4>
                <ol className="space-y-1 text-sm text-blue-800 list-decimal list-inside">
                  <li>Get a phone number from Twilio</li>
                  <li>Configure webhook URL in Twilio: {process.env.NEXT_PUBLIC_APP_URL}/api/phone/incoming</li>
                  <li>Add status callback URL: {process.env.NEXT_PUBLIC_APP_URL}/api/phone/status</li>
                  <li>Enter your phone number above and enable the agent</li>
                </ol>
             </div>
          </div>

          {/* Sidebar / Status */}
          <div className="space-y-6">
             <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                   <h3 className="font-bold text-lg mb-1">Phone Number</h3>
                   <div className="flex items-center gap-2 text-blue-300 mb-6">
                     <Phone size={16} /> 
                     <span className="font-mono">{phoneNumber || '(555) 123-4567'}</span>
                   </div>
                   <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition border border-white/20">
                     Purchase Number ($2/mo)
                   </button>
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-900 rounded-full blur-2xl opacity-50"></div>
             </div>

             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Voicemail size={18} className="text-blue-900" /> Recent Calls
                </h3>
                {loading ? (
                  <div className="text-center py-4 text-slate-500 text-sm">Loading...</div>
                ) : calls.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 text-sm">No calls yet</div>
                ) : (
                  <div className="space-y-3">
                    {calls.slice(0, 5).map((call) => (
                      <div key={call.id} className="flex justify-between items-center text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                        <div>
                          <p className="font-medium text-slate-700">{call.from_number}</p>
                          <p className="text-xs text-slate-400">{formatTimeAgo(call.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs capitalize ${
                            call.status === 'failed' || call.status === 'no-answer' ? 'text-red-500' : 'text-emerald-500'
                          }`}>
                            {call.status}
                          </p>
                          <p className="text-xs text-slate-400">{formatDuration(call.duration)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={loadCalls}
                  className="w-full mt-4 text-xs text-blue-900 font-medium hover:underline"
                >
                  Refresh Call Logs
                </button>
             </div>
          </div>
       </div>

       <div className="flex justify-end pt-4 border-t border-slate-200">
         <button
           onClick={handleSave}
           disabled={saving}
           className="px-6 py-2.5 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-950 shadow-sm transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
         >
           <Save size={18} /> {saving ? 'Saving...' : 'Save Agent Configuration'}
         </button>
       </div>
    </div>
  );
};