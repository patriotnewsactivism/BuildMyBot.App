import React, { useState, useEffect, useRef } from 'react';
import { Save, Play, FileText, Settings, Upload, Globe, Share2, Code, Bot as BotIcon, Shield, Users, RefreshCcw, Image as ImageIcon, X, Clock, Zap, Monitor, LayoutTemplate, Trash2, Plus } from 'lucide-react';
import { Bot as BotType } from '../../types';
import { generateBotResponse } from '../../services/geminiService';
import { AVAILABLE_MODELS } from '../../constants';

interface BotBuilderProps {
  bots: BotType[];
  onSave: (bot: BotType) => void;
  customDomain?: string;
  onLeadDetected?: (email: string) => void;
}

const HUMAN_NAMES = ['Sarah', 'Michael', 'Jessica', 'David', 'Emma', 'James', 'Emily', 'Robert'];
const AVATAR_COLORS = ['#1e3a8a', '#be123c', '#047857', '#d97706', '#7c3aed', '#db2777'];

export const BotBuilder: React.FC<BotBuilderProps> = ({ bots, onSave, customDomain, onLeadDetected }) => {
  const [selectedBotId, setSelectedBotId] = useState<string>(bots[0]?.id || 'new');
  const [activeBot, setActiveBot] = useState<BotType>(bots[0] || {
    id: 'new',
    name: 'New Assistant',
    type: 'Customer Support',
    systemPrompt: 'You are a helpful customer support assistant. Act like a human, be casual, and never repeat the exact same response twice. Do not reveal you are an AI.',
    model: 'gpt-4o-mini',
    temperature: 0.9,
    knowledgeBase: [],
    active: true,
    conversationsCount: 0,
    themeColor: '#1e3a8a',
    maxMessages: 20,
    randomizeIdentity: true,
    avatar: '',
    responseDelay: 2000
  });

  const [activeTab, setActiveTab] = useState<'config' | 'knowledge' | 'test' | 'embed'>('config');
  const [testInput, setTestInput] = useState('');
  const [testHistory, setTestHistory] = useState<{role: 'user'|'model', text: string, timestamp: number}[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  
  // Knowledge Base State
  const [kbInput, setKbInput] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Embed Config State
  const [embedConfig, setEmbedConfig] = useState({
    position: 'bottom-right',
    welcomeMessage: 'Hi there! How can I help you today?',
    buttonStyle: 'rounded-full'
  });
  
  // Random identity for preview
  const [previewIdentity, setPreviewIdentity] = useState({ name: 'Bot', color: '#1e3a8a' });

  // Determine domain for snippets: use custom domain setting if available, otherwise fallback to window location or default
  const displayDomain = customDomain || (typeof window !== 'undefined' ? window.location.host : 'buildmybot.app');

  useEffect(() => {
    if (activeBot.randomizeIdentity) {
      const randomName = HUMAN_NAMES[Math.floor(Math.random() * HUMAN_NAMES.length)];
      const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      setPreviewIdentity({ name: randomName, color: randomColor });
    } else {
      setPreviewIdentity({ name: activeBot.name, color: activeBot.themeColor });
    }
  }, [activeBot.randomizeIdentity, activeBot.name, activeBot.themeColor, selectedBotId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [testHistory, isTesting]);

  const handleAddKnowledge = () => {
    if (!kbInput.trim()) return;
    setActiveBot({
      ...activeBot,
      knowledgeBase: [...(activeBot.knowledgeBase || []), kbInput]
    });
    setKbInput('');
  };

  const removeKnowledge = (index: number) => {
    const newKb = [...(activeBot.knowledgeBase || [])];
    newKb.splice(index, 1);
    setActiveBot({
      ...activeBot,
      knowledgeBase: newKb
    });
  };

  const handleTestSend = async () => {
    if (!testInput.trim()) return;
    
    // Fail-safe check
    const isLimitReached = activeBot.maxMessages && testHistory.length >= (activeBot.maxMessages - 1);

    // Detect Email for Lead Capture
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const foundEmail = testInput.match(emailRegex);
    if (foundEmail && onLeadDetected) {
       onLeadDetected(foundEmail[0]);
    }

    const userMsg = { role: 'user' as const, text: testInput, timestamp: Date.now() };
    const newHistory = [...testHistory, userMsg];
    setTestHistory(newHistory);
    setTestInput('');
    setIsTesting(true);

    try {
      let systemPromptToUse = activeBot.systemPrompt;
      let userMessageToUse = userMsg.text;
      
      // Combine Knowledge Base
      const context = activeBot.knowledgeBase?.join('\n\n') || '';

      if (isLimitReached) {
        systemPromptToUse += " [SYSTEM INSTRUCTION: The conversation limit has been reached. Politely tell the user you have to go now (e.g., meeting, phone call, shift end), but ask them to please leave their email or phone number so a team member can contact them directly. Do not mention 'limit' or 'AI'. Just say you need to run.]";
      }

      // Start timing the response generation
      const startTime = Date.now();

      // Convert history for API (strip timestamps)
      const historyForApi = newHistory.map(h => ({ role: h.role, text: h.text }));
      const response = await generateBotResponse(
          systemPromptToUse, 
          historyForApi, 
          userMessageToUse, 
          activeBot.model,
          context // Pass knowledge base context
      );
      
      // Calculate remaining delay
      const generationTime = Date.now() - startTime;
      const configuredDelay = activeBot.responseDelay || 0;
      const remainingDelay = Math.max(0, configuredDelay - generationTime);

      // Wait for the remaining delay before showing the message
      setTimeout(() => {
        setTestHistory(prev => [...prev, { role: 'model', text: response, timestamp: Date.now() }]);
        setIsTesting(false);
      }, remainingDelay);

    } catch (e) {
      setTestHistory(prev => [...prev, { role: 'model', text: "Error generating response.", timestamp: Date.now() }]);
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
             {activeBot.avatar ? (
                <img src={activeBot.avatar} alt="Bot Avatar" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
             ) : (
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: activeBot.themeColor }}>
                   {activeBot.name.substring(0,2).toUpperCase()}
                </div>
             )}
             <div>
               <input 
                  type="text" 
                  value={activeBot.name} 
                  onChange={(e) => setActiveBot({...activeBot, name: e.target.value})}
                  className="font-bold text-lg text-slate-800 border-none focus:ring-0 p-0 hover:bg-slate-50 rounded"
                />
               <p className="text-xs text-slate-500 font-medium text-emerald-600 flex items-center gap-1">
                 <Zap size={10} /> Powered by OpenAI {AVAILABLE_MODELS.find(m => m.id === activeBot.model)?.name}
               </p>
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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BotIcon className="text-blue-900" size={20} />
                    <h4 className="font-bold text-slate-800">Bot Personality & Engine</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Model:</span>
                    <select 
                      value={activeBot.model}
                      onChange={(e) => setActiveBot({...activeBot, model: e.target.value})}
                      className="text-xs border-slate-200 bg-slate-50 rounded-lg py-1.5 pl-2 pr-8 font-medium text-slate-700 focus:ring-blue-900 cursor-pointer"
                    >
                      {AVAILABLE_MODELS.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-start gap-2">
                  <div className="mt-0.5 text-emerald-600"><Zap size={14} /></div>
                  <div>
                    <p className="text-xs font-bold text-emerald-900">Active Engine: {AVAILABLE_MODELS.find(m => m.id === activeBot.model)?.name}</p>
                    <p className="text-[10px] text-emerald-700">{AVAILABLE_MODELS.find(m => m.id === activeBot.model)?.description}</p>
                  </div>
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
                      <span>Precise</span>
                      <span>{activeBot.temperature}</span>
                      <span>Creative</span>
                    </div>
                 </div>

                 {/* Response Timing */}
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="text-blue-900" size={18} />
                      <h4 className="font-bold text-slate-800 text-sm">Artificial Latency</h4>
                    </div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Response Delay (ms)</label>
                    <p className="text-xs text-slate-500 mb-3">GPT-4o Mini is instant. We add a delay to make it feel like a human is typing.</p>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="0" max="5000" step="100"
                        value={activeBot.responseDelay || 2000}
                        onChange={(e) => setActiveBot({...activeBot, responseDelay: parseInt(e.target.value)})}
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-900"
                      />
                      <span className="text-sm font-bold text-slate-700 w-16 text-right">{activeBot.responseDelay || 2000}ms</span>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="max-w-md mx-auto h-full flex flex-col bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-blue-900 p-4 text-white flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center font-bold text-xs" style={{backgroundColor: previewIdentity.color}}>
                      {previewIdentity.name.substring(0,2)}
                    </div>
                    <div>
                      <span className="font-bold text-sm block">{previewIdentity.name}</span>
                      <span className="text-[10px] opacity-80 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Online
                      </span>
                    </div>
                  </div>
                  <button onClick={restartChat} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition">Reset</button>
                </div>
                
                <div className="flex-1 bg-slate-50 p-4 overflow-y-auto space-y-4" ref={scrollRef}>
                   {testHistory.length === 0 && (
                     <div className="text-center text-xs text-slate-400 mt-4">
                       This is a preview of your bot.<br/>Start chatting to test behavior.<br/><br/>
                       <span className="text-blue-500 bg-blue-50 px-2 py-1 rounded">Tip: Type an email to test lead capture!</span>
                     </div>
                   )}
                   {testHistory.map((msg, i) => (
                     <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                          msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none shadow-sm'
                        }`}>
                          {msg.text}
                        </div>
                     </div>
                   ))}
                   {isTesting && (
                     <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 px-3 py-2 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center">
                          <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></div>
                          <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                     </div>
                   )}
                </div>

                <div className="p-3 bg-white border-t border-slate-100">
                  <div className="relative">
                    <input 
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTestSend()}
                      placeholder="Type a message..."
                      className="w-full pl-3 pr-10 py-2 text-sm bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-0 rounded-lg"
                    />
                    <button 
                      onClick={handleTestSend}
                      disabled={!testInput.trim() || isTesting}
                      className="absolute right-1 top-1 p-1.5 text-blue-900 hover:bg-blue-50 rounded-md disabled:opacity-50"
                    >
                      <Play size={14} fill="currentColor" />
                    </button>
                  </div>
                  <div className="text-[10px] text-center text-slate-300 mt-2 flex items-center justify-center gap-1">
                     <Zap size={8} /> Powered by {AVAILABLE_MODELS.find(m => m.id === activeBot.model)?.name || 'AI'}
                  </div>
                </div>
            </div>
          )}

          {activeTab === 'embed' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                       <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                         <LayoutTemplate size={18} className="text-blue-900" /> Widget Configuration
                       </h4>
                       
                       <div className="space-y-4">
                          <div>
                             <label className="block text-sm font-medium text-slate-700 mb-2">Greeting Message</label>
                             <input 
                               type="text"
                               value={embedConfig.welcomeMessage}
                               onChange={(e) => setEmbedConfig({...embedConfig, welcomeMessage: e.target.value})}
                               className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 text-sm"
                             />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Position</label>
                                <select 
                                  value={embedConfig.position}
                                  onChange={(e) => setEmbedConfig({...embedConfig, position: e.target.value})}
                                  className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 text-sm"
                                >
                                  <option value="bottom-right">Bottom Right</option>
                                  <option value="bottom-left">Bottom Left</option>
                                </select>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Launcher Style</label>
                                <select 
                                  value={embedConfig.buttonStyle}
                                  onChange={(e) => setEmbedConfig({...embedConfig, buttonStyle: e.target.value})}
                                  className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 text-sm"
                                >
                                  <option value="rounded-full">Circle</option>
                                  <option value="rounded-xl">Square</option>
                                </select>
                             </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Brand Color</label>
                            <div className="flex gap-2">
                               {AVATAR_COLORS.map(c => (
                                 <button
                                   key={c}
                                   onClick={() => setActiveBot({...activeBot, themeColor: c})}
                                   className={`w-8 h-8 rounded-full border-2 transition ${activeBot.themeColor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                                   style={{backgroundColor: c}}
                                 />
                               ))}
                            </div>
                          </div>
                       </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-blue-900 text-sm flex items-start gap-3">
                       <Globe className="shrink-0 mt-0.5" size={18} />
                       <div>
                         <p className="font-bold">White-Label Domain Active</p>
                         <p>This code is optimized for <strong>{displayDomain}</strong>. Ensure your Vercel DNS settings are configured correctly to serve the script.</p>
                       </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-xl p-6 text-slate-300 font-mono text-sm relative group h-full">
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button className="text-slate-500 hover:text-white" title="Copy Code"><Share2 size={16} /></button>
                      </div>
                      <p className="text-green-400 mb-2">&lt;!-- BuildMyBot Embed Code --&gt;</p>
                      <div className="whitespace-pre-wrap break-all leading-relaxed">
{`<script>
  window.bmbConfig = {
    botId: "${activeBot.id}",
    theme: "${activeBot.themeColor}",
    domain: "${displayDomain}",
    position: "${embedConfig.position}",
    greeting: "${embedConfig.welcomeMessage}",
    launcher: "${embedConfig.buttonStyle}"
  };
</script>
<script src="https://${displayDomain}/embed.js" async></script>`}
                      </div>
                    </div>
                </div>
             </div>
          )}

          {activeTab === 'knowledge' && (
             <div className="max-w-3xl space-y-6">
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="text-blue-900" size={20} />
                      <h4 className="font-bold text-slate-800">Knowledge Base & Training</h4>
                    </div>
                    
                    <div className="space-y-4">
                       <div>
                         <label className="block text-sm font-medium text-slate-700 mb-2">Add Content</label>
                         <div className="flex gap-2">
                           <textarea 
                             value={kbInput}
                             onChange={(e) => setKbInput(e.target.value)}
                             placeholder="Paste your FAQ, product details, or pricing here..."
                             className="flex-1 h-24 rounded-lg border-slate-200 text-sm focus:ring-blue-900 focus:border-blue-900 p-3"
                           />
                           <button 
                             onClick={handleAddKnowledge}
                             disabled={!kbInput.trim()}
                             className="px-4 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition"
                           >
                             <Plus size={20} />
                           </button>
                         </div>
                       </div>
                       
                       <div className="bg-slate-50 rounded-lg p-4">
                         <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">Trained Knowledge ({activeBot.knowledgeBase?.length || 0} items)</h5>
                         {activeBot.knowledgeBase && activeBot.knowledgeBase.length > 0 ? (
                           <ul className="space-y-2">
                             {activeBot.knowledgeBase.map((item, idx) => (
                               <li key={idx} className="flex justify-between items-start bg-white p-2 rounded border border-slate-200 text-sm">
                                  <p className="text-slate-600 line-clamp-1 flex-1">{item}</p>
                                  <button onClick={() => removeKnowledge(idx)} className="text-slate-400 hover:text-red-500 ml-2">
                                    <Trash2 size={14} />
                                  </button>
                               </li>
                             ))}
                           </ul>
                         ) : (
                           <p className="text-center text-sm text-slate-400 italic py-2">No knowledge added yet. The bot will rely on general AI knowledge.</p>
                         )}
                       </div>
                       
                       <div className="border-t border-slate-100 pt-4 mt-4">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Upload Documents</label>
                          <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 transition cursor-pointer">
                            <Upload size={32} className="mb-2 opacity-50" />
                            <p className="text-xs">Drag and drop PDF, TXT, or CSV files here.</p>
                          </div>
                       </div>
                    </div>
                 </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};