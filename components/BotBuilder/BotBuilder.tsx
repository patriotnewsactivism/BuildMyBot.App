import React, { useState, useEffect, useRef } from 'react';
import { Save, Play, FileText, Settings, Upload, Globe, Share2, Code, Bot as BotIcon, Shield, Users, RefreshCcw, Image as ImageIcon, X, Clock, Zap, Monitor, LayoutTemplate, Trash2, Plus, Sparkles, Link, ExternalLink, Linkedin, Facebook, Twitter, ArrowRight } from 'lucide-react';
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

const PERSONAS = [
  { id: 'support', name: 'Customer Support Agent', prompt: 'You are a helpful customer support agent for {company}. Be polite, patient, and concise. Your goal is to resolve issues quickly. If you do not know the answer, ask for their contact info.' },
  { id: 'sales', name: 'Sales Representative', prompt: 'You are a top-performing sales representative for {company}. Your goal is to qualify leads and close deals. Be persuasive but not pushy. Focus on value and benefits. Always try to get a meeting booked.' },
  { id: 'receptionist', name: 'AI Receptionist', prompt: 'You are the front desk receptionist for {company}. Be warm and welcoming. Help schedule appointments and route calls. Keep responses short and professional.' },
  { id: 'hr', name: 'HR Assistant', prompt: 'You are a Human Resources assistant. Answer employee questions about benefits, holidays, and company policy. Maintain strict confidentiality and professionalism.' },
  { id: 'tech', name: 'Technical Support', prompt: 'You are a Tier 1 Technical Support agent. Walk users through troubleshooting steps logically. Ask clarifying questions to diagnose the issue.' },
];

