import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Star, Download, Eye, Tag, Zap, Loader, CheckCircle, X, Info } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { edgeFunctions } from '../../services/edgeFunctions';
import { MarketplaceTemplate } from '../../types';

interface MarketplaceProps {
  onInstall?: (template: MarketplaceTemplate, newBotId?: string) => void;
}

// Fallback templates for when database is unavailable
const FALLBACK_TEMPLATES: MarketplaceTemplate[] = [
  {
    id: 't1',
    name: 'Real Estate Scheduler',
    category: 'Real Estate',
    description: 'Qualifies leads, collects budget/location info, and schedules viewing appointments automatically.',
    price: 0,
    installCount: 1240,
    rating: 4.8,
    featured: true,
    botConfig: {},
    tags: ['Scheduling', 'Lead Gen']
  },
];

const collectTemplateTags = (templates: MarketplaceTemplate[]): string[] => {
  const allTags = templates.flatMap(t => t.tags || []);
  return Array.from(new Set(allTags));
};

const filterTemplates = (templates: MarketplaceTemplate[], filters: {
  category: string;
  searchTerm: string;
  priceFilter: 'all' | 'free' | 'paid';
  selectedTags: string[];
  sortBy: 'popular' | 'rating' | 'newest';
}) => {
  let filtered = templates;

  if (filters.category !== 'All') {
    if (filters.category === 'Featured') {
      filtered = filtered.filter(t => t.featured);
    } else {
      filtered = filtered.filter(t => t.category === filters.category);
    }
  }

  if (filters.searchTerm) {
    const lowercasedTerm = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(lowercasedTerm) ||
      t.description.toLowerCase().includes(lowercasedTerm) ||
      t.category.toLowerCase().includes(lowercasedTerm)
    );
  }

  if (filters.priceFilter === 'free') {
    filtered = filtered.filter(t => t.price === 0);
  } else if (filters.priceFilter === 'paid') {
    filtered = filtered.filter(t => t.price > 0);
  }

  if (filters.selectedTags.length > 0) {
    filtered = filtered.filter(t =>
      filters.selectedTags.every(tag => t.tags?.includes(tag))
    );
  }

  switch (filters.sortBy) {
    case 'rating':
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'newest':
      // Assuming ID is a timestamp or sequential
      filtered.sort((a, b) => b.id.localeCompare(a.id));
      break;
    case 'popular':
    default:
      filtered.sort((a, b) => (b.installCount || 0) - (a.installCount || 0));
      break;
  }

  return filtered;
};

