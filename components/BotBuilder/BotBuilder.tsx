import React, { useState, useEffect } from 'react';
import { Save, Play, FileText, Settings, Upload, Globe, Share2, Code, Bot as BotIcon, Shield, Users, RefreshCcw } from 'lucide-react';
import { Bot } from '../../types';
import { generateBotResponse } from '../../services/geminiService';

interface BotBuilderProps {
  bots: Bot[];
  onSave: (bot: Bot) => void;
}

const HUMAN_NAMES = ['Sarah', 'Michael', 'Jessica', 'David', 'Emma', 'James', 'Emily', 'Robert'];
const AVATAR_COLORS = ['#1e3a8a', '#be123c', '#047857', '#d97706', '#7c3aed', '#db2777'];

export const BotBuilder: React.FC<BotBuilderProps> = ({ bots, onSave }) => {
  const [selectedBotId, setSelectedBotId] = useState<string>(bots[0]?.id || 'new');
  const [activeBot, setActiveBot] = useState<Bot>(bots[0] || {
    id: 'new',
    name: 'New Assistant',
    type: 'Customer Support',
    systemPrompt: 'You are a helpful customer support assistant. Act like a human, be casual, and never repeat the exact same response twice. Do not reveal you are an AI.',
    model: 'gemini-2.5-flash',
    temperature: 0.9,
    knowledgeBase: [],
    active: true,
    conversationsCount: 0,
    themeColor: '#1e3a8a',
    maxMessages: 20,
    randomizeIdentity: true
  });

  const [activeTab, setActiveTab] = useState<'config' | 'knowledge' | 'test' | 'embed'>('config');
  const [testInput, setTestInput] = useState('');
  const [testHistory, setTestHistory] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  
  // Random identity for preview
  const [previewIdentity, setPreviewIdentity] = useState({ name: 'Bot', color: '#1e3a8a' });

  useEffect(() => {
    if (activeBot.randomizeIdentity) {
      const randomName = HUMAN_NAMES[Math.floor(Math.random() * HUMAN_NAMES.length)];
      const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      setPreviewIdentity({ name: randomName, color: randomColor });
    } else {
      setPreviewIdentity({ name: activeBot.name, color: activeBot.themeColor });
    }
  }, [activeBot.randomizeIdentity, activeBot.name, activeBot.themeColor, selectedBotId]); // Re-roll when bot selection changes

  const handleTestSend = async () => {
    if (!testInput.trim()) return;
    
    // Fail-safe check
    const isLimitReached = activeBot.maxMessages && testHistory.length >= (activeBot.maxMessages - 1); // -1 to allow the wrap up msg

    const userMsg = { role: 'user' as const, text: testInput };
    const newHistory = [...testHistory, userMsg];
    setTestHistory(newHistory);
    setTestInput('');
    setIsTesting(true);

    try {
      let systemPromptToUse = activeBot.systemPrompt;
      let userMessageToUse = userMsg.text;

      if (isLimitReached) {
        // Inject a system instruction to wrap up the conversation smoothly
        systemPromptToUse += " [SYSTEM INSTRUCTION: The conversation limit has been reached. Politely tell the user you have to go now, but ask them to please leave their email or phone number so a team member can contact them directly. Do not mention 'limit' or 'AI'. Just say you need to run.]";
      }

      const response = await generateBotResponse(systemPromptToUse, testHistory, userMessageToUse);
      setTestHistory([...newHistory, { role: 'model', text: response }]);
    } catch (e) {
      setTestHistory([...newHistory, { role: 'model', text: "Error generating response." }]);
    } finally {
      setIsTesting(false);
    }
  };

  const restartChat = () => {
    setTestHistory([]);
    if (activeBot.randomizeIdentity) {
      const randomName = HUMAN_NAMES[Math.floor(Math.random() * HUMAN_NAMES.length)];
      const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      setPreviewIdentity({ name: randomName, color: randomColor });
    }
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-6">
      {/* Bot List Side */}
      <div className="w-64 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-700">My Bots</h3>
          <button className="text-xs bg-blue-900 text-white px-2 py-1 rounded hover:bg-blue-950 transition">
            + New
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {bots.map(bot => (
            <button
              key={bot.id}
              onClick={() => { setSelectedBotId(bot.id); setActiveBot(bot); setTestHistory([]); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                selectedBotId === bot.id ? 'bg-blue-50 text-blue-900 border border-blue-100' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {bot.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="h-16 border-b border-slate-100 px-6 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: activeBot.themeColor }}>
               {activeBot.name.substring(0,2).toUpperCase()}
             </div>
             <div>
               <input 
                  type="text" 
                  value={activeBot.name} 
                  onChange={(e) => setActiveBot({...activeBot, name: e.target.value})}
                  className="font-bold text-lg text-slate-800 border-none focus:ring-0 p-0 hover:bg-slate-50 rounded"
                />
               <p className="text-xs text-slate-500">{activeBot.model}</p>
             </div>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition">
              <Share2 size={16} /> Share
            </button>
            <button 
              onClick={() => onSave(activeBot)}
              className="flex items-center gap-2 px-6 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-950 transition shadow-sm shadow-blue-200">
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-100 px-6 flex gap-6">
           {['config', 'knowledge', 'test', 'embed'].map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab as any)}
               className={`py-4 text-sm font-medium border-b-2 transition ${
                 activeTab === tab 
                 ? 'border-blue-900 text-blue-900' 
                 : 'border-transparent text-slate-500 hover:text-slate-700'
               }`}
             >
               {tab.charAt(0).toUpperCase() + tab.slice(1)}
             </button>
           ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {activeTab === 'config' && (
            <div className="max-w-3xl space-y-6">
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <BotIcon className="text-blue-900" size={20} />
                  <h4 className="font-bold text-slate-800">Bot Personality & Logic</h4>
                </div>
                <label className="block text-sm font-medium text-slate-700 mb-2">System Instructions</label>
                <p className="text-xs text-slate-500 mb-3">Define how your bot behaves. We recommend instructing it to act like a human and vary its responses to maintain a natural conversation flow.</p>
                <textarea 
                  value={activeBot.systemPrompt}
                  onChange={(e) => setActiveBot({...activeBot, systemPrompt: e.target.value})}
                  className="w-full h-40 rounded-lg border-slate-200 text-sm focus:ring-blue-900 focus:border-blue-900 font-mono text-slate-600 bg-slate-50 p-4"
                  placeholder="You are a helpful assistant..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                 {/* Safety Limits */}
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="text-blue-900" size={18} />
                      <h4 className="font-bold text-slate-800 text-sm">Conversation Limits (Fail-safe)</h4>
                    </div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Max Messages per Chat</label>
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-xs text-slate-500 leading-tight block w-3/4">Prevent infinite loops. Bot will politely end chat when reached.</span>
                       <span className="text-sm font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">{activeBot.maxMessages || 20}</span>
                    </div>
                    <input 
                      type="range" 
                      min="5" max="50" step="1"
                      value={activeBot.maxMessages || 20}
                      onChange={(e) => setActiveBot({...activeBot, maxMessages: parseInt(e.target.value)})}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-900"
                    />
                 </div>

                 {/* Human Behavior */}
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="text-blue-900" size={18} />
                      <h4 className="font-bold text-slate-800 text-sm">Human Simulation</h4>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                       <div>
                         <label className="block text-sm font-medium text-slate-700">Randomize Identity</label>
                         <p className="text-[10px] text-slate-500">Bot appears with different names/avatars to new visitors.</p>
                       </div>
                       <button 
                         onClick={() => setActiveBot({...activeBot, randomizeIdentity: !activeBot.randomizeIdentity})}
                         className={`w-10 h-5 rounded-full transition-colors relative ${activeBot.randomizeIdentity ? 'bg-blue-900' : 'bg-slate-300'}`}
                       >
                         <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${activeBot.randomizeIdentity ? 'left-6' : 'left-1'}`}></div>
                       </button>
                    </div>

                    <label className="block text-sm font-medium text-slate-700 mb-2">Creativity (Temperature)</label>
                    <input 
                      type="range" 
                      min="0" max="1" step="0.1"
                      value={activeBot.temperature}
                      onChange={(e) => setActiveBot({...activeBot, temperature: parseFloat(e.target.value)})}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-900"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                      <span>Robotic</span>
                      <span>{activeBot.temperature}</span>
                      <span>Human-like</span>
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Default Theme Color</label>
                    <div className="flex gap-3">
                      {['#1e3a8a', '#1e40af', '#0f172a', '#334155', '#475569', '#0891b2', '#0369a1', '#be123c'].map(c => (
                        <button 
                          key={c}
                          onClick={() => setActiveBot({...activeBot, themeColor: c})}
                          className={`w-10 h-10 rounded-full shadow-sm border-2 transition ${activeBot.themeColor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="max-w-3xl">
               <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-blue-50 text-blue-900 rounded-full flex items-center justify-center mb-4">
                    <Upload size={24} />
                  </div>
                  <h4 className="text-lg font-medium text-slate-800">Upload Training Data</h4>
                  <p className="text-sm text-slate-500 max-w-sm mt-1 mb-6">Drag and drop PDF, DOCX, or TXT files here to train your bot on specific business knowledge.</p>
                  <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition">
                    Select Files
                  </button>
               </div>
               
               <div className="mt-6">
                 <h4 className="text-sm font-semibold text-slate-800 mb-3">Website Crawling</h4>
                 <div className="flex gap-2">
                   <div className="flex-1 relative">
                     <Globe className="absolute left-3 top-3 text-slate-400" size={16} />
                     <input type="text" placeholder="https://yourbusiness.com" className="w-full pl-10 pr-4 py-2 rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900" />
                   </div>
                   <button className="px-4 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-950">Fetch</button>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="flex h-full flex-col bg-white rounded-xl border border-slate-200 overflow-hidden max-w-2xl mx-auto shadow-sm">
               <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: previewIdentity.color }}>
                      {previewIdentity.name.substring(0,2)}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-800 block">{previewIdentity.name}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-xs text-slate-500 font-medium">Online</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={restartChat} className="p-2 hover:bg-slate-200 rounded-full text-slate-500" title="Restart Chat">
                    <RefreshCcw size={16} />
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {testHistory.length === 0 && (
                    <div className="text-center mt-20 text-slate-400">
                      <BotIcon size={48} className="mx-auto mb-2 opacity-20" />
                      <p>Start a conversation to test.</p>
                      {activeBot.randomizeIdentity && <p className="text-xs mt-1">(Identity randomized)</p>}
                    </div>
                  )}
                  {testHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-blue-900 text-white rounded-br-none' 
                        : 'bg-slate-100 text-slate-700 rounded-bl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isTesting && (
                    <div className="flex justify-start">
                       <div className="bg-slate-100 rounded-2xl px-4 py-2.5 text-sm text-slate-500 italic">Typing...</div>
                    </div>
                  )}
               </div>
               <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
                 <input 
                   type="text" 
                   value={testInput}
                   onChange={(e) => setTestInput(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleTestSend()}
                   placeholder="Type a message..." 
                   className="flex-1 rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 text-sm"
                  />
                 <button 
                  onClick={handleTestSend}
                  disabled={isTesting}
                  className="bg-blue-900 text-white p-2 rounded-lg hover:bg-blue-950 disabled:opacity-50 transition">
                   <Play size={18} fill="currentColor" />
                 </button>
               </div>
            </div>
          )}

          {activeTab === 'embed' && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-900"><Code size={20} /></div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Javascript Snippet</h3>
                    <p className="text-xs text-slate-500">Copy and paste this into your website's &lt;body&gt; tag.</p>
                  </div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 relative group">
                  <p>{`<script src="https://cdn.buildmybot.app/widget.js" data-id="${activeBot.id}"></script>`}</p>
                  <button className="absolute top-2 right-2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-[10px] transition">Copy</button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-1 bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-900 cursor-pointer transition border-blue-900 ring-1 ring-blue-900">
                  <div className="h-24 bg-slate-50 rounded mb-3 flex items-end justify-end p-2">
                    <div className="w-8 h-8 rounded-full bg-blue-900"></div>
                  </div>
                  <p className="font-medium text-center text-sm">Bubble Widget</p>
                </div>
                <div className="col-span-1 bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-900 cursor-pointer transition">
                  <div className="h-24 bg-slate-50 rounded mb-3 flex items-center justify-center p-2">
                    <div className="w-24 h-16 bg-white border border-slate-200 rounded shadow-sm"></div>
                  </div>
                  <p className="font-medium text-center text-sm">Embedded Box</p>
                </div>
                <div className="col-span-1 bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-900 cursor-pointer transition">
                  <div className="h-24 bg-slate-50 rounded mb-3 flex items-center justify-center p-2">
                    <div className="w-full h-full bg-white border border-slate-200 rounded"></div>
                  </div>
                  <p className="font-medium text-center text-sm">Full Page</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};