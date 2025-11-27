import React, { useState } from 'react';
import { Phone, Mic, Settings, PlayCircle, Save, Voicemail, Play } from 'lucide-react';

export const PhoneAgent: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [voice, setVoice] = useState('alloy');
  const [introMessage, setIntroMessage] = useState("Hi! Thanks for calling Apex Digital. How can I help you today?");
  
  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState('Ready to call');

  const startSimulation = () => {
    setIsSimulating(true);
    setSimulationStatus('Connecting...');
    setTimeout(() => {
        setSimulationStatus('AI Agent: "Hello, this is the AI receptionist. How can I help?"');
    }, 1500);
  };

  const endSimulation = () => {
    setIsSimulating(false);
    setSimulationStatus('Call ended');
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
                      <button className="text-slate-400 hover:text-blue-900"><PlayCircle size={16} /></button>
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
                   {[
                     { from: '(415) 555-0123', time: '10m ago', duration: '2m 14s', status: 'missed' },
                     { from: '(212) 555-0988', time: '1h ago', duration: '5m 32s', status: 'completed' },
                     { from: '(310) 555-4422', time: '3h ago', duration: '1m 05s', status: 'completed' },
                   ].map((call, i) => (
                     <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                        <div>
                          <p className="font-medium text-slate-700">{call.from}</p>
                          <p className="text-xs text-slate-400">{call.time}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs capitalize ${call.status === 'missed' ? 'text-red-500' : 'text-emerald-500'}`}>{call.status}</p>
                          <p className="text-xs text-slate-400">{call.duration}</p>
                        </div>
                     </div>
                   ))}
                </div>
                <button className="w-full mt-4 text-xs text-blue-900 font-medium hover:underline">View Call Logs</button>
             </div>
          </div>
       </div>

       <div className="flex justify-end pt-4 border-t border-slate-200">
         <button className="px-6 py-2.5 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-950 shadow-sm transition flex items-center gap-2">
           <Save size={18} /> Save Agent Configuration
         </button>
       </div>
    </div>
  );
};