import React, { useEffect, useState } from 'react';
import { Layout, Rocket, Monitor, Smartphone, CheckCircle, RefreshCcw, Save, UploadCloud, Download, Globe } from 'lucide-react';
import { generateWebsiteStructure } from '../../services/openaiService';
import { dbService } from '../../services/dbService';
import { buildStaticHtml, createFirebaseStaticExport, slugifyPageSlug, uploadPageToStorage } from '../../services/websiteService';
import { PageContent, WebsitePage } from '../../types';

const defaultPage: WebsitePage = {
  title: 'New Landing Page',
  slug: 'new-landing-page',
  content: {
    headline: 'Launch a polished site with your AI agent',
    subheadline: 'Generate a high-converting landing page, embed your bot, and publish instantly.',
    features: ['AI-powered copy', 'SEO metadata included', 'Ready for Supabase Storage'],
    ctaText: 'Launch My Page'
  },
  seoMetadata: {
    title: 'AI Landing Page',
    description: 'Generate and publish your AI-optimized landing page with BuildMyBot.',
    keywords: ['ai', 'landing page', 'buildmybot']
  },
  published: false
};

export const WebsiteBuilder: React.FC = () => {
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [pageDraft, setPageDraft] = useState<WebsitePage>(defaultPage);
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [status, setStatus] = useState<string | null>(null);
  const [manualSlug, setManualSlug] = useState(false);
  const [storageUrl, setStorageUrl] = useState<string | null>(null);
  const [loadingPages, setLoadingPages] = useState(false);

  useEffect(() => {
    const loadPages = async () => {
      setLoadingPages(true);
      try {
        const existing = await dbService.getWebsitePages();
        if (existing.length > 0) {
          setPages(existing);
          setPageDraft(existing[0]);
          setManualSlug(true);
        }
      } finally {
        setLoadingPages(false);
      }
    };

    loadPages();
  }, []);

  const updateContentField = (field: keyof PageContent, value: string | string[]) => {
    setPageDraft((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        [field]: value
      }
    }));
  };

  const handleGenerate = async () => {
    if (!businessName || !description) return;
    setIsGenerating(true);
    try {
      const resultJson = await generateWebsiteStructure(businessName, description);
      const parsed = JSON.parse(resultJson) as Partial<PageContent>;

      const generatedContent: PageContent = {
        headline: parsed.headline || `Welcome to ${businessName}`,
        subheadline: parsed.subheadline || `We help with ${description}`,
        features: parsed.features || ['Quality Service', 'Expert Team', '24/7 Support'],
        ctaText: parsed.ctaText || 'Get Started'
      };

      setPageDraft((prev) => ({
        ...prev,
        title: prev.title === defaultPage.title ? businessName : prev.title,
        content: {
          ...prev.content,
          ...generatedContent
        },
        seoMetadata: {
          title: prev.seoMetadata?.title || `${businessName} | ${generatedContent.headline}`,
          description: prev.seoMetadata?.description || generatedContent.subheadline,
          keywords: prev.seoMetadata?.keywords?.length
            ? prev.seoMetadata.keywords
            : generatedContent.features?.slice(0, 5) || []
        }
      }));

      setStatus('Draft updated from AI suggestion.');
    } catch (error) {
      console.error('Failed to parse website JSON', error);
      setPageDraft((prev) => ({
        ...prev,
        content: {
          ...prev.content,
          headline: `Welcome to ${businessName}`,
          subheadline: `We provide the best services for ${description}`,
          features: ['Quality Service', 'Expert Team', '24/7 Support'],
          ctaText: 'Get Started Now'
        }
      }));
      setStatus('Using fallback content.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePage = async (publish = false): Promise<WebsitePage | null> => {
    setIsSaving(true);
    setStatus(null);

    try {
      const sanitizedSlug = slugifyPageSlug(pageDraft.slug || pageDraft.title);
      const payload: WebsitePage = {
        ...pageDraft,
        slug: sanitizedSlug,
        seoMetadata: {
          title: pageDraft.seoMetadata?.title || pageDraft.title,
          description: pageDraft.seoMetadata?.description || pageDraft.content?.subheadline || '',
          keywords: pageDraft.seoMetadata?.keywords?.filter(Boolean) || [],
          canonicalUrl: pageDraft.seoMetadata?.canonicalUrl,
          ogImage: pageDraft.seoMetadata?.ogImage
        },
        published: publish ? true : pageDraft.published
      };

      const saved = await dbService.saveWebsitePage(payload);
      if (!saved) {
        setStatus('Unable to save page. Please ensure you are signed in.');
        return null;
      }

      setPageDraft(saved);
      setPages((prev) => {
        const idx = prev.findIndex((p) => p.id === saved.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [saved, ...prev];
      });
      setStatus(publish ? 'Page published and saved.' : 'Draft saved.');

      return saved;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save page';
      setStatus(message);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishToStorage = async () => {
    setIsPublishing(true);
    setStatus(null);
    try {
      const saved = await handleSavePage(true);
      if (!saved) return;

      const html = buildStaticHtml(saved);
      const publicUrl = await uploadPageToStorage(saved, html);

      setStorageUrl(publicUrl);
      setStatus('Published to Supabase Storage.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish to storage';
      setStatus(message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleFirebaseExport = async () => {
    if (typeof document === 'undefined') {
      setStatus('Static export can only run in the browser.');
      return;
    }

    const saved = await handleSavePage(false);
    if (!saved) return;

    const html = buildStaticHtml(saved);
    const exportFile = createFirebaseStaticExport(saved, html);
    const anchor = document.createElement('a');
    anchor.href = exportFile.url;
    anchor.download = exportFile.fileName;
    anchor.click();

    setStatus('Static export prepared for Firebase Hosting.');
  };

  const featureText = (pageDraft.content?.features || []).join('\n');
  const keywords = pageDraft.seoMetadata?.keywords?.join(', ') || '';

  const handleTitleChange = (value: string) => {
    setPageDraft((prev) => ({
      ...prev,
      title: value,
      slug: manualSlug ? prev.slug : slugifyPageSlug(value)
    }));
  };

  const handleSlugChange = (value: string) => {
    setManualSlug(true);
    setPageDraft((prev) => ({ ...prev, slug: slugifyPageSlug(value) }));
  };

  const handleKeywordsChange = (value: string) => {
    const split = value
      .split(',')
      .map((word) => word.trim())
      .filter(Boolean);
    setPageDraft((prev) => ({
      ...prev,
      seoMetadata: {
        ...prev.seoMetadata,
        keywords: split
      }
    }));
  };

  const handleSelectPage = (page: WebsitePage) => {
    setPageDraft(page);
    setManualSlug(true);
    setStatus(null);
  };

  const handleCreateNewPage = () => {
    const slug = slugifyPageSlug(`page-${Date.now()}`);
    setPageDraft({
      ...defaultPage,
      id: undefined,
      slug,
      title: 'Untitled Page'
    });
    setManualSlug(false);
    setStatus(null);
  };

  const previewContent = pageDraft.content || defaultPage.content;

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 lg:gap-6 animate-fade-in">
      {/* Editor Sidebar */}
      <div className="w-full lg:w-80 shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-y-auto max-h-[50vh] lg:max-h-none">
         <div className="p-6 border-b border-slate-100 space-y-1">
           <div className="flex items-center gap-2">
             <Layout className="text-blue-900" size={20} />
             <div>
               <h2 className="font-bold text-slate-800">Site Builder</h2>
               <p className="text-xs text-slate-500">Generate + edit SEO metadata.</p>
             </div>
           </div>
           {status && (
             <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-2">
               <CheckCircle size={14} /> {status}
             </div>
           )}
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
               className="w-full h-24 rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900 p-3 text-sm"
               placeholder="Describe your services, target audience, and key value propositions..."
             />
           </div>
           <button 
             onClick={handleGenerate}
             disabled={isGenerating || !businessName}
             className="w-full bg-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-950 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-blue-200 transition"
           >
             {isGenerating ? <RefreshCcw className="animate-spin" size={18} /> : <Rocket size={18} />}
             Generate Page Outline
           </button>

           <div className="border-t border-slate-100 pt-4 space-y-2">
             <div className="flex gap-2">
               <button
                 onClick={() => handleSavePage(false)}
                 disabled={isSaving}
                 className="flex-1 bg-white border border-slate-200 text-slate-800 py-2 rounded-lg text-sm font-medium hover:border-blue-300 flex items-center justify-center gap-2"
               >
                 <Save size={16} /> {isSaving ? 'Saving...' : 'Save Draft'}
               </button>
               <button
                 onClick={handlePublishToStorage}
                 disabled={isPublishing}
                 className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center justify-center gap-2"
               >
                <UploadCloud size={16} /> {isPublishing ? 'Publishing...' : 'Publish'}
               </button>
             </div>
             <button
               onClick={handleFirebaseExport}
               className="w-full bg-blue-50 text-blue-900 py-2 rounded-lg text-sm font-semibold hover:bg-blue-100 border border-blue-100 flex items-center justify-center gap-2"
             >
               <Download size={16} /> Export static HTML for Firebase Hosting
             </button>
             {storageUrl && (
               <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2 break-words">
                 Published URL: <a className="text-blue-900 font-medium" href={storageUrl} target="_blank" rel="noreferrer">{storageUrl}</a>
               </div>
             )}
           </div>
         </div>

         <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-3">
           <div className="flex items-center justify-between">
             <span className="text-xs font-semibold text-slate-500 uppercase">Your pages</span>
             <button onClick={handleCreateNewPage} className="text-xs text-blue-900 hover:text-blue-950 font-semibold">+ New</button>
           </div>
           {loadingPages && <p className="text-xs text-slate-500">Loading pages...</p>}
           <div className="space-y-2">
             {pages.map((page) => (
               <button
                 key={page.id}
                 onClick={() => handleSelectPage(page)}
                 className={`w-full text-left p-3 rounded-lg border text-sm flex items-center gap-2 ${
                   pageDraft.id === page.id ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white hover:border-blue-200'
                 }`}
               >
                 <Globe size={14} />
                 <div>
                   <div className="font-semibold">{page.title}</div>
                   <div className="text-xs text-slate-500">/{page.slug}</div>
                 </div>
               </button>
             ))}
             {pages.length === 0 && !loadingPages && (
               <p className="text-xs text-slate-500">No pages yet. Save your first draft to sync with Supabase.</p>
             )}
           </div>
         </div>
      </div>

      {/* Builder + Preview */}
      <div className="flex-1 bg-slate-100 rounded-xl border border-slate-200 flex flex-col overflow-hidden relative">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-6 overflow-y-auto">
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Page Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Title</label>
                  <input
                    value={pageDraft.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    placeholder="Landing page title"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Slug</label>
                  <input
                    value={pageDraft.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    placeholder="my-awesome-page"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Hero & CTA</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Headline</label>
                  <input
                    value={previewContent.headline}
                    onChange={(e) => updateContentField('headline', e.target.value)}
                    className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    placeholder="Your hero headline"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Subheadline</label>
                  <textarea
                    value={previewContent.subheadline || ''}
                    onChange={(e) => updateContentField('subheadline', e.target.value)}
                    className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    placeholder="Explain your value proposition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">CTA Text</label>
                  <input
                    value={previewContent.ctaText || ''}
                    onChange={(e) => updateContentField('ctaText', e.target.value)}
                    className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    placeholder="Get Started"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Features (one per line)</label>
                  <textarea
                    value={featureText}
                    onChange={(e) => updateContentField('features', e.target.value.split('\n').map((f) => f.trim()).filter(Boolean))}
                    className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    rows={4}
                    placeholder="Fast onboarding\nSEO ready\nEmbed your bot"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">SEO Metadata</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">SEO Title</label>
                  <input
                    value={pageDraft.seoMetadata?.title || ''}
                    onChange={(e) =>
                      setPageDraft((prev) => ({
                        ...prev,
                        seoMetadata: {
                          ...prev.seoMetadata,
                          title: e.target.value
                        }
                      }))
                    }
                    className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    placeholder="Keyword-rich page title"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Meta Description</label>
                  <textarea
                    value={pageDraft.seoMetadata?.description || ''}
                    onChange={(e) =>
                      setPageDraft((prev) => ({
                        ...prev,
                        seoMetadata: {
                          ...prev.seoMetadata,
                          description: e.target.value
                        }
                      }))
                    }
                    className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    placeholder="Summarize the page for search engines"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Keywords (comma separated)</label>
                  <input
                    value={keywords}
                    onChange={(e) => handleKeywordsChange(e.target.value)}
                    className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    placeholder="ai bots, landing pages, buildmybot"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">Canonical URL</label>
                    <input
                      value={pageDraft.seoMetadata?.canonicalUrl || ''}
                      onChange={(e) =>
                        setPageDraft((prev) => ({
                          ...prev,
                          seoMetadata: {
                            ...prev.seoMetadata,
                            canonicalUrl: e.target.value
                          }
                        }))
                      }
                      className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                      placeholder="https://example.com/page"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">OG Image URL</label>
                    <input
                      value={pageDraft.seoMetadata?.ogImage || ''}
                      onChange={(e) =>
                        setPageDraft((prev) => ({
                          ...prev,
                          seoMetadata: {
                            ...prev.seoMetadata,
                            ogImage: e.target.value
                          }
                        }))
                      }
                      className="w-full rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                      placeholder="https://example.com/og-image.png"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
              <div className={`bg-white shadow-xl transition-all duration-300 overflow-hidden ${previewMode === 'mobile' ? 'w-[375px] rounded-3xl border-8 border-slate-800' : 'w-full rounded-lg'}`}>
                <div className="flex flex-col min-h-full">
                  <nav className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <span className="font-bold text-lg text-gray-800">{pageDraft.title || 'New Page'}</span>
                    <button className="px-4 py-1.5 bg-blue-900 text-white rounded text-sm hover:bg-blue-950">Contact</button>
                  </nav>
                  <header className="py-16 px-6 text-center bg-gradient-to-b from-blue-50 to-white">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">{previewContent.headline}</h1>
                    <p className="text-lg text-gray-600 max-w-lg mx-auto mb-8">{previewContent.subheadline}</p>
                    <button className="px-8 py-3 bg-blue-900 text-white rounded-lg font-semibold shadow-lg hover:bg-blue-950 transform hover:-translate-y-0.5 transition">
                      {previewContent.ctaText || 'Get Started'}
                    </button>
                  </header>
                  <section className="py-12 px-6 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {(previewContent.features || []).map((feat, i) => (
                        <div key={i} className="p-6 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="w-10 h-10 bg-blue-100 text-blue-900 rounded-lg flex items-center justify-center mb-3">
                            <CheckCircle size={20} />
                          </div>
                          <h3 className="font-bold text-gray-800">{feat}</h3>
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="p-6 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                    <span>/{pageDraft.slug}</span>
                    <span className="text-emerald-600 font-semibold">{pageDraft.published ? 'Published' : 'Draft'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
