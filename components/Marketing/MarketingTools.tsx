import React, { useState, useEffect } from 'react';
import { Mail, Instagram, Megaphone, Loader, Copy, Check, Twitter, Smartphone, Save } from 'lucide-react';
import { generateMarketingContent } from '../../services/geminiService';
import { dbService } from '../../services/dbService';

interface MarketingToolsProps {
  userId?: string;
}

export const MarketingTools: React.FC<MarketingToolsProps> = ({ userId }) => {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Professional');
  const [activeType, setActiveType] = useState<'email'|'social'|'ad'|'viral-thread'|'story'>('email');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedContent, setSavedContent] = useState<any[]>([]);

  // Load saved content on mount
  useEffect(() => {
    const loadSaved = async () => {
      if (userId) {
        const content = await dbService.getMarketingContent(userId);
        setSavedContent(content);
      }
    };
    loadSaved();
  }, [userId]);

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setGeneratedContent('');
    setSaved(false);
    try {
      const content = await generateMarketingContent(activeType, topic, tone);
      setGeneratedContent(content);
    } catch (e) {
      setGeneratedContent("Error generating content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId || !generatedContent) return;
    try {
      await dbService.saveMarketingContent(userId, activeType, topic, generatedContent, topic, tone);
      setSaved(true);
      // Reload saved content
      const content = await dbService.getMarketingContent(userId);
      setSavedContent(content);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save content:", e);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tools = [
    { id: 'email', label: 'Email Campaign', icon: Mail, desc: 'Cold outreach or newsletters' },
    { id: 'social', label: 'Social Post', icon: Instagram, desc: 'LinkedIn, Twitter, or FB' },
    { id: 'ad', label: 'Ad Copy', icon: Megaphone, desc: 'Google Ads or Facebook Ads' },
    { id: 'viral-thread', label: 'Viral Thread', icon: Twitter, desc: 'Twitter/X Thread Generator' },
    { id: 'story', label: 'IG/TikTok Story', icon: Smartphone, desc: '15s Video Script' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div className="text-center mb-8">
         <h2 className="text-2xl font-bold text-slate-800">AI Marketing Suite</h2>
         <p className="text-slate-500">Generate high-converting copy in seconds.</p>
       </div>

       <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
         {tools.map(t => (
           <button
             key={t.id}
             onClick={() => setActiveType(t.id as any)}
             className={`p-3 rounded-xl border text-left transition flex flex-col justify-between min-h-[100px] ${
               activeType === t.id 
               ? 'border-blue-900 bg-blue-50 ring-1 ring-blue-900' 
               : 'border-slate-200 bg-white hover:border-blue-300'
             }`}
           >
             <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${activeType === t.id ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
               <t.icon size={16} />
             </div>
             <div>
                <div className="font-semibold text-slate-800 text-xs">{t.label}</div>
                <div className="text-[10px] text-slate-500 leading-tight mt-1">{t.desc}</div>
             </div>
           </button>
         ))}
       </div>

       <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
             <div className="md:col-span-2">
               <label className="block text-sm font-medium text-slate-700 mb-2">What is this about?</label>
               <input 
                 type="text" 
                 value={topic}
                 onChange={(e) => setTopic(e.target.value)}
                 placeholder="e.g., New Summer Sale, Product Launch, Webinar Invite"
                 className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">Tone of Voice</label>
               <select 
                 value={tone}
                 onChange={(e) => setTone(e.target.value)}
                 className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
               >
                 <option>Professional</option>
                 <option>Friendly</option>
                 <option>Urgent</option>
                 <option>Witty</option>
                 <option>Luxury</option>
               </select>
             </div>
          </div>
          
          <button 
            onClick={handleGenerate}
            disabled={!topic || loading}
            className="w-full bg-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-950 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="animate-spin" size={20} /> : <Megaphone size={20} />}
            Generate Content
          </button>
       </div>

       {generatedContent && (
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
           <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
             <h3 className="font-medium text-slate-700">Generated Result</h3>
             <div className="flex gap-2">
               {userId && (
                 <button onClick={handleSave} className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                   {saved ? <Check size={16} /> : <Save size={16} />}
                   {saved ? 'Saved' : 'Save'}
                 </button>
               )}
               <button onClick={copyToClipboard} className="text-sm text-blue-900 hover:text-blue-950 flex items-center gap-1">
                 {copied ? <Check size={16} /> : <Copy size={16} />}
                 {copied ? 'Copied' : 'Copy Text'}
               </button>
             </div>
           </div>
           <div className="p-6 whitespace-pre-wrap text-slate-600 text-sm leading-relaxed">
             {generatedContent}
           </div>
         </div>
       )}

       {savedContent.length > 0 && (
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
             <h3 className="font-medium text-slate-700">Saved Content ({savedContent.length})</h3>
           </div>
           <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
             {savedContent.slice(0, 5).map((item) => (
               <div key={item.id} className="p-4 hover:bg-slate-50 transition">
                 <div className="flex justify-between items-start gap-3">
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-1">
                       <span className="text-xs font-medium text-blue-900 uppercase">{item.type}</span>
                       <span className="text-xs text-slate-400">•</span>
                       <span className="text-xs text-slate-500">{item.tone}</span>
                     </div>
                     <div className="text-sm font-medium text-slate-800 mb-1">{item.title}</div>
                     <div className="text-xs text-slate-500 truncate">{item.content.substring(0, 100)}...</div>
                   </div>
                 </div>
               </div>
             ))}
           </div>
         </div>
       )}
    </div>
  );
};