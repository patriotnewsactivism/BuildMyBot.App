import React, { useState, useEffect, useRef } from 'react';
import { Save, Play, FileText, Settings, Upload, Globe, Share2, Code, Bot as BotIcon, Shield, Users, RefreshCcw, Image as ImageIcon, X, Clock, Zap, Monitor, LayoutTemplate, Trash2, Plus, Sparkles, Link, ExternalLink, Linkedin, Facebook, Twitter, MessageSquare, Building2, Briefcase, Plane, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { Bot as BotType } from '../../types';
import { generateBotResponse, scrapeWebsiteContent } from '../../services/openaiService';
import { AVAILABLE_MODELS } from '../../constants';
import { dbService } from '../../services/dbService';
import { edgeFunctions } from '../../services/edgeFunctions';

interface BotBuilderProps {
  bots: BotType[];
  onSave: (bot: BotType) => void;
  customDomain?: string;
  onLeadDetected?: (email: string) => void;
}

const HUMAN_NAMES = ['Sarah', 'Michael', 'Jessica', 'David', 'Emma', 'James', 'Emily', 'Robert'];
const AVATAR_COLORS = ['#1e3a8a', '#be123c', '#047857', '#d97706', '#7c3aed', '#db2777'];

const PERSONAS = [
  { id: 'support', name: 'Customer Support Agent', prompt: 'You work in customer support at {company}. You genuinely care about helping people solve their problems. Keep things conversational - no one likes talking to someone who sounds like they\'re reading from a script. If you can\'t help with something, just ask for their email or phone so someone can get back to them.' },
  { id: 'sales', name: 'Sales Representative', prompt: 'You\'re a sales rep at {company} who actually believes in what you\'re selling. Your job is to figure out if someone\'s a good fit - ask the right questions, understand their situation, and if it makes sense, try to get a call or meeting on the books. Don\'t be pushy though - nobody likes that.' },
  { id: 'receptionist', name: 'AI Receptionist', prompt: 'You\'re the friendly voice at the front desk of {company}. Help people get where they need to go - whether that\'s scheduling an appointment, answering quick questions, or connecting them with the right person. Keep it warm but efficient, like a really good receptionist would.' },
  { id: 'city_gov', name: 'City Services Agent', prompt: 'You work for {company} (city government) helping residents with everyday stuff - utility bills, trash pickup schedules, permits, that kind of thing. Be helpful and approachable, not bureaucratic. If someone mentions an emergency, immediately tell them to call 911.' },
  { id: 'batesville', name: 'Batesville City Assistant', prompt: 'You\'re here to help folks in Batesville, Mississippi with city services. Things you can help with: utility bills (water, gas, electric), city rules and ordinances, and setting up inspections.\n\nUseful info:\n- City Hall is at 103 College St\n- You can pay bills online or in person\n- Trash gets picked up weekly\n\nBe friendly and neighborly - this is a small town and people appreciate a personal touch. Always point them to the secure payment portal for bills.' },
  { id: 'hr', name: 'HR Assistant', prompt: 'You work in HR and help employees with questions about benefits, time off, company policies - all that stuff. Be approachable but also professional. Some topics are sensitive, so be discreet. If something\'s outside your wheelhouse, point them to the right person.' },
  { id: 'tech', name: 'Technical Support', prompt: 'You\'re tech support - helping people troubleshoot issues step by step. Don\'t assume they know technical stuff. Ask questions to figure out what\'s actually going on before jumping to solutions. Be patient - tech problems are frustrating.' },
  { id: 'scheduler', name: 'Appointment Scheduler', prompt: 'You handle scheduling for {company}. Your main goal is getting appointments booked - make it easy for people. Suggest specific times, confirm all the details, and make sure nothing falls through the cracks.' },
  { id: 'product', name: 'Product Specialist', prompt: 'You know {company}\'s products inside and out. Help people find what they actually need - ask about their situation, what they\'re trying to accomplish, and point them in the right direction. Don\'t just list features - explain why something would work for them.' },
  { id: 'realestate', name: 'Real Estate Agent', prompt: 'You\'re a real estate agent at {company}. Figure out what people are looking for - budget, location, must-haves vs nice-to-haves. Get them excited about possibilities and set up viewings. Real estate is personal, so connect with them.' },
  { id: 'legal', name: 'Legal Intake', prompt: 'You do intake for {company}\'s law practice. Gather info about potential clients and their situations with care and discretion. This is often a stressful time for people, so be empathetic. Important: you can\'t give legal advice, just collect information.' },
  { id: 'coach', name: 'Lifestyle Coach', prompt: 'You\'re a wellness and lifestyle coach with {company}. Help people set goals, stay motivated, and celebrate their wins. Be genuinely encouraging - positivity that feels real, not cheesy. Everyone\'s journey is different.' },
  { id: 'recruiter', name: 'Recruitment Assistant', prompt: 'You help with recruiting at {company}. Learn about candidates - their experience, what they\'re looking for, when they could start. Be encouraging but also honest about fit. If they seem like a match, get their email to set up a proper interview.' },
  { id: 'travel', name: 'Travel Concierge', prompt: 'You\'re a travel concierge at {company}. Help people plan trips they\'ll actually love - ask about their budget, what kind of experiences they enjoy, when they want to go. Get excited with them! Good travel planning is part logistics, part enthusiasm.' },
  { id: 'financial', name: 'Financial Guide', prompt: 'You help people understand {company}\'s financial products - accounts, cards, loans, etc. Make the complicated stuff simple. Be trustworthy and clear. You can explain products and answer questions, but don\'t give personal investment advice - that\'s a different conversation.' }
];

export const BotBuilder: React.FC<BotBuilderProps> = ({ bots, onSave, customDomain, onLeadDetected }) => {
  const [selectedBotId, setSelectedBotId] = useState<string>(bots[0]?.id || 'new');
  // Initialize with the selected bot or a default new one
  // LOGIC-002 FIX: Use crypto.randomUUID() for collision-free IDs
  const [activeBot, setActiveBot] = useState<BotType>(bots[0] || {
    id: crypto.randomUUID(),
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

  const [activeTab, setActiveTab] = useState<'config' | 'knowledge' | 'test' | 'embed'>('config');
  const [testInput, setTestInput] = useState('');
  const [testHistory, setTestHistory] = useState<{role: 'user'|'model', text: string, timestamp: number}[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  
  // Knowledge Base State
  const [kbInput, setKbInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [embeddingStatus, setEmbeddingStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, size: number, status: 'pending' | 'processing' | 'done' | 'error'}[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Embed Config State
  const [embedConfig, setEmbedConfig] = useState({
    position: 'bottom-right',
    welcomeMessage: 'Hi there! How can I help you today?',
    buttonStyle: 'rounded-full'
  });
  
  // Random identity for preview
  const [previewIdentity, setPreviewIdentity] = useState({ name: 'Bot', color: '#1e3a8a' });

  // Determine domain for snippets
  const displayDomain = customDomain || (typeof window !== 'undefined' ? window.location.host : 'buildmybot.app');
  // Real working link
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

  const handleSaveBot = () => {
      // Ensure we have a valid ID if it's new
      // LOGIC-002 FIX: Use crypto.randomUUID() for collision-free IDs
      const botToSave = { ...activeBot };
      if (botToSave.id === 'new') {
          botToSave.id = crypto.randomUUID();
      }
      onSave(botToSave);
      // Update local view
      setActiveBot(botToSave);
      setSelectedBotId(botToSave.id);
  };

  const handleApplyPersona = (personaId: string) => {
    const persona = PERSONAS.find(p => p.id === personaId);
    if (persona) {
      const isBatesville = personaId === 'batesville';
      setActiveBot({
        ...activeBot,
        systemPrompt: persona.prompt.replace('{company}', 'our organization'),
        type: persona.name,
        // Auto-set name for Batesville demo
        name: isBatesville ? 'Batesville City Assistant' : activeBot.name,
        // Auto-inject Knowledge for Batesville demo to ensure it works flawlessly immediately
        knowledgeBase: isBatesville 
            ? ['City Hall is located at 103 College St, Batesville, MS.', 'Utility payments can be made online at batesville.ms.gov/pay.', 'Trash pickup is every Tuesday for residential areas.'] 
            : activeBot.knowledgeBase
      });
    }
  };

  const handleAddKnowledge = async () => {
    if (!kbInput.trim()) return;

    const newContent = kbInput;
    setKbInput('');
    setEmbeddingStatus(null);

    // Add to local state immediately for UI feedback
    setActiveBot({
      ...activeBot,
      knowledgeBase: [...(activeBot.knowledgeBase || []), newContent]
    });

    // If bot is already saved, embed the knowledge
    if (activeBot.id && activeBot.id !== 'new') {
      setIsEmbedding(true);
      try {
        const result = await edgeFunctions.embedKnowledgeBase(
          activeBot.id,
          newContent,
          `manual_${Date.now()}.txt`,
          { fileType: 'text' }
        );
        setEmbeddingStatus({
          type: 'success',
          message: `Embedded ${result.chunksProcessed} chunks (${result.totalTokens} tokens)`
        });
      } catch (err) {
        console.error('Embedding failed:', err);
        setEmbeddingStatus({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to embed knowledge'
        });
      } finally {
        setIsEmbedding(false);
      }
    }
  };

  // File upload handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await processFiles(files);
    }
  };

  const processFiles = async (files: File[]) => {
    const allowedTypes = ['.pdf', '.txt', '.md', '.csv', '.docx'];
    const validFiles = files.filter(f =>
      allowedTypes.some(ext => f.name.toLowerCase().endsWith(ext))
    );

    if (validFiles.length === 0) {
      setEmbeddingStatus({
        type: 'error',
        message: 'Please upload PDF, TXT, MD, CSV, or DOCX files only.'
      });
      return;
    }

    for (const file of validFiles) {
      setUploadedFiles(prev => [...prev, { name: file.name, size: file.size, status: 'processing' }]);

      try {
        let content = '';

        // Read file content
        if (file.name.endsWith('.pdf')) {
          // For PDF, we'll send to the server to parse
          content = `[PDF Document: ${file.name}] - Content extraction requires server processing.`;
          // In a full implementation, you'd upload the file to Supabase Storage
          // and then call an Edge Function to parse the PDF
        } else {
          // For text-based files, read directly
          content = await file.text();
        }

        // Add to local knowledge base
        setActiveBot(prev => ({
          ...prev,
          knowledgeBase: [...(prev.knowledgeBase || []), `[${file.name}]\n${content.substring(0, 5000)}`]
        }));

        // If bot is saved, embed the content
        if (activeBot.id && activeBot.id !== 'new') {
          try {
            const result = await edgeFunctions.embedKnowledgeBase(
              activeBot.id,
              content,
              file.name,
              { fileType: file.name.split('.').pop() || 'txt' }
            );
            setUploadedFiles(prev =>
              prev.map(f => f.name === file.name ? { ...f, status: 'done' } : f)
            );
            setEmbeddingStatus({
              type: 'success',
              message: `Processed ${file.name}: ${result.chunksProcessed} chunks`
            });
          } catch (embErr) {
            setUploadedFiles(prev =>
              prev.map(f => f.name === file.name ? { ...f, status: 'error' } : f)
            );
          }
        } else {
          setUploadedFiles(prev =>
            prev.map(f => f.name === file.name ? { ...f, status: 'done' } : f)
          );
        }
      } catch (err) {
        console.error('File processing error:', err);
        setUploadedFiles(prev =>
          prev.map(f => f.name === file.name ? { ...f, status: 'error' } : f)
        );
        setEmbeddingStatus({
          type: 'error',
          message: `Failed to process ${file.name}`
        });
      }
    }
  };

  const handleScrapeUrl = async () => {
    if (!urlInput.trim()) return;
    setIsScraping(true);
    setEmbeddingStatus(null);

    const url = urlInput;
    setUrlInput('');

    try {
        const extractedData = await scrapeWebsiteContent(url);
        setActiveBot({
            ...activeBot,
            knowledgeBase: [...(activeBot.knowledgeBase || []), extractedData]
        });

        // If bot is already saved, embed the scraped content
        if (activeBot.id && activeBot.id !== 'new') {
            setIsEmbedding(true);
            try {
                const result = await edgeFunctions.embedKnowledgeBase(
                    activeBot.id,
                    extractedData,
                    new URL(url).hostname,
                    { fileType: 'url', fileUrl: url }
                );
                setEmbeddingStatus({
                    type: 'success',
                    message: `Embedded ${result.chunksProcessed} chunks from ${result.fileName}`
                });
            } catch (embErr) {
                console.error('Embedding failed:', embErr);
                setEmbeddingStatus({
                    type: 'error',
                    message: embErr instanceof Error ? embErr.message : 'Failed to embed knowledge'
                });
            } finally {
                setIsEmbedding(false);
            }
        }
    } catch (error) {
        console.error("Scrape failed", error);
        setEmbeddingStatus({
            type: 'error',
            message: "Failed to scrape website. Please check the URL and try again."
        });
    } finally {
        setIsScraping(false);
    }
  };

  const handleTestSend = async () => {
    if (!testInput.trim()) return;
    
    // Check for "hot lead" triggers (simple regex for email)
    const emailMatch = testInput.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
    if (emailMatch && onLeadDetected) {
       onLeadDetected(emailMatch[0]);
    }

    const newMessage = { role: 'user' as const, text: testInput, timestamp: Date.now() };
    const updatedHistory = [...testHistory, newMessage];
    
    setTestHistory(updatedHistory);
    setTestInput('');
    setIsTesting(true);

    try {
        const context = activeBot.knowledgeBase.join('\n\n');
        const response = await generateBotResponse(activeBot.systemPrompt, updatedHistory, newMessage.text, activeBot.model, context);
        
        // Use configured delay
        setTimeout(() => {
            setTestHistory(prev => [...prev, { role: 'model', text: response, timestamp: Date.now() }]);
            setIsTesting(false);
        }, activeBot.responseDelay || 1500);

    } catch (e) {
        setIsTesting(false);
    }
  };

  // Embed script snippet
  const embedCode = `<script>
  window.bmbConfig = {
    botId: "${activeBot.id}",
    theme: "${activeBot.themeColor}",
    domain: "${displayDomain}"
  };
</script>
<script src="https://${displayDomain}/embed.js" async></script>`;

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-6 animate-fade-in">
      {/* Sidebar List */}
      <div className="w-64 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden hidden md:flex">
         <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <h3 className="font-semibold text-slate-800">My Bots</h3>
           <button 
             onClick={() => {
                const newBot = {
                    id: 'new',
                    name: 'New Bot',
                    type: 'Custom',
                    systemPrompt: 'You are a helpful assistant.',
                    model: 'gpt-4o-mini',
                    temperature: 0.7,
                    knowledgeBase: [],
                    active: true,
                    conversationsCount: 0,
                    themeColor: '#1e3a8a',
                    maxMessages: 20,
                    randomizeIdentity: true,
                    responseDelay: 1500
                } as BotType;
                setActiveBot(newBot);
                setSelectedBotId('new');
             }}
             className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
           >
             <Plus size={18} />
           </button>
         </div>
         <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {bots.map(bot => (
               <button
                 key={bot.id}
                 onClick={() => handleBotSelect(bot)}
                 className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition ${selectedBotId === bot.id ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}
               >
                 <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{backgroundColor: bot.themeColor}}>
                    {bot.name.substring(0,2)}
                 </div>
                 <div>
                    <div className={`font-medium text-sm ${selectedBotId === bot.id ? 'text-blue-900' : 'text-slate-700'}`}>{bot.name}</div>
                    <div className="text-[10px] text-slate-500">{bot.type}</div>
                 </div>
               </button>
            ))}
         </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
         {/* Editor Header */}
         <div className="h-16 border-b border-slate-100 px-6 flex items-center justify-between bg-white">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center text-white shadow-md">
                 <BotIcon size={20} />
               </div>
               <div>
                 <input 
                   type="text" 
                   value={activeBot.name}
                   onChange={(e) => setActiveBot({...activeBot, name: e.target.value})}
                   className="font-bold text-lg text-slate-800 border-none p-0 focus:ring-0 placeholder-slate-300 w-full"
                   placeholder="Bot Name"
                 />
                 <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className={`w-2 h-2 rounded-full ${activeBot.active ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                    {activeBot.active ? 'Active' : 'Draft'} • {activeBot.model}
                 </div>
               </div>
            </div>
            <div className="flex gap-2">
               <button 
                 onClick={handleSaveBot}
                 className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 font-medium transition shadow-sm"
               >
                 <Save size={18} /> Save Changes
               </button>
            </div>
         </div>

         {/* Tabs */}
         <div className="border-b border-slate-200 bg-slate-50 px-6 flex gap-6">
            {[
                {id: 'config', label: 'Configuration', icon: Settings},
                {id: 'knowledge', label: 'Knowledge Base', icon: FileText},
                {id: 'embed', label: 'Embed & Share', icon: Share2},
                {id: 'test', label: 'Test Bot', icon: Play},
            ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition ${
                      activeTab === tab.id 
                      ? 'border-blue-900 text-blue-900' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                   <tab.icon size={16} /> {tab.label}
                </button>
            ))}
         </div>

         {/* Content Area */}
         <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {activeTab === 'config' && (
                <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                    {/* Persona Selector */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                       <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <Users size={18} className="text-blue-900"/> AI Staff Persona
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {PERSONAS.map(p => (
                             <button
                               key={p.id}
                               onClick={() => handleApplyPersona(p.id)}
                               className={`text-left p-3 rounded-lg border text-sm transition hover:shadow-md relative overflow-hidden ${activeBot.type === p.name ? 'border-blue-900 bg-blue-50 ring-1 ring-blue-900' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}
                             >
                                {p.id === 'batesville' && <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-bl-lg font-bold">DEMO</div>}
                                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                    {p.id.includes('city') || p.id === 'batesville' ? <Building2 size={14} className="text-blue-600"/> : null}
                                    {p.id === 'recruiter' ? <Briefcase size={14} className="text-blue-600"/> : null}
                                    {p.id === 'travel' ? <Plane size={14} className="text-blue-600"/> : null}
                                    {p.id === 'financial' ? <DollarSign size={14} className="text-blue-600"/> : null}
                                    {p.name}
                                </div>
                                <div className="text-xs text-slate-500 mt-1 truncate">Apply preset</div>
                             </button>
                          ))}
                       </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4">Core Behavior</h3>
                        <div className="space-y-4">
                           <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">System Prompt</label>
                              <textarea 
                                value={activeBot.systemPrompt}
                                onChange={(e) => setActiveBot({...activeBot, systemPrompt: e.target.value})}
                                className="w-full h-32 rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 p-3 text-sm"
                                placeholder="You are a helpful assistant..."
                              />
                              <p className="text-xs text-slate-500 mt-1">These instructions define how the bot behaves.</p>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                   className="w-full accent-blue-900"
                                 />
                                 <div className="flex justify-between text-xs text-slate-400 mt-1">
                                    <span>Precise</span>
                                    <span>Balanced</span>
                                    <span>Creative</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                           <Sparkles size={18} className="text-blue-900" /> Human-Like Behavior
                        </h3>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <div>
                                 <label className="text-sm font-medium text-slate-700">Randomize Identity</label>
                                 <p className="text-xs text-slate-500">Bot uses different names/avatars per session to feel human.</p>
                              </div>
                              <input 
                                type="checkbox"
                                checked={activeBot.randomizeIdentity}
                                onChange={(e) => setActiveBot({...activeBot, randomizeIdentity: e.target.checked})}
                                className="w-5 h-5 rounded text-blue-900 focus:ring-blue-900"
                              />
                           </div>
                           
                           <div>
                               <label className="text-sm font-medium text-slate-700 mb-2 block">Typing Delay (ms)</label>
                               <input 
                                   type="range" min="0" max="5000" step="500"
                                   value={activeBot.responseDelay || 2000}
                                   onChange={(e) => setActiveBot({...activeBot, responseDelay: parseInt(e.target.value)})}
                                   className="w-full accent-blue-900"
                               />
                               <div className="flex justify-between text-xs text-slate-400 mt-1">
                                  <span>Instant (Bot)</span>
                                  <span>{activeBot.responseDelay}ms</span>
                                  <span>Slow (Human)</span>
                               </div>
                           </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'knowledge' && (
                <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                   {/* Embedding Status Banner */}
                   {(isEmbedding || embeddingStatus) && (
                     <div className={`p-4 rounded-lg flex items-center gap-3 ${
                       isEmbedding ? 'bg-blue-50 border border-blue-200' :
                       embeddingStatus?.type === 'success' ? 'bg-emerald-50 border border-emerald-200' :
                       'bg-red-50 border border-red-200'
                     }`}>
                       {isEmbedding ? (
                         <>
                           <RefreshCcw className="animate-spin text-blue-600" size={18} />
                           <span className="text-blue-700 text-sm">Generating embeddings...</span>
                         </>
                       ) : embeddingStatus?.type === 'success' ? (
                         <>
                           <CheckCircle className="text-emerald-600" size={18} />
                           <span className="text-emerald-700 text-sm">{embeddingStatus.message}</span>
                         </>
                       ) : (
                         <>
                           <AlertCircle className="text-red-600" size={18} />
                           <span className="text-red-700 text-sm">{embeddingStatus?.message}</span>
                         </>
                       )}
                       {!isEmbedding && (
                         <button
                           onClick={() => setEmbeddingStatus(null)}
                           className="ml-auto text-slate-400 hover:text-slate-600"
                         >
                           <X size={16} />
                         </button>
                       )}
                     </div>
                   )}

                   {/* New Bot Warning */}
                   {activeBot.id === 'new' && (
                     <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3">
                       <AlertCircle className="text-amber-600" size={18} />
                       <span className="text-amber-700 text-sm">Save your bot first to enable AI-powered knowledge embeddings.</span>
                     </div>
                   )}

                   {/* Document Upload Zone */}
                   <div
                     onDragOver={handleDragOver}
                     onDragLeave={handleDragLeave}
                     onDrop={handleDrop}
                     className={`bg-white p-6 rounded-xl border-2 border-dashed shadow-sm transition-all ${
                       isDragging
                         ? 'border-blue-500 bg-blue-50'
                         : 'border-slate-200 hover:border-blue-300'
                     }`}
                   >
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                         <Upload size={18} className="text-blue-900" /> Upload Documents
                      </h3>
                      <div className="text-center py-6">
                         <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                           <Upload size={24} className="text-slate-400" />
                         </div>
                         <p className="text-slate-600 mb-2">
                           Drag & drop files here, or{' '}
                           <button
                             onClick={() => fileInputRef.current?.click()}
                             className="text-blue-900 font-medium hover:underline"
                           >
                             browse
                           </button>
                         </p>
                         <p className="text-xs text-slate-400">Supports PDF, TXT, MD, CSV, DOCX (max 10MB)</p>
                         <input
                           ref={fileInputRef}
                           type="file"
                           multiple
                           accept=".pdf,.txt,.md,.csv,.docx"
                           onChange={handleFileSelect}
                           className="hidden"
                         />
                      </div>

                      {/* Uploaded Files List */}
                      {uploadedFiles.length > 0 && (
                        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                          {uploadedFiles.map((file, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText size={16} className="text-blue-900" />
                                <div>
                                  <p className="text-sm font-medium text-slate-700">{file.name}</p>
                                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {file.status === 'processing' && (
                                  <RefreshCcw className="animate-spin text-blue-600" size={14} />
                                )}
                                {file.status === 'done' && (
                                  <CheckCircle className="text-emerald-500" size={14} />
                                )}
                                {file.status === 'error' && (
                                  <AlertCircle className="text-red-500" size={14} />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                   </div>

                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                         <Globe size={18} className="text-blue-900" /> Train from Website
                      </h3>
                      <div className="flex gap-2">
                         <input
                           type="url"
                           value={urlInput}
                           onChange={(e) => setUrlInput(e.target.value)}
                           placeholder="https://yourbusiness.com"
                           className="flex-1 rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                         />
                         <button
                           onClick={handleScrapeUrl}
                           disabled={isScraping || !urlInput}
                           className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-950 disabled:opacity-50 transition font-medium flex items-center gap-2"
                         >
                           {isScraping ? <RefreshCcw className="animate-spin" size={16} /> : <Zap size={16} />}
                           Scrape Website
                         </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Enter a URL to extract content and train your bot on that website's information.</p>
                   </div>

                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                         <FileText size={18} className="text-blue-900" /> Manual Training Data
                      </h3>
                      <div className="flex gap-2 mb-4">
                         <input 
                           type="text" 
                           value={kbInput}
                           onChange={(e) => setKbInput(e.target.value)}
                           placeholder="Add specific fact (e.g. 'We are closed on Sundays')"
                           className="flex-1 rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                         />
                         <button 
                           onClick={handleAddKnowledge}
                           className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition font-medium"
                         >
                           Add Fact
                         </button>
                      </div>
                      
                      <div className="space-y-2">
                         {activeBot.knowledgeBase.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                               No knowledge added yet.
                            </div>
                         )}
                         {activeBot.knowledgeBase.map((item, i) => (
                            <div key={i} className="flex items-start justify-between bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                               <p className="text-slate-700 whitespace-pre-wrap">{item}</p>
                               <button 
                                 onClick={() => {
                                     const newKb = [...activeBot.knowledgeBase];
                                     newKb.splice(i, 1);
                                     setActiveBot({...activeBot, knowledgeBase: newKb});
                                 }}
                                 className="text-slate-400 hover:text-red-500 ml-2"
                               >
                                 <Trash2 size={14} />
                               </button>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
            )}

            {activeTab === 'embed' && (
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                              <Code size={18} className="text-blue-900"/> Website Embed
                           </h3>
                           <p className="text-sm text-slate-600 mb-4">
                              Copy and paste this code into your website's <code>&lt;head&gt;</code> tag.
                           </p>
                           <div className="bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-xs overflow-x-auto relative group">
                              <pre>{embedCode}</pre>
                              <button 
                                onClick={() => navigator.clipboard.writeText(embedCode)}
                                className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded text-white opacity-0 group-hover:opacity-100 transition"
                                title="Copy to clipboard"
                              >
                                 <Share2 size={14} />
                              </button>
                           </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                              <Link size={18} className="text-blue-900"/> Share Public Link
                           </h3>
                           <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 mb-4">
                              <input 
                                readOnly 
                                value={shareLink}
                                className="bg-transparent border-none focus:ring-0 w-full text-sm text-slate-600"
                              />
                              <a href={shareLink} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-900 hover:bg-blue-100 rounded">
                                 <ExternalLink size={16} />
                              </a>
                           </div>
                           
                           <div className="flex gap-2">
                              <button className="flex-1 py-2 bg-[#0077b5] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90">
                                 <Linkedin size={14} /> Post
                              </button>
                              <button className="flex-1 py-2 bg-[#1877f2] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90">
                                 <Facebook size={14} /> Share
                              </button>
                              <button className="flex-1 py-2 bg-black text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90">
                                 <Twitter size={14} /> Tweet
                              </button>
                           </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Monitor size={18} className="text-blue-900"/> Widget Preview
                        </h3>
                        
                        <div className="space-y-4 mb-8">
                           <div>
                              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Brand Color</label>
                              <div className="flex gap-2">
                                 {AVATAR_COLORS.map(c => (
                                    <button 
                                      key={c} 
                                      onClick={() => setActiveBot({...activeBot, themeColor: c})}
                                      className={`w-6 h-6 rounded-full border-2 ${activeBot.themeColor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                                      style={{backgroundColor: c}}
                                    />
                                 ))}
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Position</label>
                                <select 
                                  value={embedConfig.position}
                                  onChange={(e) => setEmbedConfig({...embedConfig, position: e.target.value})}
                                  className="w-full text-sm rounded-lg border-slate-200"
                                >
                                  <option value="bottom-right">Bottom Right</option>
                                  <option value="bottom-left">Bottom Left</option>
                                </select>
                             </div>
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Style</label>
                                <select 
                                  value={embedConfig.buttonStyle}
                                  onChange={(e) => setEmbedConfig({...embedConfig, buttonStyle: e.target.value})}
                                  className="w-full text-sm rounded-lg border-slate-200"
                                >
                                  <option value="rounded-full">Circle</option>
                                  <option value="rounded-xl">Square</option>
                                </select>
                             </div>
                           </div>
                        </div>

                        <div className="flex-1 bg-slate-100 rounded-xl border border-slate-200 relative overflow-hidden min-h-[300px]">
                            {/* Fake Website Content */}
                            <div className="p-4 space-y-3 opacity-30 pointer-events-none">
                               <div className="h-4 bg-slate-300 rounded w-3/4"></div>
                               <div className="h-4 bg-slate-300 rounded w-1/2"></div>
                               <div className="h-32 bg-slate-300 rounded w-full"></div>
                               <div className="h-4 bg-slate-300 rounded w-2/3"></div>
                            </div>

                            {/* Widget */}
                            <div className={`absolute p-4 flex flex-col items-end gap-2 transition-all ${
                                embedConfig.position === 'bottom-right' ? 'bottom-0 right-0' : 'bottom-0 left-0 items-start'
                            }`}>
                                <div className="bg-white p-3 rounded-xl rounded-br-none shadow-lg border border-slate-100 text-sm text-slate-700 max-w-[200px] animate-fade-in">
                                   {embedConfig.welcomeMessage}
                                </div>
                                <div 
                                  className={`w-14 h-14 ${embedConfig.buttonStyle} shadow-xl flex items-center justify-center text-white cursor-pointer hover:scale-105 transition`}
                                  style={{backgroundColor: activeBot.themeColor}}
                                >
                                   <MessageSquare size={24} fill="currentColor" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'test' && (
                <div className="max-w-3xl mx-auto h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                   {/* Chat Header */}
                   <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{backgroundColor: previewIdentity.color}}>
                            {previewIdentity.name.substring(0,2)}
                         </div>
                         <div>
                            <div className="font-bold text-slate-800">{previewIdentity.name}</div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online Preview
                            </div>
                         </div>
                      </div>
                      <button onClick={() => setTestHistory([])} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
                         <Trash2 size={12}/> Clear Chat
                      </button>
                   </div>

                   {/* Chat History */}
                   <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={scrollRef}>
                      {testHistory.length === 0 && (
                         <div className="text-center py-12 text-slate-400 text-sm">
                            <BotIcon size={32} className="mx-auto mb-2 opacity-20"/>
                            Start typing to test your bot.
                         </div>
                      )}
                      {testHistory.map((msg, i) => (
                         <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
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

                   {/* Chat Input */}
                   <div className="p-4 bg-white border-t border-slate-100">
                      <div className="relative">
                         <input 
                           value={testInput}
                           onChange={(e) => setTestInput(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleTestSend()}
                           placeholder="Type a message..."
                           className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:ring-blue-900 focus:border-blue-900 shadow-sm"
                         />
                         <button 
                           onClick={handleTestSend}
                           disabled={!testInput.trim() || isTesting}
                           className="absolute right-2 top-2 p-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 disabled:opacity-50 transition"
                         >
                            <Play size={16} fill="currentColor" />
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