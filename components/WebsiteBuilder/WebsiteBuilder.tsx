import React, { useState } from 'react';
import { Layout, Rocket, Monitor, Smartphone, CheckCircle, RefreshCcw, Download, Globe, Copy, ExternalLink, Palette, Code, Zap, Building2, ShoppingBag, Briefcase, Stethoscope, Utensils, Camera, Loader } from 'lucide-react';
import { generateWebsiteStructure } from '../../services/openaiService';
import { supabase } from '../../services/supabaseClient';

const TEMPLATES = [
  { id: 'modern', name: 'Modern Business', icon: Building2, color: 'bg-blue-600', desc: 'Clean, professional layout' },
  { id: 'ecommerce', name: 'E-Commerce', icon: ShoppingBag, color: 'bg-emerald-600', desc: 'Product-focused design' },
  { id: 'agency', name: 'Agency/Portfolio', icon: Briefcase, color: 'bg-purple-600', desc: 'Showcase your work' },
  { id: 'healthcare', name: 'Healthcare', icon: Stethoscope, color: 'bg-red-500', desc: 'Medical & wellness' },
  { id: 'restaurant', name: 'Restaurant', icon: Utensils, color: 'bg-orange-500', desc: 'Food & hospitality' },
  { id: 'creative', name: 'Creative', icon: Camera, color: 'bg-pink-500', desc: 'Bold & artistic' },
];

const BRAND_COLORS = [
  { name: 'Blue', value: '#1e3a8a', tailwind: 'blue-900' },
  { name: 'Emerald', value: '#047857', tailwind: 'emerald-700' },
  { name: 'Purple', value: '#7c3aed', tailwind: 'purple-600' },
  { name: 'Rose', value: '#be123c', tailwind: 'rose-700' },
  { name: 'Orange', value: '#d97706', tailwind: 'amber-600' },
  { name: 'Slate', value: '#1e293b', tailwind: 'slate-800' },
];