export const BotBuilder: React.FC<BotBuilderProps> = ({ bots, onSave, customDomain, onLeadDetected }) => {
  const [selectedBotId, setSelectedBotId] = useState<string>(bots[0]?.id || 'new');
  const [activeBot, setActiveBot] = useState<BotType>(bots[0] || {
    id: `b${Date.now()}`,
    name: 'New Assistant',
    type: 'Customer Support',
    systemPrompt: 'You are a helpful customer support assistant.',
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

  // Sync active bot if bots list updates (from Firestore)
  useEffect(() => {
     if (selectedBotId !== 'new') {
        const found = bots.find(b => b.id === selectedBotId);
        if (found) setActiveBot(found);
     }
  }, [bots, selectedBotId]);

  const [activeTab, setActiveTab] = useState<'config' | 'knowledge' | 'test' | 'embed'>('config');
  const [testInput, setTestInput] = useState('');
  const [testHistory, setTestHistory] = useState<{role: 'user'|'model', text: string, timestamp: number}[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  
  const [kbInput, setKbInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [embedConfig, setEmbedConfig] = useState({
    position: 'bottom-right',
    welcomeMessage: 'Hi there! How can I help you today?',
    buttonStyle: 'rounded-full'
  });
  
  const [previewIdentity, setPreviewIdentity] = useState({ name: 'Bot', color: '#1e3a8a' });

  const displayDomain = customDomain || (typeof window !== 'undefined' ? window.location.host : 'buildmybot.app');
  const shareLink = `${window.location.protocol}//${displayDomain}/chat/${activeBot.id}`;

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

  const handleBotSelect = (bot: BotType) => {
      setSelectedBotId(bot.id);
      setActiveBot(bot);
      setTestHistory([]);
  };

  const handleCreateNew = () => {
      const newBot = {
        id: `b${Date.now()}`,
        name: 'New Assistant',
        type: 'Customer Support' as const,
        systemPrompt: 'You are a helpful customer support assistant.',
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
      };
      setActiveBot(newBot);
      setSelectedBotId('new');
      setTestHistory([]);
  };

  const handleSaveBot = async () => {
      onSave(activeBot);
      if (selectedBotId === 'new') {
         setSelectedBotId(activeBot.id);
      }
  };

  const handleApplyPersona = (personaId: string) => {
    const persona = PERSONAS.find(p => p.id === personaId);
    if (persona) {
      setActiveBot({
        ...activeBot,
        systemPrompt: persona.prompt.replace('{company}', 'our company'),
        type: persona.name as any
      });
    }
  };

  const handleAddKnowledge = () => {
    if (!kbInput.trim()) return;
    setActiveBot({
      ...activeBot,
      knowledgeBase: [...(activeBot.knowledgeBase || []), kbInput]
    });
    setKbInput('');
  };

  const handleScrapeUrl = () => {
    if (!urlInput.trim()) return;
    setIsScraping(true);
    setTimeout(() => {
      const simulatedContent = `Scraped content from ${urlInput}: \n- We are open 9am-5pm Mon-Fri.\n- Support email is help@example.com.\n- Our product costs $29/mo.`;
      setActiveBot({
         ...activeBot,
         knowledgeBase: [...(activeBot.knowledgeBase || []), simulatedContent]
      });
      setIsScraping(false);
      setUrlInput('');
    }, 2000);
  };

  const handleTestSend = async () => {
    if (!testInput.trim()) return;

    // Email Detection Logic
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const extractedEmails = testInput.match(emailRegex);
    if (extractedEmails && onLeadDetected) {
        extractedEmails.forEach(email => onLeadDetected(email));
    }

    const userMsg = { role: 'user' as const, text: testInput, timestamp: Date.now() };
    setTestHistory(prev => [...prev, userMsg]);
    setTestInput('');
    setIsTesting(true);

    try {
        const kbContext = activeBot.knowledgeBase?.join('\n\n') || '';
        const responseText = await generateBotResponse(
            activeBot.systemPrompt, 
            testHistory, 
            userMsg.text, 
            activeBot.model,
            kbContext
        );

        setTimeout(() => {
            setTestHistory(prev => [...prev, { role: 'model', text: responseText, timestamp: Date.now() }]);
            setIsTesting(false);
        }, activeBot.responseDelay || 1500);

    } catch (e) {
        setIsTesting(false);
        setTestHistory(prev => [...prev, { role: 'model', text: "Error connecting to AI.", timestamp: Date.now() }]);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 animate-fade-in">
       {/* Sidebar List */}
       <div className="w-64 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
             <h3 className="font-semibold text-slate-800">Your Bots</h3>
             <button onClick={handleCreateNew} className="p-1 hover:bg-slate-200 rounded text-slate-600 transition"><Plus size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
             {bots.map(bot => (
               <button
                 key={bot.id}
                 onClick={() => handleBotSelect(bot)}
                 className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                   selectedBotId === bot.id ? 'bg-blue-50 text-blue-900 border border-blue-100' : 'text-slate-600 hover:bg-slate-50'
                 }`}
               >
                 <div className="w-2 h-2 rounded-full" style={{backgroundColor: bot.themeColor}}></div>
                 <span className="truncate">{bot.name}</span>
               </button>
             ))}
             {selectedBotId === 'new' && (
                <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-900 border border-blue-100 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                   <span className="truncate italic">Draft Bot...</span>
                </button>
             )}
          </div>
       </div>

       {/* Main Config Area */}
       <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-16 border-b border-slate-100 px-6 flex items-center justify-between bg-white">
             <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-900 font-bold text-lg">
                 {activeBot.name.charAt(0)}
               </div>
               <div>
                  <input 
                    type="text" 
                    value={activeBot.name}
                    onChange={(e) => setActiveBot({...activeBot, name: e.target.value})}
                    className="font-bold text-slate-800 text-lg border-none focus:ring-0 p-0 hover:bg-slate-50 rounded px-1 transition w-48"
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                     <span className={`w-2 h-2 rounded-full ${activeBot.active ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                     {activeBot.active ? 'Active' : 'Inactive'} • {activeBot.model}
                  </div>
               </div>
             </div>
             
             <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setActiveTab('config')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === 'config' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Config</button>
                <button onClick={() => setActiveTab('knowledge')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === 'knowledge' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Knowledge</button>
                <button onClick={() => setActiveTab('embed')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === 'embed' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Connect</button>
                <button onClick={() => setActiveTab('test')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === 'test' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Preview</button>
             </div>

             <button 
               onClick={handleSaveBot}
               className="flex items-center gap-2 px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 font-medium transition shadow-sm"
             >
               <Save size={18} /> Save
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
             {/* CONFIG TAB */}
             {activeTab === 'config' && (
                <div className="max-w-3xl mx-auto space-y-6">
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                         <div className="p-2 bg-blue-50 text-blue-900 rounded-lg"><Sparkles size={18}/></div>
                         <h3 className="font-bold text-slate-800">AI Persona & Role</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                        {PERSONAS.map(p => (
                          <button 
                            key={p.id}
                            onClick={() => handleApplyPersona(p.id)}
                            className={`p-3 border rounded-lg text-left text-xs transition hover:shadow-sm ${activeBot.type === p.name ? 'border-blue-900 bg-blue-50 ring-1 ring-blue-900' : 'border-slate-200 bg-white hover:border-blue-300'}`}
                          >
                             <div className="font-bold text-slate-800 mb-1">{p.name}</div>
                             <div className="text-slate-500 line-clamp-2">{p.prompt.substring(0, 50)}...</div>
                          </button>
                        ))}
                      </div>

                      <div className="space-y-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">System Instructions</label>
                            <textarea 
                              value={activeBot.systemPrompt}
                              onChange={(e) => setActiveBot({...activeBot, systemPrompt: e.target.value})}
                              className="w-full h-32 rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 p-3 text-sm"
                            />
                            <p className="text-xs text-slate-500 mt-1">These are the core rules your bot will follow.</p>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-6">
                            <div>
                               <label className="block text-sm font-medium text-slate-700 mb-2">AI Model</label>
                               <select 
                                 value={activeBot.model}
                                 onChange={(e) => setActiveBot({...activeBot, model: e.target.value})}
                                 className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                               >
                                 {AVAILABLE_MODELS.map(m => (
                                   <option key={m.id} value={m.id}>{m.name}</option>
                                 ))}
                               </select>
                            </div>
                            <div>
                               <label className="block text-sm font-medium text-slate-700 mb-2">Creativity (Temperature)</label>
                               <input 
                                 type="range" 
                                 min="0" max="1" step="0.1"
                                 value={activeBot.temperature}
                                 onChange={(e) => setActiveBot({...activeBot, temperature: parseFloat(e.target.value)})}
                                 className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-900 mt-2"
                               />
                               <div className="flex justify-between text-xs text-slate-500 mt-1">
                                 <span>Precise</span>
                                 <span>{activeBot.temperature}</span>
                                 <span>Creative</span>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                         <div className="p-2 bg-purple-50 text-purple-900 rounded-lg"><Settings size={18}/></div>
                         <h3 className="font-bold text-slate-800">Behavior & Appearance</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Typing Speed Delay</label>
                            <div className="flex items-center gap-4">
                               <input 
                                 type="range" 
                                 min="0" max="5000" step="100"
                                 value={activeBot.responseDelay || 2000}
                                 onChange={(e) => setActiveBot({...activeBot, responseDelay: parseInt(e.target.value)})}
                                 className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-700"
                               />
                               <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded w-16 text-center">{(activeBot.responseDelay || 2000)/1000}s</span>
                            </div>
                         </div>
                         <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                            <div>
                               <span className="block text-sm font-medium text-slate-800">Human-Like Identity</span>
                               <span className="text-xs text-slate-500">Randomize name/avatar per session</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                               <input 
                                 type="checkbox" 
                                 checked={activeBot.randomizeIdentity}
                                 onChange={(e) => setActiveBot({...activeBot, randomizeIdentity: e.target.checked})}
                                 className="sr-only peer" 
                               />
                               <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-700"></div>
                            </label>
                         </div>
                      </div>
                   </div>
                </div>
             )}
             
             {/* KNOWLEDGE TAB */}
             {activeTab === 'knowledge' && (
                <div className="max-w-3xl mx-auto space-y-6">
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                         <div className="p-2 bg-emerald-50 text-emerald-900 rounded-lg"><FileText size={18}/></div>
                         <h3 className="font-bold text-slate-800">Business Knowledge Base</h3>
                      </div>
                      <p className="text-sm text-slate-600 mb-6">
                         Add text, links, or documents so your bot knows specific details about your business (hours, pricing, policies).
                      </p>

                      <div className="space-y-6">
                         <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                              placeholder="https://yourwebsite.com/faq"
                              className="flex-1 rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                            />
                            <button 
                              onClick={handleScrapeUrl}
                              disabled={isScraping}
                              className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 flex items-center gap-2"
                            >
                               {isScraping ? <RefreshCcw size={16} className="animate-spin" /> : <Globe size={16} />} 
                               Train from URL
                            </button>
                         </div>

                         <div>
                            <textarea 
                              value={kbInput}
                              onChange={(e) => setKbInput(e.target.value)}
                              placeholder="Paste text directly here (e.g., Return Policy: 30 days...)"
                              className="w-full h-24 rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 p-3 text-sm"
                            />
                            <div className="flex justify-end mt-2">
                               <button 
                                 onClick={handleAddKnowledge}
                                 className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-sm"
                               >
                                  <Plus size={16} /> Add Text Segment
                               </button>
                            </div>
                         </div>
                      </div>
                      
                      {/* List */}
                      <div className="mt-8 space-y-3">
                         <h4 className="font-semibold text-slate-800 text-sm">Active Knowledge Sources</h4>
                         {activeBot.knowledgeBase.length === 0 && (
                            <div className="p-4 bg-slate-50 rounded-lg text-center text-sm text-slate-400 border border-slate-100 border-dashed">
                               No knowledge added yet. The bot will use general AI knowledge.
                            </div>
                         )}
                         {activeBot.knowledgeBase.map((item, i) => (
                            <div key={i} className="flex justify-between items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
                               <div className="flex items-start gap-3">
                                  <FileText size={16} className="text-slate-400 mt-0.5" />
                                  <p className="text-xs text-slate-600 line-clamp-2 w-96">{item}</p>
                               </div>
                               <button 
                                 onClick={() => {
                                    const newKb = [...activeBot.knowledgeBase];
                                    newKb.splice(i, 1);
                                    setActiveBot({...activeBot, knowledgeBase: newKb});
                                 }}
                                 className="text-slate-400 hover:text-red-500"
                               >
                                  <Trash2 size={14} />
                               </button>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
             )}

             {/* EMBED & SHARE TAB */}
             {activeTab === 'embed' && (
                <div className="max-w-3xl mx-auto space-y-6">
                   {/* Public Link Section */}
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                         <div className="p-2 bg-blue-50 text-blue-900 rounded-lg"><Share2 size={18}/></div>
                         <h3 className="font-bold text-slate-800">Share Public Link</h3>
                      </div>
                      <p className="text-sm text-slate-600 mb-4">
                         Send this link to clients via SMS or Email. It opens a full-page chat experience.
                      </p>
                      
                      <div className="flex gap-2 mb-6">
                         <div className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-600 font-mono truncate">
                            {shareLink}
                         </div>
                         <button onClick={() => window.open(shareLink, '_blank')} className="px-4 py-2 bg-blue-100 text-blue-900 rounded-lg font-medium hover:bg-blue-200 flex items-center gap-2">
                            <ExternalLink size={16} /> Open
                         </button>
                      </div>

                      <div className="flex gap-4">
                         <button className="flex-1 py-2 rounded-lg bg-[#0077b5] text-white text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2">
                            <Linkedin size={16} /> Share on LinkedIn
                         </button>
                         <button className="flex-1 py-2 rounded-lg bg-[#1da1f2] text-white text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2">
                            <Twitter size={16} /> Share on X
                         </button>
                         <button className="flex-1 py-2 rounded-lg bg-[#1877f2] text-white text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2">
                            <Facebook size={16} /> Share on Facebook
                         </button>
                      </div>
                   </div>

                   {/* Widget Config */}
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-6">
                         <div className="p-2 bg-orange-50 text-orange-900 rounded-lg"><Code size={18}/></div>
                         <h3 className="font-bold text-slate-800">Website Widget Embed</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-6 mb-6">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Position</label>
                            <select 
                              value={embedConfig.position}
                              onChange={(e) => setEmbedConfig({...embedConfig, position: e.target.value})}
                              className="w-full rounded-lg border-slate-200 text-sm"
                            >
                               <option value="bottom-right">Bottom Right</option>
                               <option value="bottom-left">Bottom Left</option>
                            </select>
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Greeting Message</label>
                            <input 
                              type="text" 
                              value={embedConfig.welcomeMessage}
                              onChange={(e) => setEmbedConfig({...embedConfig, welcomeMessage: e.target.value})}
                              className="w-full rounded-lg border-slate-200 text-sm"
                            />
                         </div>
                      </div>
                      
                      <div className="bg-slate-900 rounded-xl p-4 relative group">
                         <button className="absolute top-2 right-2 text-slate-400 hover:text-white"><Share2 size={16}/></button>
                         <pre className="text-xs text-blue-300 font-mono overflow-x-auto p-2">
{`<script>
  window.bmbConfig = {
    botId: "${activeBot.id}",
    theme: "${activeBot.themeColor}",
    position: "${embedConfig.position}",
    greeting: "${embedConfig.welcomeMessage}"
  };
</script>
<script src="https://${displayDomain}/embed.js" async></script>`}
                         </pre>
                      </div>
                   </div>
                </div>
             )}

             {/* PREVIEW TAB */}
             {activeTab === 'test' && (
                <div className="flex h-full flex-col max-w-lg mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                   {/* Header */}
                   <div className="bg-blue-900 p-4 flex items-center gap-3 text-white shadow-sm">
                      <div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center text-sm font-bold bg-white/10">
                        {previewIdentity.name.substring(0,2)}
                      </div>
                      <div>
                         <div className="font-bold">{previewIdentity.name}</div>
                         <div className="text-xs text-blue-200 flex items-center gap-1">
                           <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Online
                         </div>
                      </div>
                   </div>

                   {/* Chat Area */}
                   <div className="flex-1 bg-slate-50 p-4 overflow-y-auto space-y-4" ref={scrollRef}>
                      <div className="text-center text-xs text-slate-400 my-2 font-medium uppercase tracking-wider">Today</div>
                      {testHistory.length === 0 && (
                         <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-xl text-center">
                            This is a preview of <strong>{activeBot.name}</strong>.<br/>
                            Type a message to test its responses.
                         </div>
                      )}
                      {testHistory.map((msg, i) => (
                         <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                               msg.role === 'user' 
                               ? 'bg-blue-600 text-white rounded-br-sm' 
                               : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm'
                            }`}>
                               {msg.text}
                            </div>
                         </div>
                      ))}
                      {isTesting && (
                         <div className="flex justify-start">
                             <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex gap-1 items-center">
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                             </div>
                         </div>
                      )}
                   </div>

                   {/* Input Area */}
                   <div className="p-3 bg-white border-t border-slate-100">
                      <div className="relative">
                         <input 
                           type="text" 
                           value={testInput}
                           onChange={(e) => setTestInput(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleTestSend()}
                           placeholder="Type a message..." 
                           className="w-full pl-4 pr-10 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-900 focus:ring-0 rounded-xl text-sm transition-all"
                         />
                         <button 
                           onClick={handleTestSend}
                           disabled={!testInput.trim() || isTesting}
                           className="absolute right-2 top-2 p-1.5 bg-blue-900 text-white rounded-lg hover:bg-blue-950 disabled:opacity-50 transition"
                         >
                            <ArrowRight size={16} />
                         </button>
                      </div>
                   </div>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};