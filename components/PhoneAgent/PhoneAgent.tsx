import React, { useState, useEffect } from 'react';
import { Phone, Mic, Settings, PlayCircle, Save, Voicemail, Play, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { User } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface PhoneAgentProps {
  user?: User;
  onUpdate?: (user: User) => void;
}

interface PhoneCall {
  id: string;
  from_number: string;
  to_number: string;
  status: string;
  duration_seconds: number;
  created_at: string;
}

const getSupabaseUrl = () => process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

export const PhoneAgent: React.FC<PhoneAgentProps> = ({ user, onUpdate }) => {
  const [enabled, setEnabled] = useState(user?.phoneConfig?.enabled || false);
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneConfig?.phoneNumber || '');
  const [voice, setVoice] = useState(user?.phoneConfig?.voiceId || 'Polly.Joanna');
  const [introMessage, setIntroMessage] = useState(user?.phoneConfig?.introMessage || "Hi! Thanks for calling. How can I help you today?");

  // State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState('Ready to call');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentCalls, setRecentCalls] = useState<PhoneCall[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);

  // Fetch recent calls on mount
  useEffect(() => {
    const fetchCalls = async () => {
      if (!user || !supabase) {
        setLoadingCalls(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setLoadingCalls(false);
          return;
        }

        const supabaseUrl = getSupabaseUrl();
        const response = await fetch(`${supabaseUrl}/functions/v1/twilio-phone/calls`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setRecentCalls(data.calls || []);
        }
      } catch (e) {
        console.error('Error fetching calls:', e);
      } finally {
        setLoadingCalls(false);
      }
    };

    fetchCalls();
  }, [user]);

  const startSimulation = () => {
    setIsSimulating(true);
    setSimulationStatus('Connecting...');

    if ('speechSynthesis' in window) {
       const utter = new SpeechSynthesisUtterance(introMessage);
       window.speechSynthesis.speak(utter);
    }

    setTimeout(() => {
        setSimulationStatus('AI Agent: "Listening..."');
    }, 1500);
  };

  const endSimulation = () => {
    setIsSimulating(false);
    setSimulationStatus('Call ended');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleSave = async () => {
    if (!user || !supabase) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please log in to save');
      }

      const supabaseUrl = getSupabaseUrl();
      const response = await fetch(`${supabaseUrl}/functions/v1/twilio-phone/configure`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: String(enabled),
          phoneNumber,
          voiceId: voice,
          introMessage,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save configuration');
      }

      // Update local state
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

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Save error:', e);
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return 'Unknown';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">Twilio Phone Number SID</label>
                    <input 
                      type="text" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="PNXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" 
                      className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 font-mono text-sm"
                    />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">Greeting Message</label>
                     <textarea 
                       value={introMessage}
                       onChange={(e) => setIntroMessage(e.target.value)}
                       className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 h-24 p-3 text-sm"
                     />
                  </div>
                </div>
             </div>

             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-blue-50 text-blue-900 rounded-lg"><Mic size={18} /></div>
                  <h3 className="font-bold text-slate-800">Voice Settings</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map((v) => (
                    <div 
                      key={v}
                      onClick={() => setVoice(v)}
                      className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center hover:border-blue-300 transition ${
                        voice === v ? 'border-blue-900 bg-blue-50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span className="capitalize font-medium text-slate-700">{v}</span>
                      <button className="text-slate-400 hover:text-blue-900" onClick={(e) => { e.stopPropagation(); /* Play sample */ }}>
                        <PlayCircle size={16} />
                      </button>
                    </div>
                  ))}
                </div>
             </div>
          </div>

          {/* Sidebar / Status */}
          <div className="space-y-6">
             {/* Call Simulator */}
             <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                <div className="relative z-10 text-center">
                   <h3 className="font-bold text-lg mb-4">Test Call Simulator</h3>
                   
                   <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 transition-all duration-500 ${isSimulating ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 hover:scale-105 cursor-pointer'}`} onClick={isSimulating ? endSimulation : startSimulation}>
                      {isSimulating ? <Phone size={32} className="rotate-135" /> : <Phone size={32} />}
                   </div>
                   
                   <p className="text-sm font-medium">{simulationStatus}</p>
                   {isSimulating && (
                      <div className="mt-4 text-xs text-slate-300">
                         (Microphone Active)
                      </div>
                   )}
                </div>
             </div>

             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Voicemail size={18} className="text-blue-900" /> Recent Calls
                </h3>
                <div className="space-y-3">
                   {loadingCalls ? (
                     <div className="flex items-center justify-center py-4">
                       <Loader className="animate-spin text-slate-400" size={20} />
                     </div>
                   ) : recentCalls.length === 0 ? (
                     <div className="text-center py-4 text-slate-400 text-sm">
                       No calls yet. Configure your phone number to start receiving calls.
                     </div>
                   ) : (
                     recentCalls.slice(0, 5).map((call) => (
                       <div key={call.id} className="flex justify-between items-center text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                          <div>
                            <p className="font-medium text-slate-700">{formatPhoneNumber(call.from_number)}</p>
                            <p className="text-xs text-slate-400">{formatTimeAgo(call.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs capitalize ${call.status === 'failed' || call.status === 'missed' ? 'text-red-500' : 'text-emerald-500'}`}>
                              {call.status}
                            </p>
                            <p className="text-xs text-slate-400">{formatDuration(call.duration_seconds)}</p>
                          </div>
                       </div>
                     ))
                   )}
                </div>
                {recentCalls.length > 5 && (
                  <button className="w-full mt-4 text-xs text-blue-900 font-medium hover:underline">
                    View All {recentCalls.length} Calls
                  </button>
                )}
             </div>
          </div>
       </div>

       {/* Error/Success Feedback */}
       {error && (
         <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
           <AlertCircle size={18} />
           {error}
         </div>
       )}
       {saveSuccess && (
         <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
           <CheckCircle size={18} />
           Phone agent configuration saved successfully!
         </div>
       )}

       <div className="flex justify-end pt-4 border-t border-slate-200">
         <button
           onClick={handleSave}
           disabled={isSaving}
           className="px-6 py-2.5 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-950 shadow-sm transition flex items-center gap-2 disabled:opacity-70"
         >
           {isSaving ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
           Save Agent Configuration
         </button>
       </div>
    </div>
  );
};