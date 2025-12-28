import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Loader,
  Mic,
  Phone,
  PlayCircle,
  Save,
  Settings,
  Voicemail,
} from 'lucide-react';
import { CallStatus, PhoneCall, User } from '../../types';
import { phoneCallService } from '../../services/phoneCallService';

interface PhoneAgentProps {
  user?: User;
  onUpdate?: (user: User) => void;
}

const statusLabelMap: Record<CallStatus, string> = {
  initiated: 'Initiated',
  'in-progress': 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
};

const statusColorMap: Record<CallStatus, string> = {
  initiated: 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-indigo-100 text-indigo-800',
  completed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-rose-100 text-rose-800',
};

const defaultSimulatorState = {
  fromNumber: '+14155550123',
  transcript: 'Calling to confirm the appointment tomorrow at 3 PM.',
  durationSeconds: 75,
  status: 'completed' as CallStatus,
};

export const PhoneAgent: React.FC<PhoneAgentProps> = ({ user, onUpdate }) => {
  const [enabled, setEnabled] = useState(user?.phoneConfig?.enabled || false);
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneConfig?.phoneNumber || '');
  const [voice, setVoice] = useState(user?.phoneConfig?.voiceId || 'alloy');
  const [introMessage, setIntroMessage] = useState(
    user?.phoneConfig?.introMessage || 'Hi! Thanks for calling Apex Digital. How can I help you today?',
  );

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState('Ready to call');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingSimulation, setIsLoggingSimulation] = useState(false);
  const [simulatorError, setSimulatorError] = useState<string | null>(null);
  const [callLogsError, setCallLogsError] = useState<string | null>(null);
  const [callLogsLoading, setCallLogsLoading] = useState(false);
  const [callLogs, setCallLogs] = useState<PhoneCall[]>([]);
  const [copied, setCopied] = useState(false);
  const [simulatorState, setSimulatorState] = useState(defaultSimulatorState);

  useEffect(() => {
    setEnabled(user?.phoneConfig?.enabled || false);
    setPhoneNumber(user?.phoneConfig?.phoneNumber || '');
    setVoice(user?.phoneConfig?.voiceId || 'alloy');
    setIntroMessage(
      user?.phoneConfig?.introMessage || 'Hi! Thanks for calling Apex Digital. How can I help you today?',
    );
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      setCallLogs([]);
      return undefined;
    }

    setCallLogsLoading(true);
    const unsubscribe = phoneCallService.subscribeToUserPhoneCalls(
      user.id,
      (calls) => {
        setCallLogs(calls);
        setCallLogsLoading(false);
      },
      (message) => {
        setCallLogsError(message);
        setCallLogsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const webhookUrl = useMemo(() => {
    const env = typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: Record<string, string> }).env : undefined;
    const baseUrl = env?.VITE_SUPABASE_URL || env?.NEXT_PUBLIC_SUPABASE_URL || '';
    return baseUrl ? `${baseUrl}/functions/v1/twilio-call-webhook` : 'https://<your-project>.supabase.co/functions/v1/twilio-call-webhook';
  }, []);

  const voiceHandlerUrl = useMemo(() => {
    const env = typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: Record<string, string> }).env : undefined;
    const baseUrl = env?.VITE_SUPABASE_URL || env?.NEXT_PUBLIC_SUPABASE_URL || '';
    return baseUrl ? `${baseUrl}/functions/v1/twilio-voice-handler` : 'https://<your-project>.supabase.co/functions/v1/twilio-voice-handler';
  }, []);

  const [copiedVoice, setCopiedVoice] = useState(false);

  const startSimulation = () => {
    setSimulatorError(null);
    setIsSimulating(true);
    setSimulationStatus('Connecting...');

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(introMessage);
      window.speechSynthesis.speak(utter);
    }

    window.setTimeout(() => setSimulationStatus('AI Agent: "Listening..."'), 1200);
  };

  const endSimulation = () => {
    setIsSimulating(false);
    setSimulationStatus('Call ended');
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

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
            introMessage,
          },
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSimulatedLog = async () => {
    if (!user?.id) {
      setSimulatorError('Sign in to log and view phone calls.');
      return;
    }

    if (!enabled) {
      setSimulatorError('Enable the phone agent before simulating calls.');
      return;
    }

    setSimulatorError(null);
    setIsLoggingSimulation(true);

    const result = await phoneCallService.simulateInboundCall({
      userId: user.id,
      botId: undefined,
      toNumber: phoneNumber || undefined,
      fromNumber: simulatorState.fromNumber,
      transcript: simulatorState.transcript,
      durationSeconds: simulatorState.durationSeconds,
      status: simulatorState.status,
      metadata: { simulated: true, source: 'ui-simulator' },
    });

    if ('error' in result) {
      setSimulatorError(result.error?.message || 'Unable to log simulated call.');
    } else {
      setSimulationStatus('Simulated call logged');
      setIsSimulating(false);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }

    setIsLoggingSimulation(false);
  };

  const handleCopyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Unable to copy webhook URL', error);
    }
  };

  const handleCopyVoiceUrl = async () => {
    try {
      await navigator.clipboard.writeText(voiceHandlerUrl);
      setCopiedVoice(true);
      window.setTimeout(() => setCopiedVoice(false), 1500);
    } catch (error) {
      console.error('Unable to copy voice handler URL', error);
    }
  };

  const renderCallLog = (call: PhoneCall) => (
    <div key={call.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-800">{call.fromNumber || 'Unknown caller'}</p>
          <p className="text-xs text-slate-500">to {call.toNumber || 'N/A'}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColorMap[call.status]}`}>
          {statusLabelMap[call.status]}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-slate-600">
        <div>
          <p className="font-semibold text-slate-700">Duration</p>
          <p>{call.durationSeconds !== null && call.durationSeconds !== undefined ? `${call.durationSeconds}s` : 'Pending'}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-700">Recording</p>
          <p>{call.recordingUrl ? 'Available' : 'Not recorded'}</p>
        </div>
      </div>
      {call.transcript && (
        <div className="mt-2 text-sm text-slate-700 bg-white border border-slate-100 rounded-md p-2">
          <p className="font-semibold text-slate-800 mb-1">Transcript</p>
          <p className="text-slate-600 whitespace-pre-line">{call.transcript}</p>
        </div>
      )}
      {call.metadata && Object.keys(call.metadata).length > 0 && (
        <div className="mt-2 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Metadata</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.entries(call.metadata)
              .filter(([, value]) => Boolean(value))
              .slice(0, 4)
              .map(([key, value]) => (
                <span key={key} className="px-2 py-1 bg-white border border-slate-100 rounded-full">
                  {key}: {String(value)}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
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
            <div
              className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${enabled ? 'left-7' : 'left-1'}`}
            ></div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-50 text-blue-900 rounded-lg">
                <Settings size={18} />
              </div>
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
              <div className="p-2 bg-blue-50 text-blue-900 rounded-lg">
                <Mic size={18} />
              </div>
              <h3 className="font-bold text-slate-800">Voice Settings</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map((v) => (
                <div
                  key={v}
                  onClick={() => setVoice(v)}
                  className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center hover:border-blue-300 transition ${
                    voice === v ? 'border-blue-900 bg-blue-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <span className="capitalize font-medium text-slate-700">{v}</span>
                  <button
                    className="text-slate-400 hover:text-blue-900"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    aria-label={`Play ${v} sample`}
                  >
                    <PlayCircle size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                <Voicemail size={18} />
              </div>
              <div className="flex items-center justify-between w-full gap-2">
                <h3 className="font-bold text-slate-800">Recent Calls</h3>
                <span className="text-xs text-slate-500">Live webhook logging</span>
              </div>
            </div>

            {callLogsError && (
              <div className="flex items-center gap-2 text-red-800 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <AlertCircle size={16} />
                <span className="text-sm">{callLogsError}</span>
              </div>
            )}

            {callLogsLoading ? (
              <div className="text-sm text-slate-500">Loading calls...</div>
            ) : callLogs.length === 0 ? (
              <div className="text-sm text-slate-500">No calls logged yet. Point Twilio to your webhook to start collecting data.</div>
            ) : (
              <div className="space-y-3">{callLogs.slice(0, 6).map(renderCallLog)}</div>
            )}

            <p className="text-xs text-slate-400 mt-3">Calls with transcripts and status updates stream in automatically from Twilio webhooks.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Test Call Simulator</h3>
                {simulatorError ? (
                  <span className="text-xs text-rose-200 flex items-center gap-1">
                    <AlertCircle size={14} /> {simulatorError}
                  </span>
                ) : (
                  <span className="text-xs text-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Ready
                  </span>
                )}
              </div>

              <div
                className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mt-4 mb-4 transition-all duration-500 ${
                  isSimulating ? 'bg-red-500 animate-pulse cursor-pointer' : 'bg-emerald-500 hover:scale-105 cursor-pointer'
                }`}
                onClick={isSimulating ? endSimulation : startSimulation}
                data-testid="call-toggle"
              >
                <Phone size={32} className={isSimulating ? 'rotate-135' : ''} />
              </div>

              <p className="text-sm font-medium text-center">{simulationStatus}</p>

              <div className="mt-6 space-y-3 bg-slate-800/50 p-4 rounded-lg">
                <div>
                  <label className="text-xs text-slate-300">Caller Number</label>
                  <input
                    type="text"
                    value={simulatorState.fromNumber}
                    onChange={(e) => setSimulatorState({ ...simulatorState, fromNumber: e.target.value })}
                    className="w-full mt-1 rounded-md bg-slate-900 border border-slate-700 text-sm p-2 text-white"
                    placeholder="+14155550123"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300">Transcript Preview</label>
                  <textarea
                    value={simulatorState.transcript}
                    onChange={(e) => setSimulatorState({ ...simulatorState, transcript: e.target.value })}
                    className="w-full mt-1 rounded-md bg-slate-900 border border-slate-700 text-sm p-2 text-white h-20"
                    placeholder="What should the AI capture from this call?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-300">Duration (seconds)</label>
                    <input
                      type="number"
                      value={simulatorState.durationSeconds}
                      onChange={(e) =>
                        setSimulatorState({ ...simulatorState, durationSeconds: Number(e.target.value) || 0 })
                      }
                      className="w-full mt-1 rounded-md bg-slate-900 border border-slate-700 text-sm p-2 text-white"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300">Status</label>
                    <select
                      value={simulatorState.status}
                      onChange={(e) =>
                        setSimulatorState({ ...simulatorState, status: e.target.value as CallStatus })
                      }
                      className="w-full mt-1 rounded-md bg-slate-900 border border-slate-700 text-sm p-2 text-white"
                    >
                      <option value="initiated">Initiated</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleSimulatedLog}
                  disabled={isLoggingSimulation}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-white text-slate-900 rounded-md py-2 font-semibold hover:bg-slate-100 disabled:opacity-70"
                  data-testid="simulate-call"
                >
                  {isLoggingSimulation ? <Loader className="animate-spin" size={16} /> : <Phone size={16} />} Log simulated call
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 mb-1">Twilio Setup</h3>
              <p className="text-sm text-slate-500">Configure your Twilio phone number to work with Cartesia voice AI.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="text-blue-900 font-bold text-sm">1.</div>
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Voice Webhook URL (Primary)</p>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      readOnly
                      value={voiceHandlerUrl}
                      className="flex-1 rounded-md border border-blue-300 bg-white px-2 py-1.5 text-xs font-mono text-slate-700"
                    />
                    <button
                      onClick={handleCopyVoiceUrl}
                      className="px-2 py-1.5 rounded-md border border-blue-300 bg-white text-blue-900 hover:bg-blue-100 flex items-center gap-1 text-xs"
                      aria-label="Copy voice handler URL"
                    >
                      {copiedVoice ? <CheckCircle2 size={14} /> : <Clipboard size={14} />} {copiedVoice ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-blue-800 mt-1">Set this as "A CALL COMES IN" webhook in Twilio (HTTP POST)</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="text-blue-900 font-bold text-sm">2.</div>
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Status Callback URL</p>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="flex-1 rounded-md border border-blue-300 bg-white px-2 py-1.5 text-xs font-mono text-slate-700"
                    />
                    <button
                      onClick={handleCopyWebhookUrl}
                      className="px-2 py-1.5 rounded-md border border-blue-300 bg-white text-blue-900 hover:bg-blue-100 flex items-center gap-1 text-xs"
                      aria-label="Copy status webhook URL"
                    >
                      {copied ? <CheckCircle2 size={14} /> : <Clipboard size={14} />} {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-blue-800 mt-1">Set this as "STATUS CALLBACK URL" in Twilio phone number settings</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="text-blue-900 font-bold text-sm">3.</div>
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Configure Supabase Secrets</p>
                  <pre className="text-xs bg-blue-900 text-blue-50 rounded p-2 mt-1 overflow-x-auto">
{`supabase secrets set CARTESIA_API_KEY=your_key
supabase secrets set TWILIO_ACCOUNT_SID=AC...
supabase secrets set TWILIO_AUTH_TOKEN=your_token`}
                  </pre>
                  <p className="text-xs text-blue-800 mt-1">Get your Cartesia API key from <a href="https://cartesia.ai" target="_blank" rel="noopener noreferrer" className="underline">cartesia.ai</a></p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <CheckCircle2 size={14} />
              <span>Using Cartesia Sonic (sub-200ms latency) + Twilio Media Streams for real-time voice AI</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-200">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-950 shadow-sm transition flex items-center gap-2 disabled:opacity-70"
        >
          {isSaving ? <Loader className="animate-spin" size={18} /> : <Save size={18} />} Save Agent Configuration
        </button>
      </div>
    </div>
  );
};
