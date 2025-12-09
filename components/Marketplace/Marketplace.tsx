import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Star, Download, Eye, Tag, Zap, Loader, CheckCircle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { edgeFunctions } from '../../services/edgeFunctions';

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  installCount: number;
  rating: number | null;
  featured: boolean;
  botConfig: Record<string, unknown>;
  tags?: string[];
}

interface MarketplaceProps {
  onInstall?: (template: Template, newBotId: string) => void;
}

// Fallback templates for when database is unavailable
const FALLBACK_TEMPLATES: Template[] = [
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
  {
    id: 't2',
    name: 'SaaS Support Pro',
    category: 'Technology',
    description: 'Trained on technical documentation structure. Handles L1 support tickets and API queries.',
    price: 49,
    installCount: 856,
    rating: 4.9,
    featured: false,
    botConfig: {},
    tags: ['Support', 'Technical']
  },
  {
    id: 't3',
    name: 'Dental Clinic Front Desk',
    category: 'Healthcare',
    description: 'Compassionate receptionist that handles emergencies, bookings, and insurance FAQs.',
    price: 29,
    installCount: 2100,
    rating: 4.7,
    featured: false,
    botConfig: {},
    tags: ['Healthcare', 'Booking']
  },
  {
    id: 't4',
    name: 'E-commerce Sales Rep',
    category: 'Retail',
    description: 'Product recommender that upsells items based on user preferences and cart contents.',
    price: 0,
    installCount: 3400,
    rating: 4.6,
    featured: true,
    botConfig: {},
    tags: ['Sales', 'Retail']
  },
  {
    id: 't5',
    name: 'Gym Membership Closer',
    category: 'Fitness',
    description: 'High-energy sales agent designed to book trial sessions and overcome pricing objections.',
    price: 19,
    installCount: 520,
    rating: 4.5,
    featured: false,
    botConfig: {},
    tags: ['Sales', 'Fitness']
  }
];

export const Marketplace: React.FC<MarketplaceProps> = ({ onInstall }) => {
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState<Template[]>(FALLBACK_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Fetch templates from database on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!supabase) {
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
          // Keep fallback templates on error
          return;
        }

        if (data && data.length > 0) {
          // Map database fields to component interface
          const mappedTemplates: Template[] = data.map(t => ({
            id: t.id,
            name: t.name,
            category: t.category,
            description: t.description,
            price: t.price || 0,
            installCount: t.install_count || 0,
            rating: t.rating,
            featured: t.featured || false,
            botConfig: t.bot_config || {},
            tags: t.tags || []
          }));
          setTemplates(mappedTemplates);
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // Handle template installation
  const handleInstall = async (template: Template) => {
    setInstallingId(template.id);
    setError(null);

    try {
      const response = await edgeFunctions.installTemplate(template.id);

      // Mark as installed
      setInstalledIds(prev => new Set(prev).add(template.id));

      // Update install count locally
      setTemplates(prev => prev.map(t =>
        t.id === template.id
          ? { ...t, installCount: t.installCount + 1 }
          : t
      ));

      // Notify parent component
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

  const filteredTemplates = templates.filter(t => {
    const matchesCategory = filter === 'All' || t.category === filter;
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['All', ...Array.from(new Set(templates.map(t => t.category)))];

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

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
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
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
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
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <div key={template.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition group flex flex-col h-full">
             <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-blue-50 text-blue-900 rounded-xl group-hover:bg-blue-900 group-hover:text-white transition">
                     <ShoppingBag size={24} />
                   </div>
                   <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold">
                     <Star size={12} fill="currentColor" /> {template.rating}
                   </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{template.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">{template.description}</p>
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.tags.map(tag => (
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
                   <button className="p-2 text-slate-500 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition">
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
    </div>
  );
};