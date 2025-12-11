import React, { useState } from 'react';
import { Mail, Instagram, Megaphone, Loader, Copy, Check, Twitter, Smartphone, Linkedin, Hash, Sparkles, RefreshCcw, Save, Calendar } from 'lucide-react';
import { generateMarketingContent } from '../../services/openaiService';

interface GeneratedPost {
  content: string;
  platform: string;
  timestamp: number;
}

export const MarketingTools: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Professional');
  const [activeType, setActiveType] = useState<'email'|'linkedin'|'twitter-thread'|'instagram'|'ad'|'story'>('twitter-thread');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedPosts, setSavedPosts] = useState<GeneratedPost[]>([]);
  const [charCount, setCharCount] = useState(0);

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setGeneratedContent('');
    try {
      const content = await generateMarketingContent(activeType, topic, tone);
      setGeneratedContent(content);
      // Calculate character count for Twitter
      if (activeType === 'twitter-thread') {
        const tweets = content.split('\n\n').filter(t => t.trim());
        setCharCount(tweets.reduce((acc, t) => Math.max(acc, t.length), 0));
      }
    } catch (e) {
      setGeneratedContent("Error generating content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const savePost = () => {
    setSavedPosts(prev => [...prev, {
      content: generatedContent,
      platform: activeType,
      timestamp: Date.now()
    }]);
  };

  const tools = [
    { id: 'twitter-thread', label: 'Viral X Thread', icon: Twitter, desc: 'Hook + 5-10 tweet thread', color: 'bg-black' },
    { id: 'linkedin', label: 'LinkedIn Post', icon: Linkedin, desc: 'Professional thought leadership', color: 'bg-[#0077b5]' },
    { id: 'instagram', label: 'Instagram Caption', icon: Instagram, desc: 'Engaging caption + hashtags', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    { id: 'email', label: 'Email Sequence', icon: Mail, desc: 'Cold outreach or nurture', color: 'bg-blue-600' },
    { id: 'ad', label: 'Ad Copy', icon: Megaphone, desc: 'Facebook/Google Ads', color: 'bg-orange-500' },
    { id: 'story', label: 'Video Script', icon: Smartphone, desc: 'TikTok/Reels/Shorts', color: 'bg-red-500' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
       <div className="text-center mb-8">
         <h2 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
           <Sparkles className="text-blue-900" /> AI Marketing Suite
         </h2>
         <p className="text-slate-500">Generate viral content for any platform in seconds.</p>
       </div>

       {/* Platform Selection */}
       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
         {tools.map(t => (
           <button
             key={t.id}
             onClick={() => setActiveType(t.id as any)}
             className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] ${
               activeType === t.id
               ? 'border-blue-900 bg-white ring-2 ring-blue-900 shadow-lg'
               : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
             }`}
           >
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${t.color} text-white shadow-sm`}>
               <t.icon size={20} />
             </div>
             <div>
                <div className="font-bold text-slate-800 text-sm">{t.label}</div>
                <div className="text-xs text-slate-500 leading-tight mt-1">{t.desc}</div>
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
             <div className="flex items-center gap-4">
               <h3 className="font-medium text-slate-700">Generated Result</h3>
               {activeType === 'twitter-thread' && (
                 <span className={`text-xs px-2 py-1 rounded-full ${charCount > 280 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                   {charCount}/280 chars
                 </span>
               )}
             </div>
             <div className="flex items-center gap-2">
               <button
                 onClick={savePost}
                 className="text-sm text-slate-600 hover:text-blue-900 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
               >
                 <Save size={14} /> Save
               </button>
               <button
                 onClick={handleGenerate}
                 disabled={loading}
                 className="text-sm text-slate-600 hover:text-blue-900 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
               >
                 <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> Regenerate
               </button>
               <button onClick={copyToClipboard} className="text-sm text-white bg-blue-900 hover:bg-blue-950 flex items-center gap-1 px-3 py-1.5 rounded-lg transition">
                 {copied ? <Check size={14} /> : <Copy size={14} />}
                 {copied ? 'Copied!' : 'Copy'}
               </button>
             </div>
           </div>
           <div className="p-6 whitespace-pre-wrap text-slate-600 text-sm leading-relaxed">
             {generatedContent}
           </div>

           {/* Platform-specific tips */}
           {activeType === 'twitter-thread' && (
             <div className="px-6 pb-4 border-t border-slate-100 pt-4">
               <p className="text-xs text-slate-500 flex items-center gap-2">
                 <Sparkles size={12} className="text-blue-900" />
                 Tip: First tweet is your hook. Make it scroll-stopping!
               </p>
             </div>
           )}
           {activeType === 'linkedin' && (
             <div className="px-6 pb-4 border-t border-slate-100 pt-4">
               <p className="text-xs text-slate-500 flex items-center gap-2">
                 <Sparkles size={12} className="text-blue-900" />
                 Tip: First line appears in feed preview. Make it compelling!
               </p>
             </div>
           )}
           {activeType === 'instagram' && (
             <div className="px-6 pb-4 border-t border-slate-100 pt-4">
               <p className="text-xs text-slate-500 flex items-center gap-2">
                 <Hash size={12} className="text-blue-900" />
                 Use 3-5 relevant hashtags. Mix popular + niche for best reach.
               </p>
             </div>
           )}
         </div>
       )}

       {/* Saved Posts */}
       {savedPosts.length > 0 && (
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
             <Calendar size={18} className="text-blue-900" /> Saved Content ({savedPosts.length})
           </h3>
           <div className="space-y-3 max-h-64 overflow-y-auto">
             {savedPosts.map((post, i) => (
               <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-xs font-medium text-slate-500 uppercase">{post.platform}</span>
                   <span className="text-xs text-slate-400">{new Date(post.timestamp).toLocaleDateString()}</span>
                 </div>
                 <p className="text-sm text-slate-600 line-clamp-2">{post.content}</p>
               </div>
             ))}
           </div>
         </div>
       )}
    </div>
  );
};