export const Marketplace: React.FC<MarketplaceProps> = ({ onInstall }) => {
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>(FALLBACK_TEMPLATES);
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest'>('popular');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<MarketplaceTemplate | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>(collectTemplateTags(FALLBACK_TEMPLATES));
  const [loading, setLoading] = useState(true);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!supabase) {
        setAvailableTags(collectTemplateTags(FALLBACK_TEMPLATES));
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('marketplace_templates')
          .select('*')
          .order('install_count', { ascending: false });

        if (fetchError) {
          console.error('Error fetching templates:', fetchError);
          return;
        }

        if (data && data.length > 0) {
          const mappedTemplates: MarketplaceTemplate[] = data.map((t: any) => ({
            id: t.id,
            name: t.name,
            category: t.category,
            description: t.description,
            price: t.price || 0,
            installCount: t.install_count || 0,
            rating: t.rating,
            featured: t.featured || false,
            botConfig: t.bot_config || {},
            tags: t.tags || [],
            previewUrl: t.preview_url || undefined
          }));
          setTemplates(mappedTemplates);
          setAvailableTags(collectTemplateTags(mappedTemplates));
        } else {
          setAvailableTags(collectTemplateTags(FALLBACK_TEMPLATES));
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleInstall = async (template: MarketplaceTemplate) => {
    setInstallingId(template.id);
    setError(null);

    try {
      if (!supabase) {
        if (onInstall) {
          onInstall(template);
          setInstalledIds(prev => new Set(prev).add(template.id));
          setError('Running in demo mode. Bot created locally; connect Supabase to enable tracked installs.');
        } else {
          setError('Supabase is not configured. Add your project keys to enable one-click installs.');
        }
        return;
      }

      const response = await edgeFunctions.installTemplate(template.id);

      setInstalledIds(prev => new Set(prev).add(template.id));

      setTemplates(prev => prev.map(t =>
        t.id === template.id
          ? { ...t, installCount: t.installCount + 1 }
          : t
      ));
      setPreviewTemplate(null);

      if (onInstall) {
        onInstall(template, response.bot.id);
      }
    } catch (err) {
      console.error('Installation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to install template');
    } finally {
      setInstallingId(null);
    }
  };

  const filteredTemplates = filterTemplates(templates, {
    category: filter,
    searchTerm,
    priceFilter,
    selectedTags,
    sortBy,
  });

  const categories = ['All', 'Featured', ...Array.from(new Set(templates.map(t => t.category)))];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const buildPreviewMessages = (template: MarketplaceTemplate) => [
    {
      role: 'User',
      text: `Can you help with ${template.name}?`,
    },
    {
      role: 'Bot',
      text: `Absolutely. I specialize in ${template.description}. Let's get a few quick details to help you faster.`,
    },
    {
      role: 'User',
      text: 'What will you do first?',
    },
    {
      role: 'Bot',
      text: 'I will greet visitors, capture their contact info, and either answer their questions or schedule a follow-up for your team.',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-blue-900" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Template Marketplace</h2>
          <p className="text-slate-500">Jumpstart your bot with pre-trained industry templates.</p>
        </div>
        <div className="flex gap-2">
           <button className="px-4 py-2 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-950 shadow-sm transition flex items-center gap-2">
             <Zap size={16} /> Request Custom Template
           </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search templates (e.g., 'Real Estate', 'Support')..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border-slate-200 focus:ring-blue-900 focus:border-blue-900"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <select
               value={priceFilter}
               onChange={(e) => setPriceFilter(e.target.value as typeof priceFilter)}
               className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
             >
               <option value="all">All prices</option>
               <option value="free">Free only</option>
               <option value="paid">Paid</option>
             </select>
             <select
               value={sortBy}
               onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
               className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
             >
               <option value="popular">Most popular</option>
               <option value="rating">Highest rated</option>
               <option value="newest">Newest</option>
             </select>
          </div>
        </div>
        <div className="flex gap-2 w-full overflow-x-auto no-scrollbar pb-2 md:pb-0 flex-wrap">
           {categories.map(cat => (
             <button
               key={cat}
               onClick={() => setFilter(cat)}
               className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                 filter === cat 
                 ? 'bg-slate-900 text-white' 
                 : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
               }`}
             >
               {cat}
             </button>
           ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
            <Tag size={14} /> Filter by tags
          </div>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag: any) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-900 text-white border-blue-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tag}
              </button>
            ))}
            {availableTags.length === 0 && (
              <span className="text-xs text-slate-400">Tags will appear once templates load.</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <div key={template.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition group flex flex-col h-full">
             <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-blue-50 text-blue-900 rounded-xl group-hover:bg-blue-900 group-hover:text-white transition">
                     <ShoppingBag size={24} />
                   </div>
                   {template.rating && (
                     <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-1 rounded-full text-xs font-bold">
                       <Star size={12} fill="currentColor" /> {template.rating}
                     </div>
                   )}
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{template.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">{template.description}</p>
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.tags.map((tag: any) => (
                      <span key={tag} className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        <Tag size={10} /> {tag}
                      </span>
                    ))}
                  </div>
                )}
             </div>
             <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between rounded-b-xl">
                <div>
                   <span className="text-xs text-slate-500 block mb-0.5">{template.installCount.toLocaleString()} installs</span>
                   <span className="font-bold text-slate-800">{template.price === 0 ? 'Free' : `$${template.price}`}</span>
                </div>
                <div className="flex gap-2">
                   <button 
                     className="p-2 text-slate-500 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition"
                     onClick={() => setPreviewTemplate(template)}
                   >
                     <Eye size={18} />
                   </button>
                   {installedIds.has(template.id) ? (
                     <button
                       disabled
                       className="flex items-center gap-2 px-3 py-2 bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-lg shadow-sm"
                     >
                       <CheckCircle size={16} /> Installed
                     </button>
                   ) : (
                     <button
                       onClick={() => handleInstall(template)}
                       disabled={installingId === template.id}
                       className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-800 hover:text-white transition shadow-sm disabled:opacity-50"
                     >
                       {installingId === template.id ? (
                         <><Loader className="animate-spin" size={16} /> Installing...</>
                       ) : (
                         <><Download size={16} /> Clone</>
                       )}
                     </button>
                   )}
                </div>
             </div>
          </div>
        ))}
      </div>

      {previewTemplate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-start gap-4">
              <div className="p-3 bg-blue-50 text-blue-900 rounded-xl">
                <ShoppingBag size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">{previewTemplate.category}</p>
                    <h3 className="text-xl font-bold text-slate-900">{previewTemplate.name}</h3>
                  </div>
                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className="text-sm text-slate-600 mt-2">{previewTemplate.description}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {previewTemplate.tags?.map((tag: any) => (
                    <span key={tag} className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                      <Tag size={10} className="inline mr-1" /> {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold mb-2">
                    <Info size={16} /> Highlights
                  </div>
                  <ul className="space-y-2 text-sm text-slate-600 list-disc list-inside">
                    {(previewTemplate.tags || ['Fast setup', 'Lead capture', '24/7 coverage']).slice(0, 4).map((tag: any) => (
                      <li key={tag}>{tag}</li>
                    ))}
                    <li>Optimized to be installed via marketplace-install-template</li>
                  </ul>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold mb-2">
                    <Eye size={16} /> Preview conversation
                  </div>
                  <div className="space-y-3">
                    {buildPreviewMessages(previewTemplate).map((message, idx) => (
                      <div key={idx} className={`p-3 rounded-lg ${message.role === 'Bot' ? 'bg-white border border-slate-200' : 'bg-blue-900 text-white'}`}>
                        <p className="text-xs uppercase font-bold mb-1 text-slate-500">{message.role}</p>
                        <p className={message.role === 'Bot' ? 'text-slate-700 text-sm' : 'text-sm'}>{message.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">{previewTemplate.installCount.toLocaleString()} installs</p>
                <p className="text-lg font-bold text-slate-900">{previewTemplate.price === 0 ? 'Free' : `$${previewTemplate.price}`}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => handleInstall(previewTemplate)}
                  disabled={installingId === previewTemplate.id}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 shadow-sm disabled:opacity-50"
                >
                  {installingId === previewTemplate.id ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                  {installingId === previewTemplate.id ? 'Installing...' : 'Install template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