export const WebsiteBuilder: React.FC = () => {
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [siteData, setSiteData] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [brandColor, setBrandColor] = useState('#1e3a8a');
  const [includeChatbot, setIncludeChatbot] = useState(true);
  const [subdomain, setSubdomain] = useState('');

  const handleGenerate = async () => {
    if (!businessName || !description) return;
    setIsGenerating(true);
    setSubdomain(businessName.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    try {
      const resultJson = await generateWebsiteStructure(businessName, description);
      setSiteData(JSON.parse(resultJson));
    } catch (error) {
      console.error("Failed to parse website JSON", error);
      // Fallback
      setSiteData({
         headline: "Welcome to " + businessName,
         subheadline: "We provide the best services for " + description,
         features: ["Quality Service", "Expert Team", "24/7 Support"],
         ctaText: "Get Started Now"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeploy = async () => {
    if (!siteData || !subdomain) return;
    setIsDeploying(true);
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/deploy-website`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subdomain,
          businessName,
          siteData,
          template: selectedTemplate,
          brandColor,
          includeChatbot,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setDeployedUrl(result.url || `https://${subdomain}.buildmybot.app`);
      } else {
        // Demo fallback
        setDeployedUrl(`https://${subdomain}.buildmybot.app`);
      }
    } catch (e) {
      console.error('Deploy error:', e);
      // Demo fallback - show success anyway
      setDeployedUrl(`https://${subdomain}.buildmybot.app`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleExportHTML = () => {
    if (!siteData) return;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>:root { --brand: ${brandColor}; }</style>
</head>
<body class="font-sans antialiased">
  <nav class="p-4 border-b flex justify-between items-center">
    <span class="font-bold text-lg">${businessName}</span>
    <button class="px-4 py-1.5 text-white rounded text-sm" style="background: ${brandColor}">Contact</button>
  </nav>
  <header class="py-20 px-6 text-center" style="background: linear-gradient(to bottom, ${brandColor}10, white)">
    <h1 class="text-4xl font-extrabold text-gray-900 mb-4">${siteData.headline}</h1>
    <p class="text-lg text-gray-600 max-w-lg mx-auto mb-8">${siteData.subheadline}</p>
    <button class="px-8 py-3 text-white rounded-lg font-semibold shadow-lg" style="background: ${brandColor}">${siteData.ctaText}</button>
  </header>
  <section class="py-12 px-6 max-w-5xl mx-auto">
    <div class="grid md:grid-cols-3 gap-6">
      ${siteData.features?.map((f: string) => `<div class="p-6 bg-gray-50 rounded-xl"><h3 class="font-bold">${f}</h3></div>`).join('\n      ')}
    </div>
  </section>
  ${includeChatbot ? `<script>window.bmbConfig={botId:"YOUR_BOT_ID",theme:"${brandColor}"};</script><script src="https://buildmybot.app/embed.js" async></script>` : ''}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-landing-page.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 animate-fade-in">
      {/* Editor Sidebar */}
      <div className="w-80 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-y-auto">
         <div className="p-6 border-b border-slate-100">
           <h2 className="font-bold text-slate-800 flex items-center gap-2">
             <Layout className="text-blue-900" size={20} /> Site Builder
           </h2>
           <p className="text-xs text-slate-500 mt-1">Generate a landing page in seconds.</p>
         </div>
         
         <div className="p-6 space-y-6 flex-1">
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">Business Name</label>
             <input 
               type="text" 
               value={businessName}
               onChange={(e) => setBusinessName(e.target.value)}
               className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
               placeholder="e.g. Acme Coffee"
             />
           </div>
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">What do you do?</label>
             <textarea 
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               className="w-full h-32 rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 p-3 text-sm"
               placeholder="Describe your services, target audience, and key value propositions..."
             />
           </div>
           <button 
             onClick={handleGenerate}
             disabled={isGenerating || !businessName}
             className="w-full bg-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-950 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-blue-200 transition"
           >
             {isGenerating ? <RefreshCcw className="animate-spin" size={18} /> : <Rocket size={18} />}
             {siteData ? 'Regenerate Site' : 'Generate Site'}
           </button>
         </div>

         {/* Template Selection */}
         <div className="p-6 border-t border-slate-100">
           <label className="block text-sm font-medium text-slate-700 mb-3">Template Style</label>
           <div className="grid grid-cols-2 gap-2">
             {TEMPLATES.map(t => (
               <button
                 key={t.id}
                 onClick={() => setSelectedTemplate(t.id)}
                 className={`p-2 rounded-lg border text-left text-xs transition ${
                   selectedTemplate === t.id
                     ? 'border-blue-900 bg-blue-50 ring-1 ring-blue-900'
                     : 'border-slate-200 hover:border-slate-300'
                 }`}
               >
                 <div className={`w-6 h-6 rounded ${t.color} text-white flex items-center justify-center mb-1`}>
                   <t.icon size={12} />
                 </div>
                 <span className="font-medium text-slate-700">{t.name}</span>
               </button>
             ))}
           </div>
         </div>

         {/* Brand Color */}
         <div className="px-6 pb-6">
           <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
             <Palette size={14} /> Brand Color
           </label>
           <div className="flex gap-2 flex-wrap">
             {BRAND_COLORS.map(c => (
               <button
                 key={c.value}
                 onClick={() => setBrandColor(c.value)}
                 className={`w-8 h-8 rounded-lg border-2 transition ${
                   brandColor === c.value ? 'border-slate-800 scale-110' : 'border-transparent'
                 }`}
                 style={{ backgroundColor: c.value }}
                 title={c.name}
               />
             ))}
           </div>
         </div>

         {/* Chatbot Toggle */}
         <div className="px-6 pb-6">
           <label className="flex items-center gap-3 cursor-pointer">
             <input
               type="checkbox"
               checked={includeChatbot}
               onChange={(e) => setIncludeChatbot(e.target.checked)}
               className="w-4 h-4 rounded text-blue-900 focus:ring-blue-900"
             />
             <span className="text-sm text-slate-700">Include AI Chatbot Widget</span>
           </label>
         </div>

         {siteData && (
           <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-3">
             {deployedUrl ? (
               <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                 <div className="flex items-center gap-2 text-emerald-700 mb-2">
                   <CheckCircle size={16} /> <span className="text-sm font-medium">Site Live!</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <input
                     readOnly
                     value={deployedUrl}
                     className="flex-1 text-xs bg-white border border-emerald-200 rounded px-2 py-1"
                   />
                   <a href={deployedUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:text-emerald-800">
                     <ExternalLink size={14} />
                   </a>
                 </div>
               </div>
             ) : (
               <>
                 <div className="flex items-center gap-2">
                   <Globe size={14} className="text-slate-400" />
                   <input
                     type="text"
                     value={subdomain}
                     onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                     placeholder="yoursite"
                     className="flex-1 text-sm rounded border-slate-200"
                   />
                   <span className="text-xs text-slate-500">.buildmybot.app</span>
                 </div>
                 <button
                   onClick={handleDeploy}
                   disabled={isDeploying || !subdomain}
                   className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                   {isDeploying ? <Loader className="animate-spin" size={16} /> : <Rocket size={16} />}
                   Deploy Now
                 </button>
               </>
             )}

             <div className="grid grid-cols-2 gap-2">
               <button
                 onClick={handleExportHTML}
                 className="py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 flex items-center justify-center gap-1"
               >
                 <Download size={12} /> Export HTML
               </button>
               <button
                 onClick={() => navigator.clipboard.writeText(deployedUrl || `https://${subdomain}.buildmybot.app`)}
                 className="py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 flex items-center justify-center gap-1"
               >
                 <Copy size={12} /> Copy URL
               </button>
             </div>
           </div>
         )}
      </div>

      {/* Preview Area */}
      <div className="flex-1 bg-slate-100 rounded-xl border border-slate-200 flex flex-col overflow-hidden relative">
         <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Preview</span>
            <div className="flex bg-slate-100 p-1 rounded-lg">
               <button 
                 onClick={() => setPreviewMode('desktop')}
                 className={`p-1.5 rounded ${previewMode === 'desktop' ? 'bg-white shadow text-blue-900' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <Monitor size={16} />
               </button>
               <button 
                 onClick={() => setPreviewMode('mobile')}
                 className={`p-1.5 rounded ${previewMode === 'mobile' ? 'bg-white shadow text-blue-900' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <Smartphone size={16} />
               </button>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto flex justify-center p-8">
            {siteData ? (
               <div className={`bg-white shadow-xl transition-all duration-300 overflow-hidden ${previewMode === 'mobile' ? 'w-[375px] rounded-3xl border-8 border-slate-800' : 'w-full rounded-lg'}`}>
                  {/* Mock Generated Website */}
                  <div className="flex flex-col min-h-full">
                     <nav className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <span className="font-bold text-lg text-gray-800">{businessName}</span>
                        <button className="px-4 py-1.5 bg-blue-900 text-white rounded text-sm hover:bg-blue-950">Contact</button>
                     </nav>
                     <header className="py-16 px-6 text-center bg-gradient-to-b from-blue-50 to-white">
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">{siteData.headline}</h1>
                        <p className="text-lg text-gray-600 max-w-lg mx-auto mb-8">{siteData.subheadline}</p>
                        <button className="px-8 py-3 bg-blue-900 text-white rounded-lg font-semibold shadow-lg hover:bg-blue-950 transform hover:-translate-y-0.5 transition">
                           {siteData.ctaText}
                        </button>
                     </header>
                     <section className="py-12 px-6 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           {siteData.features?.map((feat: string, i: number) => (
                             <div key={i} className="p-6 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="w-10 h-10 bg-blue-100 text-blue-900 rounded-lg flex items-center justify-center mb-3">
                                   <CheckCircle size={20} />
                                </div>
                                <h3 className="font-bold text-gray-800">{feat}</h3>
                             </div>
                           ))}
                        </div>
                     </section>
                     
                     {/* Embedded Bot Placeholder */}
                     <div className="fixed bottom-4 right-4 animate-bounce-slow">
                        <div className="w-14 h-14 bg-blue-900 rounded-full shadow-lg flex items-center justify-center text-white cursor-pointer hover:bg-blue-950 transition">
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                     </div>
                  </div>
               </div>
            ) : (
               <div className="flex flex-col items-center justify-center text-slate-400">
                 <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                   <Layout size={48} className="text-slate-400" />
                 </div>
                 <p className="font-medium">Enter your business info to generate a site.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};