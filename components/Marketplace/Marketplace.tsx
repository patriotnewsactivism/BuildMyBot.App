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
// Comprehensive list covering all major industries
const FALLBACK_TEMPLATES: Template[] = [
  // Real Estate
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
    name: 'Property Management Assistant',
    category: 'Real Estate',
    description: 'Handles tenant inquiries, maintenance requests, and rent payment questions 24/7.',
    price: 29,
    installCount: 890,
    rating: 4.7,
    featured: false,
    botConfig: {},
    tags: ['Support', 'Tenants']
  },

  // Healthcare
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
    name: 'Medical Practice Intake',
    category: 'Healthcare',
    description: 'Collects patient information, symptoms, and schedules appointments with appropriate providers.',
    price: 49,
    installCount: 1560,
    rating: 4.9,
    featured: true,
    botConfig: {},
    tags: ['Healthcare', 'Intake']
  },
  {
    id: 't5',
    name: 'Mental Health Support',
    category: 'Healthcare',
    description: 'Empathetic first-contact for therapy practices. Screens clients and books consultations.',
    price: 39,
    installCount: 720,
    rating: 4.8,
    featured: false,
    botConfig: {},
    tags: ['Mental Health', 'Booking']
  },

  // Technology
  {
    id: 't6',
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
    id: 't7',
    name: 'IT Helpdesk Agent',
    category: 'Technology',
    description: 'Resolves common IT issues, password resets, and escalates complex tickets intelligently.',
    price: 39,
    installCount: 1120,
    rating: 4.6,
    featured: false,
    botConfig: {},
    tags: ['IT Support', 'Helpdesk']
  },

  // Retail & E-commerce
  {
    id: 't8',
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
    id: 't9',
    name: 'Order Tracking Assistant',
    category: 'Retail',
    description: 'Answers shipping questions, tracks orders, and handles return/exchange requests.',
    price: 19,
    installCount: 2890,
    rating: 4.5,
    featured: false,
    botConfig: {},
    tags: ['Support', 'Logistics']
  },

  // Fitness & Wellness
  {
    id: 't10',
    name: 'Gym Membership Closer',
    category: 'Fitness',
    description: 'High-energy sales agent designed to book trial sessions and overcome pricing objections.',
    price: 19,
    installCount: 520,
    rating: 4.5,
    featured: false,
    botConfig: {},
    tags: ['Sales', 'Fitness']
  },
  {
    id: 't11',
    name: 'Personal Training Scheduler',
    category: 'Fitness',
    description: 'Books training sessions, handles class registrations, and answers program questions.',
    price: 0,
    installCount: 680,
    rating: 4.4,
    featured: false,
    botConfig: {},
    tags: ['Scheduling', 'Fitness']
  },

  // Legal
  {
    id: 't12',
    name: 'Law Firm Intake Specialist',
    category: 'Legal',
    description: 'Screens potential clients, collects case details, and schedules consultations with attorneys.',
    price: 59,
    installCount: 430,
    rating: 4.8,
    featured: false,
    botConfig: {},
    tags: ['Legal', 'Intake']
  },
  {
    id: 't13',
    name: 'Immigration Consultant',
    category: 'Legal',
    description: 'Answers visa questions, explains processes, and qualifies leads for immigration services.',
    price: 49,
    installCount: 320,
    rating: 4.7,
    featured: false,
    botConfig: {},
    tags: ['Legal', 'Immigration']
  },

  // Government & Public Sector
  {
    id: 't14',
    name: 'City Services Guide',
    category: 'Government',
    description: 'Helps citizens navigate city services, permits, and public information requests.',
    price: 0,
    installCount: 890,
    rating: 4.6,
    featured: true,
    botConfig: {},
    tags: ['Government', 'Services']
  },
  {
    id: 't15',
    name: 'County Information Bot',
    category: 'Government',
    description: 'Answers questions about county departments, tax info, and public records.',
    price: 0,
    installCount: 560,
    rating: 4.5,
    featured: false,
    botConfig: {},
    tags: ['Government', 'Information']
  },

  // Education
  {
    id: 't16',
    name: 'University Admissions Guide',
    category: 'Education',
    description: 'Answers prospective student questions about programs, deadlines, and application requirements.',
    price: 29,
    installCount: 1230,
    rating: 4.7,
    featured: false,
    botConfig: {},
    tags: ['Education', 'Admissions']
  },
  {
    id: 't17',
    name: 'Online Course Assistant',
    category: 'Education',
    description: 'Supports e-learning students with course navigation, deadlines, and content questions.',
    price: 19,
    installCount: 980,
    rating: 4.5,
    featured: false,
    botConfig: {},
    tags: ['Education', 'Support']
  },

  // Hospitality & Travel
  {
    id: 't18',
    name: 'Hotel Concierge Bot',
    category: 'Hospitality',
    description: 'Handles reservations, room service orders, and local recommendations for guests.',
    price: 39,
    installCount: 760,
    rating: 4.8,
    featured: false,
    botConfig: {},
    tags: ['Hospitality', 'Concierge']
  },
  {
    id: 't19',
    name: 'Travel Agency Specialist',
    category: 'Hospitality',
    description: 'Assists with trip planning, package inquiries, and booking assistance.',
    price: 29,
    installCount: 540,
    rating: 4.6,
    featured: false,
    botConfig: {},
    tags: ['Travel', 'Booking']
  },
  {
    id: 't20',
    name: 'Restaurant Reservations',
    category: 'Hospitality',
    description: 'Takes reservations, answers menu questions, and handles special dietary requests.',
    price: 0,
    installCount: 1890,
    rating: 4.7,
    featured: true,
    botConfig: {},
    tags: ['Restaurant', 'Booking']
  },

  // Financial Services
  {
    id: 't21',
    name: 'Insurance Quote Assistant',
    category: 'Financial',
    description: 'Collects information for insurance quotes and schedules agent consultations.',
    price: 49,
    installCount: 670,
    rating: 4.6,
    featured: false,
    botConfig: {},
    tags: ['Insurance', 'Lead Gen']
  },
  {
    id: 't22',
    name: 'Mortgage Pre-Qualifier',
    category: 'Financial',
    description: 'Pre-screens mortgage applicants and schedules consultations with loan officers.',
    price: 59,
    installCount: 420,
    rating: 4.8,
    featured: false,
    botConfig: {},
    tags: ['Mortgage', 'Qualification']
  },
  {
    id: 't23',
    name: 'Tax Preparation Intake',
    category: 'Financial',
    description: 'Collects client info, explains services, and books tax preparation appointments.',
    price: 29,
    installCount: 890,
    rating: 4.5,
    featured: false,
    botConfig: {},
    tags: ['Tax', 'Intake']
  },

  // Automotive
  {
    id: 't24',
    name: 'Car Dealership Sales',
    category: 'Automotive',
    description: 'Qualifies buyers, schedules test drives, and answers vehicle specification questions.',
    price: 39,
    installCount: 780,
    rating: 4.7,
    featured: false,
    botConfig: {},
    tags: ['Automotive', 'Sales']
  },
  {
    id: 't25',
    name: 'Auto Service Scheduler',
    category: 'Automotive',
    description: 'Books service appointments, provides estimates, and answers maintenance questions.',
    price: 19,
    installCount: 1120,
    rating: 4.6,
    featured: false,
    botConfig: {},
    tags: ['Automotive', 'Service']
  },

  // Home Services
  {
    id: 't26',
    name: 'HVAC Service Bot',
    category: 'Home Services',
    description: 'Schedules HVAC repairs, provides quotes, and handles emergency service requests.',
    price: 29,
    installCount: 560,
    rating: 4.5,
    featured: false,
    botConfig: {},
    tags: ['HVAC', 'Service']
  },
  {
    id: 't27',
    name: 'Plumbing Emergency Line',
    category: 'Home Services',
    description: '24/7 plumbing support. Triages emergencies and schedules service calls.',
    price: 29,
    installCount: 480,
    rating: 4.6,
    featured: false,
    botConfig: {},
    tags: ['Plumbing', 'Emergency']
  },
  {
    id: 't28',
    name: 'Cleaning Service Booker',
    category: 'Home Services',
    description: 'Provides instant quotes and schedules residential or commercial cleaning services.',
    price: 0,
    installCount: 1340,
    rating: 4.4,
    featured: false,
    botConfig: {},
    tags: ['Cleaning', 'Booking']
  },

  // Recruitment & HR
  {
    id: 't29',
    name: 'Recruitment Screener',
    category: 'Recruitment',
    description: 'Pre-screens job applicants, collects resumes, and schedules interviews.',
    price: 49,
    installCount: 670,
    rating: 4.8,
    featured: false,
    botConfig: {},
    tags: ['HR', 'Screening']
  },
  {
    id: 't30',
    name: 'Employee FAQ Bot',
    category: 'Recruitment',
    description: 'Answers HR policy questions, PTO balances, and benefits information for employees.',
    price: 39,
    installCount: 520,
    rating: 4.5,
    featured: false,
    botConfig: {},
    tags: ['HR', 'Internal']
  },

  // Non-Profit
  {
    id: 't31',
    name: 'Donation Assistant',
    category: 'Non-Profit',
    description: 'Guides donors through giving options and answers questions about the organization\'s mission.',
    price: 0,
    installCount: 340,
    rating: 4.7,
    featured: false,
    botConfig: {},
    tags: ['Non-Profit', 'Donations']
  },
  {
    id: 't32',
    name: 'Volunteer Coordinator',
    category: 'Non-Profit',
    description: 'Registers volunteers, explains opportunities, and schedules orientation sessions.',
    price: 0,
    installCount: 280,
    rating: 4.6,
    featured: false,
    botConfig: {},
    tags: ['Non-Profit', 'Volunteers']
  },

  // Events & Entertainment
  {
    id: 't33',
    name: 'Event Ticketing Bot',
    category: 'Entertainment',
    description: 'Answers event questions, guides ticket purchases, and handles seating inquiries.',
    price: 29,
    installCount: 890,
    rating: 4.5,
    featured: false,
    botConfig: {},
    tags: ['Events', 'Tickets']
  },
  {
    id: 't34',
    name: 'Venue Booking Assistant',
    category: 'Entertainment',
    description: 'Handles venue inquiries, provides quotes, and schedules site visits.',
    price: 39,
    installCount: 430,
    rating: 4.6,
    featured: false,
    botConfig: {},
    tags: ['Venues', 'Booking']
  },

  // Beauty & Personal Care
  {
    id: 't35',
    name: 'Salon Appointment Bot',
    category: 'Beauty',
    description: 'Books hair, nail, and spa appointments. Recommends services based on preferences.',
    price: 0,
    installCount: 2340,
    rating: 4.7,
    featured: true,
    botConfig: {},
    tags: ['Salon', 'Booking']
  },
  {
    id: 't36',
    name: 'Med Spa Consultant',
    category: 'Beauty',
    description: 'Explains treatments, provides pricing, and schedules consultations for aesthetic services.',
    price: 39,
    installCount: 560,
    rating: 4.8,
    featured: false,
    botConfig: {},
    tags: ['Med Spa', 'Consultation']
  },

  // Pet Services
  {
    id: 't37',
    name: 'Veterinary Clinic Bot',
    category: 'Pet Services',
    description: 'Schedules vet appointments, answers pet health FAQs, and handles prescription refills.',
    price: 29,
    installCount: 780,
    rating: 4.6,
    featured: false,
    botConfig: {},
    tags: ['Veterinary', 'Booking']
  },
  {
    id: 't38',
    name: 'Pet Grooming Scheduler',
    category: 'Pet Services',
    description: 'Books grooming appointments and answers questions about services and pricing.',
    price: 0,
    installCount: 1120,
    rating: 4.5,
    featured: false,
    botConfig: {},
    tags: ['Grooming', 'Pets']
  },

  // Professional Services
  {
    id: 't39',
    name: 'Accounting Firm Intake',
    category: 'Professional',
    description: 'Qualifies business clients, explains services, and schedules consultations.',
    price: 39,
    installCount: 340,
    rating: 4.7,
    featured: false,
    botConfig: {},
    tags: ['Accounting', 'B2B']
  },
  {
    id: 't40',
    name: 'Consulting Discovery Bot',
    category: 'Professional',
    description: 'Conducts initial discovery calls, qualifies prospects, and books strategy sessions.',
    price: 49,
    installCount: 290,
    rating: 4.8,
    featured: false,
    botConfig: {},
    tags: ['Consulting', 'Sales']
  },

  // Church & Religious Organizations
  {
    id: 't41',
    name: 'Church Welcome Bot',
    category: 'Religious',
    description: 'Welcomes visitors, answers questions about services, and helps newcomers get connected.',
    price: 0,
    installCount: 670,
    rating: 4.8,
    featured: false,
    botConfig: {},
    tags: ['Church', 'Welcome']
  },
  {
    id: 't42',
    name: 'Ministry Event Coordinator',
    category: 'Religious',
    description: 'Manages event registrations, volunteer sign-ups, and ministry program inquiries.',
    price: 19,
    installCount: 340,
    rating: 4.6,
    featured: false,
    botConfig: {},
    tags: ['Church', 'Events']
  },

  // Construction & Trades
  {
    id: 't43',
    name: 'General Contractor Lead Gen',
    category: 'Construction',
    description: 'Qualifies construction leads, collects project details, and schedules estimates.',
    price: 39,
    installCount: 560,
    rating: 4.7,
    featured: false,
    botConfig: {},
    tags: ['Construction', 'Lead Gen']
  },
  {
    id: 't44',
    name: 'Roofing Estimate Bot',
    category: 'Construction',
    description: 'Collects roof damage reports, schedules inspections, and provides initial estimates.',
    price: 29,
    installCount: 480,
    rating: 4.5,
    featured: false,
    botConfig: {},
    tags: ['Roofing', 'Estimates']
  },
  {
    id: 't45',
    name: 'Electrician Service Scheduler',
    category: 'Construction',
    description: 'Books electrical service calls, handles emergency requests, and provides basic troubleshooting.',
    price: 0,
    installCount: 720,
    rating: 4.6,
    featured: false,
    botConfig: {},
    tags: ['Electrical', 'Service']
  },

  // Agriculture & Farming
  {
    id: 't46',
    name: 'Farm Supply Assistant',
    category: 'Agriculture',
    description: 'Answers product questions, checks inventory, and processes orders for farm supplies.',
    price: 29,
    installCount: 230,
    rating: 4.5,
    featured: false,
    botConfig: {},
    tags: ['Agriculture', 'Sales']
  },
  {
    id: 't47',
    name: 'Veterinary Farm Services',
    category: 'Agriculture',
    description: 'Schedules large animal vet visits, answers livestock health questions, and manages emergencies.',
    price: 39,
    installCount: 180,
    rating: 4.7,
    featured: false,
    botConfig: {},
    tags: ['Veterinary', 'Farm']
  },

  // Childcare & Daycare
  {
    id: 't48',
    name: 'Daycare Enrollment Bot',
    category: 'Childcare',
    description: 'Answers parent questions, explains programs, and schedules tours for childcare centers.',
    price: 0,
    installCount: 890,
    rating: 4.8,
    featured: true,
    botConfig: {},
    tags: ['Childcare', 'Enrollment']
  },
  {
    id: 't49',
    name: 'After School Program Info',
    category: 'Childcare',
    description: 'Provides program details, pricing, and registration for after-school activities.',
    price: 19,
    installCount: 450,
    rating: 4.5,
    featured: false,
    botConfig: {},
    tags: ['Education', 'Programs']
  },

  // Photography & Creative Services
  {
    id: 't50',
    name: 'Photography Booking Bot',
    category: 'Creative',
    description: 'Books photo sessions, explains packages, and answers questions about services.',
    price: 0,
    installCount: 1120,
    rating: 4.7,
    featured: false,
    botConfig: {},
    tags: ['Photography', 'Booking']
  },
  {
    id: 't51',
    name: 'Wedding Vendor Assistant',
    category: 'Creative',
    description: 'Handles inquiries for wedding photographers, videographers, and florists.',
    price: 29,
    installCount: 560,
    rating: 4.8,
    featured: false,
    botConfig: {},
    tags: ['Wedding', 'Vendors']
  },

  // Moving & Storage
  {
    id: 't52',
    name: 'Moving Company Quote Bot',
    category: 'Moving',
    description: 'Collects move details, provides instant estimates, and schedules in-home surveys.',
    price: 29,
    installCount: 680,
    rating: 4.6,
    featured: false,
    botConfig: {},
    tags: ['Moving', 'Quotes']
  },
  {
    id: 't53',
    name: 'Storage Facility Assistant',
    category: 'Moving',
    description: 'Answers unit availability questions, explains pricing, and reserves storage units.',
    price: 0,
    installCount: 890,
    rating: 4.5,
    featured: false,
    botConfig: {},
    tags: ['Storage', 'Booking']
  },

  // Security Services
  {
    id: 't54',
    name: 'Home Security Consultant',
    category: 'Security',
    description: 'Explains security packages, schedules consultations, and answers monitoring questions.',
    price: 39,
    installCount: 430,
    rating: 4.7,
    featured: false,
    botConfig: {},
    tags: ['Security', 'Sales']
  },

  // Funeral & Memorial Services
  {
    id: 't55',
    name: 'Funeral Home Assistant',
    category: 'Memorial',
    description: 'Compassionate support for families. Explains services, pricing, and schedules arrangements.',
    price: 49,
    installCount: 210,
    rating: 4.9,
    featured: false,
    botConfig: {},
    tags: ['Funeral', 'Support']
  },

  // Staffing & Temp Agencies
  {
    id: 't56',
    name: 'Staffing Agency Intake',
    category: 'Staffing',
    description: 'Collects candidate information, matches skills to jobs, and schedules interviews.',
    price: 39,
    installCount: 520,
    rating: 4.6,
    featured: false,
    botConfig: {},
    tags: ['Staffing', 'Recruitment']
  },
  {
    id: 't57',
    name: 'Temp Worker Dispatcher',
    category: 'Staffing',
    description: 'Manages shift assignments, handles availability updates, and communicates job details.',
    price: 49,
    installCount: 340,
    rating: 4.5,
    featured: false,
    botConfig: {},
    tags: ['Staffing', 'Dispatch']
  },

  // Printing & Signage
  {
    id: 't58',
    name: 'Print Shop Quote Bot',
    category: 'Printing',
    description: 'Provides instant quotes for business cards, banners, and promotional materials.',
    price: 0,
    installCount: 780,
    rating: 4.4,
    featured: false,
    botConfig: {},
    tags: ['Printing', 'Quotes']
  },

  // Tutoring & Test Prep
  {
    id: 't59',
    name: 'Tutoring Service Matcher',
    category: 'Education',
    description: 'Matches students with tutors, explains programs, and schedules trial sessions.',
    price: 29,
    installCount: 670,
    rating: 4.7,
    featured: false,
    botConfig: {},
    tags: ['Tutoring', 'Education']
  },
  {
    id: 't60',
    name: 'SAT/ACT Prep Advisor',
    category: 'Education',
    description: 'Explains test prep programs, answers questions, and enrolls students in courses.',
    price: 39,
    installCount: 420,
    rating: 4.8,
    featured: false,
    botConfig: {},
    tags: ['Test Prep', 'Education']
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
                   {template.rating && (
                     <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold">
                       <Star size={12} fill="currentColor" /> {template.rating}
                     </div>
                   )}
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