import React, { useState } from 'react';
import { Search, ShoppingBag, Star, Download, Eye, Tag, Zap } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  installs: number;
  rating: number;
  tags: string[];
}

interface MarketplaceProps {
  onInstall?: (template: Template) => void;
}

const TEMPLATES: Template[] = [
  {
    id: 't1',
    name: 'Real Estate Scheduler',
    category: 'Real Estate',
    description: 'Qualifies leads, collects budget/location info, and schedules viewing appointments automatically.',
    price: 0,
    installs: 1240,
    rating: 4.8,
    tags: ['Scheduling', 'Lead Gen']
  },
  {
    id: 't2',
    name: 'SaaS Support Pro',
    category: 'Technology',
    description: 'Trained on technical documentation structure. Handles L1 support tickets and API queries.',
    price: 49,
    installs: 856,
    rating: 4.9,
    tags: ['Support', 'Technical']
  },
  {
    id: 't3',
    name: 'Dental Clinic Front Desk',
    category: 'Healthcare',
    description: 'Compassionate receptionist that handles emergencies, bookings, and insurance FAQs.',
    price: 29,
    installs: 2100,
    rating: 4.7,
    tags: ['Healthcare', 'Booking']
  },
  {
    id: 't4',
    name: 'E-commerce Sales Rep',
    category: 'Retail',
    description: 'Product recommender that upsells items based on user preferences and cart contents.',
    price: 0,
    installs: 3400,
    rating: 4.6,
    tags: ['Sales', 'Retail']
  },
  {
    id: 't5',
    name: 'Gym Membership Closer',
    category: 'Fitness',
    description: 'High-energy sales agent designed to book trial sessions and overcome pricing objections.',
    price: 19,
    installs: 520,
    rating: 4.5,
    tags: ['Sales', 'Fitness']
  },
  {
    id: 't6',
    name: 'Restaurant Reservationist',
    category: 'Hospitality',
    description: 'Manages table bookings, dietary restrictions, and opening hours queries.',
    price: 0,
    installs: 1800,
    rating: 4.8,
    tags: ['Booking', 'Food']
  },
  {
    id: 't7',
    name: 'Auto Service Scheduler',
    category: 'Automotive',
    description: 'Books service appointments, provides maintenance quotes, and handles inventory queries.',
    price: 39,
    installs: 410,
    rating: 4.7,
    tags: ['Booking', 'Service']
  },
  {
    id: 't8',
    name: 'Campaign Connector',
    category: 'Politicians',
    description: 'Engages constituents, explains policy positions, and collects donation pledges 24/7.',
    price: 99,
    installs: 150,
    rating: 4.9,
    tags: ['Engagement', 'Donations']
  },
  {
    id: 't9',
    name: 'Course Enrollment Bot',
    category: 'Education',
    description: 'Helps students find the right course, answers curriculum questions, and assists with enrollment.',
    price: 29,
    installs: 630,
    rating: 4.6,
    tags: ['Education', 'Sales']
  },
  {
    id: 't10',
    name: 'Legal Intake Specialist',
    category: 'Legal',
    description: 'Securely screens potential clients for case viability and schedules consultations.',
    price: 79,
    installs: 320,
    rating: 4.8,
    tags: ['Legal', 'Intake']
  },
  {
    id: 't11',
    name: 'Fan Engagement Bot',
    category: 'Influencer',
    description: 'Replies to fans, promotes merchandise drops, and collects email subscribers automatically.',
    price: 19,
    installs: 1100,
    rating: 4.7,
    tags: ['Social', 'Engagement']
  },
  {
    id: 't12',
    name: 'Emergency Dispatch Bot',
    category: 'Home Services',
    description: 'Immediate response for plumbers and HVAC. Triage emergencies and dispatch technicians.',
    price: 49,
    installs: 890,
    rating: 4.9,
    tags: ['Service', 'Urgent']
  },
  {
    id: 't13',
    name: 'City Hall 311 Agent',
    category: 'Government',
    description: 'Handles utility FAQs, payment routing, and general citizen inquiries. Reduces call volume.',
    price: 99,
    installs: 45,
    rating: 5.0,
    tags: ['Gov', 'Utilities', '311']
  }
];

export const Marketplace: React.FC<MarketplaceProps> = ({ onInstall }) => {
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = TEMPLATES.filter(t => {
    const matchesCategory = filter === 'All' || t.category === filter;
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['All', ...Array.from(new Set(TEMPLATES.map(t => t.category)))];

  return (
    <div className="space-y-6 animate-fade-in">
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
                <div className="flex flex-wrap gap-2 mb-4">
                  {template.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded">
                      <Tag size={10} /> {tag}
                    </span>
                  ))}
                </div>
             </div>
             <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between rounded-b-xl">
                <div>
                   <span className="text-xs text-slate-500 block mb-0.5">{template.installs.toLocaleString()} installs</span>
                   <span className="font-bold text-slate-800">{template.price === 0 ? 'Free' : `$${template.price}`}</span>
                </div>
                <div className="flex gap-2">
                   <button className="p-2 text-slate-500 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition">
                     <Eye size={18} />
                   </button>
                   <button 
                     onClick={() => onInstall && onInstall(template)}
                     className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-800 hover:text-white transition shadow-sm"
                   >
                     <Download size={16} /> Clone
                   </button>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};