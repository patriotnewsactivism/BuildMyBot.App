import React, { useState, useEffect, useRef } from 'react';
import { Bot, Zap, CheckCircle, Globe, ArrowRight, X, Play, LayoutDashboard, MessageSquare, Users, TrendingUp, Flame, Smartphone, Bell, Target, Briefcase, Instagram, DollarSign, Crown, Menu, Gavel, Stethoscope, Home, Landmark, ShoppingBag, Wrench, Car, Utensils, Dumbbell, GraduationCap, Phone, Megaphone, Layout, Shield, FileText, Upload, Link as LinkIcon, Search, Mail, Plus, Loader, RefreshCcw, Send } from 'lucide-react';
import { PLANS } from '../../constants';
import { PlanType } from '../../types';
import { generateBotResponse, generateMarketingContent, scrapeWebsiteContent, generateWebsiteStructure } from '../../services/geminiService';
import { processPDFForKnowledgeBase } from '../../services/pdfService';

interface LandingProps {
  onLogin: () => void;
  onNavigateToPartner?: () => void;
  onAdminLogin?: () => void;
}

const HUMAN_NAMES = ['Sarah', 'Michael', 'Jessica', 'David', 'Emma', 'James'];
const AVATAR_COLORS = ['#1e3a8a', '#be123c', '#047857', '#d97706', '#7c3aed'];

export const LandingPage: React.FC<LandingProps> = ({ onLogin, onNavigateToPartner, onAdminLogin }) => {
  const [modalContent, setModalContent] = useState<'privacy' | 'terms' | 'about' | 'contact' | 'features' | null>(null);
  
  // Demo Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [demoIdentity, setDemoIdentity] = useState({ name: 'Bot', color: '#1e3a8a' });
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const hasGreeted = useRef(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live Demos State
  const [activeDemo, setActiveDemo] = useState<'training' | 'phone' | 'viral' | 'site' | 'crm'>('training');
  
  // Training Demo State
  const [trainingStep, setTrainingStep] = useState(0); // 0: Input, 1: Scanning, 2: Ready/Chat
  const [trainingType, setTrainingType] = useState<'pdf' | 'url'>('url');
  const [trainingUrl, setTrainingUrl] = useState('');
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [scrapedContent, setScrapedContent] = useState('');
  const [trainingChatInput, setTrainingChatInput] = useState('');
  const [trainingChatHistory, setTrainingChatHistory] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [isTrainingChatTyping, setIsTrainingChatTyping] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState('');
  const [trainingError, setTrainingError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Phone Demo State
  const [phoneStatus, setPhoneStatus] = useState<'idle' | 'calling' | 'connected'>('idle');
  const [phoneTranscript, setPhoneTranscript] = useState<string[]>([]);

  // Viral Demo State
  const [viralTopic, setViralTopic] = useState('');
  const [viralResult, setViralResult] = useState<any>(null);
  const [isGeneratingViral, setIsGeneratingViral] = useState(false);

  // Site Demo State
  const [siteName, setSiteName] = useState('');
  const [siteIndustry, setSiteIndustry] = useState('Coffee Shop');
  const [generatedSite, setGeneratedSite] = useState<any>(null);
  const [isBuildingSite, setIsBuildingSite] = useState(false);

  // CRM Demo State
  const [crmLeads, setCrmLeads] = useState<any[]>([
      { name: 'Sarah Miller', email: 'sarah.m@gmail.com', status: 'New', score: 45, time: '2m ago' },
      { name: 'Mike Ross', email: 'mike.ross@law.com', status: 'Qualified', score: 88, time: '15m ago' },
  ]);
  const [isSimulatingLead, setIsSimulatingLead] = useState(false);

  // Initialize random identity on mount
  useEffect(() => {
    const randomName = HUMAN_NAMES[Math.floor(Math.random() * HUMAN_NAMES.length)];
    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    setDemoIdentity({ name: randomName, color: randomColor });
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isTyping, isChatOpen]);

  // Open Greeting
  useEffect(() => {
    if (isChatOpen && !hasGreeted.current && chatHistory.length === 0) {
        setIsTyping(true);
        hasGreeted.current = true;
        setTimeout(() => {
            setChatHistory([{ role: 'model', text: `Hi! I'm ${demoIdentity.name}. I can qualify leads, schedule appointments, and answer questions 24/7. How can I help your business grow today?` }]);
            setIsTyping(false);
        }, 1500);
    }
  }, [isChatOpen, demoIdentity]);

  // --- DEMO HANDLERS ---

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedPdfFile(file);
      handleTrainingDemo();
    } else if (file) {
      setTrainingError('Please select a valid PDF file');
      setTimeout(() => setTrainingError(''), 3000);
    }
  };

  const handleTrainingDemo = async () => {
    if (trainingType === 'url' && !trainingUrl) return;
    if (trainingType === 'pdf' && !selectedPdfFile) {
      // Trigger file input
      fileInputRef.current?.click();
      return;
    }

    setTrainingStep(1);
    setTrainingChatHistory([]);
    setTrainingError('');
    setTrainingProgress('Starting...');

    let content = "";
    if (trainingType === 'pdf' && selectedPdfFile) {
       // Real PDF extraction
       try {
         content = await processPDFForKnowledgeBase(selectedPdfFile, (progress, stage) => {
           setTrainingProgress(`${stage} (${progress}%)`);
         });
         setScrapedContent(content);
         setTrainingProgress('Complete!');
         setTrainingStep(2);
       } catch (e: any) {
         const errorMsg = e?.message || "Error processing PDF. Please try another file.";
         setTrainingError(errorMsg);
         setTrainingProgress('');
         setSelectedPdfFile(null);
         setTimeout(() => {
           setTrainingStep(0);
           setTrainingError('');
         }, 5000);
       }
    } else {
       // Real URL Scrape with progress tracking
       try {
         content = await scrapeWebsiteContent(trainingUrl, {
           onProgress: (stage) => setTrainingProgress(stage)
         });
         setScrapedContent(content);
         setTrainingStep(2);
       } catch (e: any) {
         const errorMsg = e?.message || "Error scraping website. Please check the URL and try again.";
         setTrainingError(errorMsg);
         setTrainingProgress('');
         setTimeout(() => {
           setTrainingStep(0);
           setTrainingError('');
         }, 5000); // Show error for 5 seconds
       }
    }
  };

  const handleTrainingChatSend = async () => {
    if (!trainingChatInput.trim()) return;
    
    const userMsg = { role: 'user' as const, text: trainingChatInput };
    setTrainingChatHistory(prev => [...prev, userMsg]);
    setTrainingChatInput('');
    setIsTrainingChatTyping(true);

    try {
        const response = await generateBotResponse(
            "You are a helpful AI assistant trained on the provided context. Answer the user's question accurately based ONLY on the context.", 
            [...trainingChatHistory, userMsg], 
            userMsg.text, 
            'gpt-4o-mini', 
            scrapedContent
        );
        setTrainingChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
        setTrainingChatHistory(prev => [...prev, { role: 'model', text: "Error connecting to AI." }]);
    } finally {
        setIsTrainingChatTyping(false);
    }
  };

  const handlePhoneDemoCall = () => {
    setPhoneStatus('calling');
    setPhoneTranscript([]);
    
    setTimeout(() => {
        setPhoneStatus('connected');
        const lines = [
            "AI Agent: Hi there! Thanks for calling Apex Services. How can I help you?",
            "You: I'd like to book an appointment for next Tuesday.",
            "AI Agent: I can help with that. I have an opening at 10 AM or 2 PM. Which works best?",
            "You: Let's do 10 AM.",
            "AI Agent: Perfect. You are booked for Tuesday at 10 AM. I've sent a confirmation SMS. Anything else?"
        ];
        
        let i = 0;
        const interval = setInterval(() => {
            setPhoneTranscript(prev => [...prev, lines[i]]);
            
            // Simple speech synthesis for demo
            if ('speechSynthesis' in window && lines[i].startsWith('AI Agent')) {
                const utterance = new SpeechSynthesisUtterance(lines[i].replace('AI Agent: ', ''));
                utterance.rate = 1.1;
                window.speechSynthesis.speak(utterance);
            }

            i++;
            if (i >= lines.length) {
                clearInterval(interval);
                setTimeout(() => setPhoneStatus('idle'), 3000);
            }
        }, 2500);
    }, 1500);
  };

  const handleViralGenerate = async () => {
    if (!viralTopic) return;
    setIsGeneratingViral(true);
    setViralResult(null);
    
    try {
        const content = await generateMarketingContent('viral-thread', viralTopic, 'engaging');
        setViralResult({
            user: 'Alex Founder',
            handle: '@alex_builds',
            content: content.substring(0, 280) + '...', // Truncate for preview
            fullContent: content,
            likes: Math.floor(Math.random() * 1000) + 100,
            retweets: Math.floor(Math.random() * 200) + 20
        });
    } catch (e) {
        setViralResult({
             user: 'Alex Founder',
             handle: '@alex_builds',
             content: "Error generating content. Please check API configuration.",
             likes: 0,
             retweets: 0
        });
    } finally {
        setIsGeneratingViral(false);
    }
  };

  const handleSiteBuild = async () => {
    if (!siteName) return;
    setIsBuildingSite(true);
    setGeneratedSite(null);

    try {
        const description = `A ${siteIndustry} business that provides excellent service and quality.`;
        const jsonResponse = await generateWebsiteStructure(siteName, description);
        const siteData = JSON.parse(jsonResponse);

        setGeneratedSite({
            name: siteName,
            headline: siteData.headline || `Welcome to ${siteName}`,
            subheadline: siteData.subheadline || `The Best ${siteIndustry}`,
            cta: siteData.ctaText || siteData.cta || 'Get Started',
            features: siteData.features || []
        });
    } catch (e) {
        console.error("Website generation error:", e);
        // Fallback to basic template on error
        setGeneratedSite({
            name: siteName,
            headline: siteIndustry === 'City Government' ? `Welcome to the City of ${siteName}` : `The Best ${siteIndustry} in Town`,
            subheadline: siteIndustry === 'City Government'
                ? `Official portal for residents. Pay bills, report issues, and access city services online.`
                : `Experience premium quality and service at ${siteName}. We are dedicated to excellence.`,
            cta: siteIndustry === 'City Government' ? 'Access Services' : 'Book Now'
        });
    } finally {
        setIsBuildingSite(false);
    }
  };

  const handleSimulateLead = () => {
    setIsSimulatingLead(true);
    setTimeout(() => {
        const newLead = { 
            name: 'John Resident', 
            email: 'john.d@email.com', 
            status: 'Hot Lead', 
            score: 95, 
            time: 'Just now' 
        };
        setCrmLeads(prev => [newLead, ...prev]);
        setIsSimulatingLead(false);
    }, 1500);
  };

  const handleDemoSend = async () => {
    if (!chatInput.trim()) return;
    
    // Fail-safe logic for Demo (limit to 5 interactions)
    if (chatHistory.length > 8) {
        const limitMsg = { role: 'user' as const, text: chatInput };
        setChatHistory(prev => [...prev, limitMsg]);
        setChatInput('');
        setIsTyping(true);
        setTimeout(() => {
             setChatHistory(prev => [...prev, { role: 'model', text: "I'd love to keep chatting, but I have a meeting coming up! Why don't you sign up for free to create your own bot? It takes less than a minute." }]);
             setIsTyping(false);
        }, 1500);
        return;
    }

    const userMsg = { role: 'user' as const, text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
        const systemPrompt = `You are a high-performing sales assistant for BuildMyBot. Act like a human named ${demoIdentity.name}. Your goal is to qualify the user as a potential lead. Ask smart questions. Be casual, professional, and convincing. Never give the exact same response twice. Do not mention you are an AI unless asked directly. Keep responses concise (under 50 words).`;
        const startTime = Date.now();
        const response = await generateBotResponse(systemPrompt, [...chatHistory, userMsg], userMsg.text);
        
        // Human-like delay logic (at least 2s, up to 3s for demo feel)
        const elapsed = Date.now() - startTime;
        const minDelay = 2000;
        const remainingDelay = Math.max(0, minDelay - elapsed);

        setTimeout(() => {
           setChatHistory(prev => [...prev, { role: 'model', text: response }]);
           setIsTyping(false);
        }, remainingDelay);
    } catch (e) {
        setIsTyping(false);
        setChatHistory(prev => [...prev, { role: 'model', text: "I'm having a bit of trouble connecting right now. Try again in a moment!" }]);
    }
  };

  const openModal = (type: any) => setModalContent(type);
  const closeModal = () => setModalContent(null);

  const InfoModal = () => {
    if (!modalContent) return null;
    
    let title = '';
    let content = null;

    switch (modalContent) {
        case 'privacy':
            title = 'Privacy Policy';
            content = (
               <>
                 <p><strong>Last Updated: May 20, 2024</strong></p>
                 <p>At BuildMyBot, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclosure, and safeguard your information when you visit our website.</p>
                 <h4 className="font-bold text-slate-800">1. Data Collection</h4>
                 <p>We collect information regarding account registration and bot configuration. Lead data captured by your bots is owned solely by you.</p>
                 <h4 className="font-bold text-slate-800">2. Lead Security</h4>
                 <p>All captured lead information (names, emails, phones) is encrypted at rest. We do not sell or share your leads with third parties.</p>
               </>
            );
            break;
        case 'terms':
            title = 'Terms of Service';
            content = (
                <>
                 <p><strong>Last Updated: May 20, 2024</strong></p>
                 <h4 className="font-bold text-slate-800">1. Services</h4>
                 <p>BuildMyBot provides an AI-powered chatbot platform for lead qualification and customer support.</p>
                 <h4 className="font-bold text-slate-800">2. Fair Use</h4>
                 <p>You agree to use the platform for legitimate business purposes. Spamming or malicious use of the bots is strictly prohibited.</p>
                </>
            );
            break;
        case 'about':
            title = 'About Us';
            content = (
                <>
                  <p>BuildMyBot helps businesses scale their personal touch. In a world of infinite noise, responsiveness is the only competitive advantage that matters.</p>
                  <p>We built this platform for Influencers, Agencies, and Business Owners who are tired of leaving money on the table because they couldn't answer the phone or reply to a DM fast enough.</p>
                </>
            );
            break;
        case 'contact':
            title = 'Contact Support';
            content = (
                <>
                  <p>Have questions? We're here to help.</p>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 my-4">
                      <p className="font-bold text-slate-800">Sales Inquiries</p>
                      <p className="text-blue-900">sales@buildmybot.app</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <p className="font-bold text-slate-800">Technical Support</p>
                      <p className="text-blue-900">support@buildmybot.app</p>
                  </div>
                </>
            );
            break;
        case 'features':
            title = 'Full Feature List';
            content = (
                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Bot size={18}/> AI Chatbots</h4>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-500 mt-0.5"/> <strong>GPT-4o Intelligence:</strong> Powered by the world's smartest AI model.</li>
                            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-500 mt-0.5"/> <strong>RAG Knowledge Base:</strong> Train on your website, PDFs, and docs.</li>
                            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-500 mt-0.5"/> <strong>Multi-Persona:</strong> Switch between Sales, Support, and HR modes instantly.</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Phone size={18}/> AI Phone Agent</h4>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-500 mt-0.5"/> <strong>24/7 Receptionist:</strong> Answers calls, takes messages, and routes urgent issues.</li>
                            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-500 mt-0.5"/> <strong>Human-like Voice:</strong> Uses advanced neural speech for natural conversations.</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Layout size={18}/> Website & Marketing</h4>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-500 mt-0.5"/> <strong>Instant Site Builder:</strong> Generate a full landing page in 30 seconds.</li>
                            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-500 mt-0.5"/> <strong>Viral Content:</strong> Auto-generate social posts, emails, and ad copy.</li>
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Flame size={18}/> Lead Growth</h4>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-500 mt-0.5"/> <strong>Hot Lead Detection:</strong> Scores leads and alerts you via SMS instantly.</li>
                            <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-500 mt-0.5"/> <strong>Built-in CRM:</strong> Track, tag, and export your leads.</li>
                        </ul>
                    </div>
                </div>
            );
            break;
        default:
            return null;
    }

    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-fade-in">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white rounded-t-xl sticky top-0 z-10">
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition"><X size={20} /></button>
          </div>
          <div className="p-8 text-slate-600 text-sm leading-relaxed space-y-4 overflow-y-auto">
             {content}
          </div>
          <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end rounded-b-xl sticky bottom-0 z-10">
            <button onClick={closeModal} className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 shadow-sm transition">Close</button>
          </div>
        </div>
      </div>
    );
  };

  const industries = [
    {
      title: 'City Government',
      icon: Landmark,
      color: 'slate',
      desc: 'Automate 311 calls. Handle utility payments, permit questions, and community announcements instantly.'
    },
    {
      title: 'Home Services',
      icon: Wrench,
      color: 'blue',
      desc: 'Plumbers, HVAC, Electricians. The first to pick up gets the job. Stop losing emergency calls to voicemail and start booking jobs instantly.'
    },
    {
      title: 'Real Estate',
      icon: Home,
      color: 'emerald',
      desc: 'Qualify buyers instantly. Schedule viewings 24/7. Speed to lead is the only metric that matters in a hot market.'
    },
    {
      title: 'Automotive',
      icon: Car,
      color: 'red',
      desc: 'Dealerships & Mechanics. Book service appointments and answer inventory questions immediately, keeping your bays full.'
    },
    {
      title: 'Healthcare',
      icon: Stethoscope,
      color: 'cyan',
      desc: 'Dentists & Clinics. Reduce patient anxiety by providing instant answers. Fill cancellations automatically and handle insurance FAQs.'
    },
    {
      title: 'Law Firms',
      icon: Gavel,
      color: 'amber',
      desc: 'Instant case intake. Capture high-value clients when they need you most. Automate the initial screening process securely.'
    },
    {
      title: 'Politicians',
      icon: Landmark,
      color: 'slate',
      desc: 'The 24/7 Town Hall. Engage constituents, accept donations, and clarify policy positions instantly, without a massive staff.'
    },
    {
      title: 'Hospitality',
      icon: Utensils,
      color: 'orange',
      desc: 'Restaurants & Hotels. Handle reservation requests and room service queries instantly. Happier guests, fewer phone calls.'
    },
    {
      title: 'Influencers',
      icon: Instagram,
      color: 'purple',
      desc: 'Scale your personal brand. Reply to every DM, engage fans, and sell merch automatically without spending all day on your phone.'
    },
    {
      title: 'Fitness & Wellness',
      icon: Dumbbell,
      color: 'lime',
      desc: 'Gyms, Yoga, & Spas. Book classes, sell memberships, and answer pricing questions while you are training clients.'
    },
    {
      title: 'Education',
      icon: GraduationCap,
      color: 'indigo',
      desc: 'Tutors & Schools. Streamline enrollment and answer parent FAQs immediately. Capture interest during peak research hours.'
    },
    {
      title: 'E-commerce',
      icon: ShoppingBag,
      color: 'pink',
      desc: 'Recover abandoned carts. Answer product questions to boost conversion rates and reduce support ticket volume.'
    },
    {
      title: 'Agencies',
      icon: Briefcase,
      color: 'sky',
      desc: 'White-label our platform. Sell AI chatbots to your own clients under your brand and create a new recurring revenue stream.'
    }
  ];

  const featureCards = [
    {
        title: "AI Chatbots",
        desc: "Custom trained on your website data. Handles sales, support, and bookings 24/7.",
        icon: Bot,
        color: "blue"
    },
    {
        title: "AI Phone Agent",
        desc: "A voice assistant that answers calls, takes messages, and routes urgent issues.",
        icon: Phone,
        color: "emerald"
    },
    {
        title: "Website Builder",
        desc: "Generate a high-converting landing page with built-in chat in under 30 seconds.",
        icon: Layout,
        color: "purple"
    },
    {
        title: "Viral Marketing",
        desc: "Auto-generate social posts, email campaigns, and ad copy that converts.",
        icon: Megaphone,
        color: "pink"
    },
    {
        title: "Lead CRM",
        desc: "Track every lead. Identify 'Hot Leads' automatically based on conversation score.",
        icon: Users,
        color: "orange"
    },
    {
        title: "Reseller Platform",
        desc: "White-label the entire system. Sell AI services to your clients under your brand.",
        icon: Briefcase,
        color: "slate"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      {modalContent && <InfoModal />}
      
      {/* Demo Chatbot Widget */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-4">
          {/* Chat Window */}
          {isChatOpen && (
              <div className="bg-white w-80 md:w-96 h-[500px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in mb-2">
                  <div className="bg-blue-900 p-4 flex items-center justify-between text-white">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center text-sm font-bold shadow-sm" style={{ backgroundColor: demoIdentity.color }}>
                              {demoIdentity.name.substring(0,2)}
                          </div>
                          <div>
                              <span className="font-bold block">{demoIdentity.name}</span>
                              <div className="flex items-center gap-1.5 opacity-80">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                <span className="text-xs">Online</span>
                              </div>
                          </div>
                      </div>
                      <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-white/10 rounded"><X size={18}/></button>
                  </div>
                  
                  <div className="flex-1 bg-slate-50 overflow-y-auto p-4 space-y-4" ref={chatScrollRef}>
                      <div className="text-center text-[10px] text-slate-400 font-medium uppercase tracking-wider my-2">Powered by GPT-4o Mini</div>
                      {chatHistory.map((msg, i) => (
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
                      {isTyping && (
                          <div className="flex justify-start">
                             <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex gap-1 items-center">
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                             </div>
                          </div>
                      )}
                  </div>

                  <div className="p-3 bg-white border-t border-slate-100">
                      <div className="relative">
                          <input 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleDemoSend()}
                            placeholder="Type a message..." 
                            className="w-full pl-4 pr-10 py-3 bg-slate-100 border-transparent focus:bg-white focus:border-blue-900 focus:ring-0 rounded-xl text-sm transition-all"
                          />
                          <button 
                            onClick={handleDemoSend}
                            disabled={!chatInput.trim() || isTyping}
                            className="absolute right-2 top-2 p-1.5 bg-blue-900 text-white rounded-lg hover:bg-blue-950 disabled:opacity-50 transition">
                             <ArrowRight size={16} />
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* Trigger Button */}
          {!isChatOpen && (
              <button 
                onClick={() => setIsChatOpen(true)}
                className="group flex items-center gap-3 bg-blue-900 text-white px-5 py-4 rounded-full shadow-xl shadow-blue-900/30 hover:scale-105 hover:bg-blue-950 transition-all duration-300"
              >
                <span className="font-bold text-sm hidden md:block">Chat with {demoIdentity.name}</span>
                <MessageSquare size={24} fill="currentColor" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                </span>
              </button>
          )}
      </div>

      {/* Navbar */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-md z-30 border-b border-slate-200 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-slate-900 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center text-white shadow-md">
              <Bot size={20} />
            </div>
            BuildMyBot
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button onClick={() => openModal('features')} className="hover:text-blue-900 transition font-semibold">Platform Features</button>
            <a href="#industries" className="hover:text-blue-900 transition">Who is this for?</a>
            <a href="#pricing" className="hover:text-blue-900 transition">Pricing</a>
            {onNavigateToPartner && (
              <button onClick={onNavigateToPartner} className="text-blue-900 font-bold hover:text-blue-700 transition">Partner Program</button>
            )}
          </div>
          <div className="hidden md:flex items-center gap-4">
             <button onClick={onLogin} className="text-sm font-medium text-slate-600 hover:text-blue-900">Log in</button>
             <button onClick={onLogin} className="px-5 py-2 bg-blue-900 text-white rounded-lg text-sm font-bold hover:bg-blue-950 transition shadow-lg shadow-blue-900/30">
               Get Started Free
             </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
             <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600">
               {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
             </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 absolute w-full px-6 py-4 flex flex-col gap-4 shadow-xl">
             <button onClick={() => {openModal('features'); setMobileMenuOpen(false);}} className="text-left font-medium text-slate-600 py-2">Platform Features</button>
             <a href="#industries" onClick={() => setMobileMenuOpen(false)} className="text-left font-medium text-slate-600 py-2">Who is this for?</a>
             <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-left font-medium text-slate-600 py-2">Pricing</a>
             {onNavigateToPartner && (
               <button onClick={() => {onNavigateToPartner(); setMobileMenuOpen(false);}} className="text-left font-bold text-blue-900 py-2">Partner Program</button>
             )}
             <div className="h-px bg-slate-100 my-2"></div>
             <button onClick={onLogin} className="text-left font-medium text-blue-900 py-2">Log in</button>
             <button onClick={onLogin} className="w-full py-3 bg-blue-900 text-white rounded-lg font-bold">Get Started Free</button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
           <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
           <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
           <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-blue-100 text-blue-900 text-xs font-bold uppercase tracking-wide mb-6 shadow-sm hover:shadow-md transition cursor-pointer" onClick={() => openModal('features')}>
             <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
             New: Auto-Qualify "Hot Leads"
           </div>
           <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
             Capture Every Lead. <br/> 
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-900 to-sky-600">Automate Every Answer.</span>
           </h1>
           
           <h2 className="text-xl md:text-2xl font-semibold text-slate-500 tracking-wide mb-10 max-w-3xl mx-auto">
             Stop trading time for money. The ultimate AI workforce including <strong>Chatbots</strong>, <strong>Phone Agents</strong>, and <strong>Websites</strong>.
           </h2>

           <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-20">
              <button onClick={onLogin} className="w-full md:w-auto px-8 py-4 bg-blue-900 text-white rounded-xl text-lg font-bold hover:bg-blue-950 transition shadow-xl shadow-blue-900/40 flex items-center justify-center gap-2 transform hover:-translate-y-1">
                Start Building Free <ArrowRight size={20} />
              </button>
              <button onClick={() => setIsChatOpen(true)} className="w-full md:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl text-lg font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2 transform hover:-translate-y-1">
                <Play size={20} fill="currentColor" className="text-slate-400" /> Live Demo
              </button>
           </div>
           
           {/* High Fidelity Dashboard Preview */}
           <div className="relative max-w-6xl mx-auto transform hover:scale-[1.01] transition duration-700 ease-out z-20">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur-lg opacity-20"></div>
              <div className="relative bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
                {/* Browser Controls */}
                <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-2 justify-between">
                   <div className="flex gap-2">
                       <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                       <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                       <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                   </div>
                   <div className="bg-white border border-slate-200 px-3 py-1 rounded text-[10px] text-slate-400 font-mono w-64 text-center">app.buildmybot.app/dashboard</div>
                   <div className="w-10"></div>
                </div>
                
                {/* Dashboard Mockup Content */}
                <div className="flex h-[400px] md:h-[600px] bg-slate-50 text-left overflow-hidden relative">
                   {/* Sidebar */}
                   <div className="w-64 bg-[#0f172a] p-4 hidden md:block shrink-0">
                      <div className="flex items-center gap-2 text-white mb-8 px-2">
                         <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center"><Bot size={14}/></div>
                         <span className="font-bold">BuildMyBot</span>
                      </div>
                      <div className="space-y-1">
                         <div className="bg-blue-900 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-3"><LayoutDashboard size={16}/> Dashboard</div>
                         <div className="text-slate-400 px-3 py-2 rounded-lg text-sm flex items-center gap-3"><Bot size={16}/> My Bots</div>
                         <div className="text-slate-400 px-3 py-2 rounded-lg text-sm flex items-center gap-3"><Phone size={16}/> Phone Agent</div>
                         <div className="text-slate-400 px-3 py-2 rounded-lg text-sm flex items-center gap-3"><Users size={16}/> Lead CRM</div>
                         <div className="text-slate-400 px-3 py-2 rounded-lg text-sm flex items-center gap-3"><Megaphone size={16}/> Marketing</div>
                      </div>
                   </div>
                   
                   {/* Main Content */}
                   <div className="flex-1 p-4 md:p-8 overflow-hidden">
                      <div className="flex justify-between items-center mb-8">
                         <div>
                            <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
                            <p className="text-slate-500 text-sm">Welcome back, Alex.</p>
                         </div>
                         <button className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hidden md:block">+ Create Bot</button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                         {[
                            {l: 'Active Chats', v: '1,240', i: MessageSquare, c: 'blue'},
                            {l: 'Hot Leads', v: '328', i: Flame, c: 'red'},
                            {l: 'Response', v: '0.8s', i: Zap, c: 'amber'},
                            {l: 'Revenue', v: '$4,200', i: TrendingUp, c: 'emerald'}
                         ].map((s, i) => (
                            <div key={i} className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className={`w-8 h-8 rounded-lg bg-${s.c}-50 text-${s.c}-600 flex items-center justify-center mb-3`}><s.i size={16}/></div>
                                <div className="text-xl md:text-2xl font-bold text-slate-800">{s.v}</div>
                                <div className="text-xs text-slate-500">{s.l}</div>
                            </div>
                         ))}
                      </div>

                      {/* Mock Chart Area */}
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-64 flex items-center justify-center relative overflow-hidden">
                         <div className="absolute top-4 left-6 font-bold text-slate-800">Conversation Volume</div>
                         <div className="w-full h-48 flex items-end justify-between px-4 gap-2 mt-8">
                            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 65, 80, 95].map((h, i) => (
                               <div key={i} className="w-full bg-blue-50 rounded-t-sm relative">
                                  <div className="absolute bottom-0 w-full bg-blue-900 rounded-t-sm" style={{height: `${h}%`}}></div>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
              </div>
           </div>
        </div>
      </section>

       {/* All-In-One Feature Grid */}
       <section className="py-24 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
             <div className="text-center mb-16">
               <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">The All-In-One AI Operating System</h2>
               <p className="text-lg text-slate-600 max-w-2xl mx-auto">Replace 5 different tools with one platform.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featureCards.map((feat, idx) => (
                   <div key={idx} className="p-8 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-xl hover:border-blue-200 transition duration-300 group">
                      <div className={`w-14 h-14 rounded-2xl bg-${feat.color}-50 text-${feat.color}-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                         <feat.icon size={28} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">{feat.title}</h3>
                      <p className="text-slate-600 leading-relaxed">
                         {feat.desc}
                      </p>
                   </div>
                ))}
             </div>
          </div>
       </section>

      {/* NEW: Interactive Live Demos Section */}
      <section className="py-24 px-6 bg-slate-900 text-white relative overflow-hidden">
         <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/50 to-transparent"></div>
         <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-12">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-300 text-xs font-bold uppercase tracking-wide mb-6">
                  <Zap size={12} fill="currentColor" /> Live Interactive Demo
               </div>
               <h2 className="text-3xl md:text-5xl font-extrabold mb-6">Experience the Power.</h2>
               <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                  Don't just take our word for it. Try our most powerful features right here.
               </p>
            </div>

            {/* Tab Nav */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
               {[
                  { id: 'training', label: 'Instant Training', icon: FileText },
                  { id: 'phone', label: 'AI Phone Agent', icon: Phone },
                  { id: 'crm', label: 'Lead CRM', icon: Users },
                  { id: 'viral', label: 'Viral Post Creator', icon: Search },
                  { id: 'site', label: 'Instant Website', icon: Layout }
               ].map((tab) => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveDemo(tab.id as any)}
                     className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 ${
                        activeDemo === tab.id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                     }`}
                  >
                     <tab.icon size={18} /> {tab.label}
                  </button>
               ))}
            </div>

            {/* Demo Container */}
            <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden min-h-[500px] flex flex-col md:flex-row">
               
               {/* Instant Training Demo (PDF/URL) */}
               {activeDemo === 'training' && (
                  <div className="w-full h-full flex flex-col md:flex-row animate-fade-in">
                     <div className="flex-1 p-8 md:p-12 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-700 bg-slate-800/50">
                        <h3 className="text-2xl font-bold mb-4">Train on your Data in Seconds</h3>
                        <p className="text-slate-400 mb-8">
                           Upload a lengthy PDF or paste your website URL. The bot absorbs every detail instantly.
                        </p>
                        
                        {trainingStep === 0 && (
                           <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 space-y-4">
                              <input
                                 type="file"
                                 ref={fileInputRef}
                                 accept="application/pdf"
                                 onChange={handlePdfFileSelect}
                                 className="hidden"
                              />
                              <div className="flex gap-4 mb-4">
                                 <button
                                    onClick={() => { setTrainingType('pdf'); setSelectedPdfFile(null); }}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${trainingType === 'pdf' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                 >
                                    <Upload size={16} className="inline mr-2"/> Upload PDF
                                 </button>
                                 <button
                                    onClick={() => setTrainingType('url')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${trainingType === 'url' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                 >
                                    <LinkIcon size={16} className="inline mr-2"/> Scan Website
                                 </button>
                              </div>

                              {trainingType === 'pdf' ? (
                                 <div>
                                    <div className="border-2 border-dashed border-slate-600 rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-900/10 transition" onClick={handleTrainingDemo}>
                                       <FileText size={48} className="text-slate-500 mb-2"/>
                                       <p className="text-sm text-slate-400">
                                          {selectedPdfFile ? selectedPdfFile.name : 'Click to Upload PDF'}
                                       </p>
                                       <span className="text-xs text-slate-600 mt-2">
                                          {selectedPdfFile ? `${(selectedPdfFile.size / 1024).toFixed(1)}KB` : 'Employee Handbook, Menu, Catalog'}
                                       </span>
                                    </div>
                                    {selectedPdfFile && (
                                       <button
                                          onClick={handleTrainingDemo}
                                          className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition"
                                       >
                                          Extract Text
                                       </button>
                                    )}
                                 </div>
                              ) : (
                                 <div className="space-y-4">
                                    <input 
                                       type="text" 
                                       value={trainingUrl}
                                       onChange={(e) => setTrainingUrl(e.target.value)}
                                       placeholder="https://yourbusiness.com" 
                                       className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none" 
                                    />
                                    <button 
                                       onClick={handleTrainingDemo} 
                                       disabled={!trainingUrl}
                                       className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                                    >
                                       Scan Now
                                    </button>
                                 </div>
                              )}
                           </div>
                        )}

                        {trainingStep === 1 && (
                           <div className="h-64 flex flex-col items-center justify-center bg-slate-900 rounded-xl border border-slate-700">
                              {trainingError ? (
                                 <div className="text-center px-6">
                                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                                       <X size={32} className="text-red-400" />
                                    </div>
                                    <p className="font-bold text-lg text-red-400 mb-2">Scraping Failed</p>
                                    <p className="text-sm text-slate-400">{trainingError}</p>
                                 </div>
                              ) : (
                                 <>
                                    <Loader className="w-16 h-16 text-blue-500 animate-spin mb-4" />
                                    <p className="font-bold text-lg animate-pulse">Extracting Knowledge...</p>
                                    <p className="text-sm text-slate-500 mt-2">{trainingProgress || 'Processing...'}</p>
                                 </>
                              )}
                           </div>
                        )}

                        {trainingStep === 2 && (
                           <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 h-full flex flex-col">
                              <div className="flex items-center gap-2 text-emerald-400 mb-4 bg-emerald-500/10 p-2 rounded-lg">
                                 <CheckCircle size={18}/> <span className="text-sm font-bold">Training Complete</span>
                              </div>
                              <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 max-h-[200px] border border-slate-800 rounded p-2 bg-slate-950/50">
                                 <p className="text-xs text-slate-400 whitespace-pre-wrap">{scrapedContent}</p>
                              </div>
                              
                              {/* Mini Chat Interface */}
                              <div className="space-y-3 border-t border-slate-800 pt-3">
                                 <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                    {trainingChatHistory.map((m, i) => (
                                       <div key={i} className={`text-xs p-2 rounded ${m.role === 'user' ? 'bg-blue-600 ml-8' : 'bg-slate-700 mr-8'}`}>
                                          {m.text}
                                       </div>
                                    ))}
                                    {isTrainingChatTyping && <div className="text-xs text-slate-500">Bot typing...</div>}
                                 </div>
                                 <div className="flex gap-2">
                                    <input 
                                       value={trainingChatInput}
                                       onChange={(e) => setTrainingChatInput(e.target.value)}
                                       placeholder="Ask a question about this data..."
                                       className="flex-1 bg-slate-800 border border-slate-600 rounded text-xs px-2 py-1.5 focus:border-blue-500 outline-none text-white"
                                       onKeyDown={(e) => e.key === 'Enter' && handleTrainingChatSend()}
                                    />
                                    <button onClick={handleTrainingChatSend} className="bg-blue-600 p-1.5 rounded hover:bg-blue-500">
                                       <Send size={14} />
                                    </button>
                                 </div>
                              </div>

                              <button onClick={() => { setTrainingStep(0); setTrainingUrl(''); }} className="w-full mt-4 py-2 text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1">
                                 <RefreshCcw size={14} /> Try Another URL
                              </button>
                           </div>
                        )}
                     </div>
                     <div className="w-full md:w-1/3 bg-slate-900/50 p-8 flex flex-col justify-center gap-6">
                        <div className="flex items-start gap-4">
                           <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><FileText size={20} /></div>
                           <div>
                              <h4 className="font-bold text-sm">Any Document</h4>
                              <p className="text-xs text-slate-400 mt-1">PDF, DOCX, TXT. Manuals, menus, policies.</p>
                           </div>
                        </div>
                        <div className="flex items-start gap-4">
                           <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Globe size={20} /></div>
                           <div>
                              <h4 className="font-bold text-sm">Full Website Crawl</h4>
                              <p className="text-xs text-slate-400 mt-1">We scrape your entire site structure.</p>
                           </div>
                        </div>
                        <div className="flex items-start gap-4">
                           <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400"><Zap size={20} /></div>
                           <div>
                              <h4 className="font-bold text-sm">Instant Recall</h4>
                              <p className="text-xs text-slate-400 mt-1">No hallucination. Answers based purely on your data.</p>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* Phone Agent Demo */}
               {activeDemo === 'phone' && (
                  <div className="w-full h-full flex flex-col md:flex-row animate-fade-in">
                     <div className="flex-1 p-8 md:p-12 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-700">
                        <h3 className="text-2xl font-bold mb-4">Talk to your AI Receptionist</h3>
                        <p className="text-slate-400 mb-8">
                           Our Phone Agent answers calls, books appointments, and captures leads with a human-like voice.
                        </p>
                        <div className="bg-black/30 rounded-2xl p-6 border border-slate-600/50 relative overflow-hidden">
                           <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-3">
                                 <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${phoneStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                    <Phone size={24} className={phoneStatus === 'calling' ? 'animate-pulse' : ''} />
                                 </div>
                                 <div>
                                    <div className="font-bold">Apex Services</div>
                                    <div className="text-xs text-slate-400 capitalize">{phoneStatus === 'idle' ? 'Ready to Call' : phoneStatus}</div>
                                 </div>
                              </div>
                              <div className="text-xs text-slate-500 font-mono">00:{phoneStatus === 'connected' ? '12' : '00'}</div>
                           </div>
                           
                           <div className="space-y-3 max-h-48 overflow-y-auto pr-2 mb-6">
                              {phoneTranscript.length === 0 && (
                                 <div className="text-center text-slate-500 text-sm py-4 italic">Call to see transcript...</div>
                              )}
                              {phoneTranscript.map((line, i) => (
                                 <div key={i} className={`p-2 rounded-lg text-sm ${line.startsWith('You') ? 'bg-blue-900/30 text-blue-200 ml-8' : 'bg-slate-700/30 text-slate-300 mr-8'}`}>
                                    {line}
                                 </div>
                              ))}
                           </div>

                           <button 
                              onClick={handlePhoneDemoCall}
                              disabled={phoneStatus !== 'idle'}
                              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                 phoneStatus === 'idle' 
                                 ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                                 : 'bg-red-500/20 text-red-400 cursor-not-allowed'
                              }`}
                           >
                              {phoneStatus === 'idle' ? <><Phone size={20} /> Call Now</> : 'Call in Progress...'}
                           </button>
                        </div>
                     </div>
                     <div className="w-full md:w-1/3 bg-slate-900/50 p-8 flex flex-col justify-center gap-6">
                        <div className="flex items-start gap-4">
                           <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Zap size={20} /></div>
                           <div>
                              <h4 className="font-bold text-sm">Instant Response</h4>
                              <p className="text-xs text-slate-400 mt-1">Zero latency. Answers immediately, 24/7.</p>
                           </div>
                        </div>
                        <div className="flex items-start gap-4">
                           <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Smartphone size={20} /></div>
                           <div>
                              <h4 className="font-bold text-sm">Human Voice</h4>
                              <p className="text-xs text-slate-400 mt-1">Indistinguishable from a real person.</p>
                           </div>
                        </div>
                        <div className="flex items-start gap-4">
                           <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400"><LayoutDashboard size={20} /></div>
                           <div>
                              <h4 className="font-bold text-sm">Auto-Logging</h4>
                              <p className="text-xs text-slate-400 mt-1">Call transcripts saved to CRM automatically.</p>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* Lead CRM Demo */}
               {activeDemo === 'crm' && (
                  <div className="w-full h-full flex flex-col md:flex-row animate-fade-in">
                     <div className="w-full md:w-1/3 bg-slate-900 p-8 border-b md:border-b-0 md:border-r border-slate-700 flex flex-col justify-center gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-900/50 border border-orange-500/50 text-orange-300 text-xs font-bold uppercase tracking-wide mb-4">
                                <Flame size={12} fill="currentColor" /> Lead Intelligence
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Never Miss a Lead</h3>
                            <p className="text-slate-400 text-sm mb-6">
                                The AI scores every conversation. If a lead shows buying intent, it is instantly tagged as "Hot" and you get notified.
                            </p>
                            <button 
                                onClick={handleSimulateLead}
                                disabled={isSimulatingLead}
                                className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-500 transition shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                            >
                                {isSimulatingLead ? <Zap className="animate-spin" size={18}/> : <Plus size={18}/>} Simulate Incoming Lead
                            </button>
                        </div>
                        
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                             <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><Bell size={14}/> Live Notifications</h4>
                             <p className="text-xs text-slate-400">You receive alerts via:</p>
                             <div className="flex gap-2 mt-2">
                                <span className="bg-slate-700 px-2 py-1 rounded text-xs">SMS</span>
                                <span className="bg-slate-700 px-2 py-1 rounded text-xs">Email</span>
                                <span className="bg-slate-700 px-2 py-1 rounded text-xs">Slack</span>
                             </div>
                        </div>
                     </div>

                     <div className="flex-1 bg-slate-800 p-8 relative">
                        {/* Mock CRM UI */}
                        <div className="bg-white rounded-xl shadow-2xl overflow-hidden h-full flex flex-col">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                                <div className="font-bold text-slate-800 flex items-center gap-2"><Users size={16}/> Lead Pipeline</div>
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                </div>
                            </div>
                            <div className="flex-1 bg-slate-50 p-4 overflow-y-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-slate-400 text-xs uppercase font-semibold">
                                        <tr>
                                            <th className="pb-2">Lead Name</th>
                                            <th className="pb-2">Status</th>
                                            <th className="pb-2 text-right">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="space-y-2">
                                        {crmLeads.map((lead, i) => (
                                            <tr key={i} className={`bg-white border-b-4 border-slate-50 shadow-sm rounded-lg overflow-hidden animate-fade-in ${i === 0 && isSimulatingLead ? 'opacity-50' : 'opacity-100'}`}>
                                                <td className="p-3">
                                                    <div className="font-bold text-slate-800">{lead.name}</div>
                                                    <div className="text-xs text-slate-400">{lead.email}</div>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                        lead.status === 'Hot Lead' ? 'bg-orange-100 text-orange-600' :
                                                        lead.status === 'Qualified' ? 'bg-emerald-100 text-emerald-600' :
                                                        'bg-blue-100 text-blue-600'
                                                    }`}>
                                                        {lead.status === 'Hot Lead' && <Flame size={10} className="inline mr-1 fill-orange-500" />}
                                                        {lead.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <span className="font-bold text-slate-700">{lead.score}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Notification Toast Mock */}
                            {crmLeads.length > 2 && (
                                <div className="absolute bottom-4 right-4 bg-slate-900 text-white p-3 rounded-lg shadow-xl flex items-center gap-3 animate-bounce-slow text-sm max-w-xs">
                                    <div className="bg-red-500 p-2 rounded-full"><Bell size={14}/></div>
                                    <div>
                                        <div className="font-bold">Hot Lead Detected!</div>
                                        <div className="text-xs text-slate-300">John Resident just scored 95/100.</div>
                                    </div>
                                </div>
                            )}
                        </div>
                     </div>
                  </div>
               )}

               {/* Viral Post Demo */}
               {activeDemo === 'viral' && (
                  <div className="w-full h-full flex flex-col md:flex-row animate-fade-in">
                     <div className="flex-1 p-8 md:p-12 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-700">
                        <h3 className="text-2xl font-bold mb-4">Generate Viral Content</h3>
                        <p className="text-slate-400 mb-8">
                           Turn any topic into a high-engagement Twitter thread or LinkedIn post in seconds.
                        </p>
                        
                        <div className="bg-white rounded-xl p-1 shadow-lg">
                           <div className="flex gap-2 p-2">
                              <input 
                                 type="text" 
                                 placeholder="Enter a topic (e.g. Remote Work, Coffee, AI)"
                                 value={viralTopic}
                                 onChange={(e) => setViralTopic(e.target.value)}
                                 className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                              <button 
                                 onClick={handleViralGenerate}
                                 disabled={isGeneratingViral || !viralTopic}
                                 className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
                              >
                                 {isGeneratingViral ? <Zap className="animate-spin" size={16}/> : 'Generate'}
                              </button>
                           </div>
                        </div>

                        {viralResult && (
                           <div className="mt-6 bg-black rounded-xl p-6 border border-slate-800 animate-fade-in">
                              <div className="flex gap-3 mb-3">
                                 <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">AF</div>
                                 <div>
                                    <div className="font-bold text-white flex items-center gap-1">{viralResult.user} <span className="text-blue-400"><CheckCircle size={12} fill="currentColor" /></span></div>
                                    <div className="text-slate-500 text-xs">{viralResult.handle}</div>
                                 </div>
                              </div>
                              <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed mb-4">
                                 {viralResult.content}
                              </p>
                              <div className="flex items-center justify-between text-slate-500 text-xs border-t border-slate-800 pt-3">
                                 <span className="flex items-center gap-1 hover:text-pink-500 transition"><Flame size={14} /> {viralResult.likes}</span>
                                 <span className="flex items-center gap-1 hover:text-green-500 transition"><TrendingUp size={14} /> {viralResult.retweets}</span>
                                 <span className="flex items-center gap-1 hover:text-blue-500 transition"><Megaphone size={14} /> Share</span>
                              </div>
                           </div>
                        )}
                     </div>
                     <div className="w-full md:w-1/3 bg-slate-900/50 p-8 flex flex-col justify-center">
                        <div className="text-center">
                           <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Target size={32} />
                           </div>
                           <h4 className="font-bold text-lg mb-2">Platform Optimized</h4>
                           <p className="text-sm text-slate-400">
                              Our AI understands the algorithm. It writes hooks, threads, and CTAs that actually convert.
                           </p>
                        </div>
                     </div>
                  </div>
               )}

               {/* Website Demo */}
               {activeDemo === 'site' && (
                  <div className="w-full h-full flex flex-col md:flex-row animate-fade-in">
                     <div className="w-full md:w-1/3 bg-slate-800 p-8 border-b md:border-b-0 md:border-r border-slate-700 flex flex-col justify-center">
                        <h3 className="text-2xl font-bold mb-6">Instant Website</h3>
                        <div className="space-y-4">
                           <div>
                              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Business Name</label>
                              <input 
                                 type="text" 
                                 value={siteName}
                                 onChange={(e) => setSiteName(e.target.value)}
                                 placeholder="e.g. Joe's Coffee"
                                 className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                              />
                           </div>
                           <div>
                              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Industry</label>
                              <select 
                                 value={siteIndustry}
                                 onChange={(e) => setSiteIndustry(e.target.value)}
                                 className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                              >
                                 <option>Coffee Shop</option>
                                 <option>Real Estate</option>
                                 <option>Gym</option>
                                 <option>Consulting</option>
                                 <option>City Government</option>
                              </select>
                           </div>
                           <button 
                              onClick={handleSiteBuild}
                              disabled={isBuildingSite || !siteName}
                              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 mt-2"
                           >
                              {isBuildingSite ? 'Building...' : 'Generate Site'}
                           </button>
                        </div>
                     </div>
                     <div className="flex-1 bg-slate-900 p-8 flex items-center justify-center relative">
                        {/* Mock Browser Window */}
                        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all duration-500 hover:scale-105">
                           <div className="bg-slate-100 p-2 flex items-center gap-2 border-b border-slate-200">
                              <div className="flex gap-1">
                                 <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                 <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                                 <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                              </div>
                              <div className="bg-white px-2 py-0.5 rounded text-[8px] text-slate-400 flex-1 text-center font-mono">
                                 {siteName ? `${siteName.toLowerCase().replace(/\s/g,'')}.com` : 'your-site.com'}
                              </div>
                           </div>
                           
                           {generatedSite ? (
                              <div className="animate-fade-in">
                                 <div className={`h-32 text-white flex flex-col items-center justify-center text-center p-4 ${siteIndustry === 'City Government' ? 'bg-slate-800' : 'bg-blue-900'}`}>
                                    {siteIndustry === 'City Government' && <Landmark size={24} className="mb-2 text-white/80"/>}
                                    <h1 className="text-xl font-bold mb-2">{generatedSite.name}</h1>
                                    <p className="text-[10px] opacity-80 max-w-[200px]">{generatedSite.headline}</p>
                                 </div>
                                 <div className="p-6">
                                    <h2 className="text-sm font-bold text-slate-800 mb-2">{siteIndustry === 'City Government' ? 'City Services' : 'About Us'}</h2>
                                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                       {generatedSite.subheadline}
                                    </p>
                                    <button className={`w-full text-white py-2 rounded text-xs font-bold shadow-md ${siteIndustry === 'City Government' ? 'bg-slate-700' : 'bg-emerald-500'}`}>
                                       {generatedSite.cta}
                                    </button>
                                 </div>
                              </div>
                           ) : (
                              <div className="h-64 flex flex-col items-center justify-center text-slate-300">
                                 <Layout size={48} className="mb-2 opacity-20" />
                                 <p className="text-xs">Waiting to generate...</p>
                              </div>
                           )}
                        </div>
                        
                        {generatedSite && (
                           <div className="absolute bottom-10 right-10 bg-emerald-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-bounce-slow flex items-center gap-2">
                              <CheckCircle size={14} /> Site Ready!
                           </div>
                        )}
                     </div>
                  </div>
               )}

            </div>
         </div>
      </section>

      {/* Value Prop: Industries */}
      <section id="industries" className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Who is this for?</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">BuildMyBot powers the immediate response engine for thousands of industries.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {industries.map((ind, i) => (
              <div key={i} className="p-8 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-xl transition-all duration-300 border border-slate-100 group">
                <div className={`w-12 h-12 bg-${ind.color}-100 text-${ind.color}-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <ind.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{ind.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {ind.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlight: Hot Leads */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-900/10 rounded-l-full blur-3xl"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/50 border border-red-500/50 text-red-300 text-xs font-bold uppercase tracking-wide mb-6">
                 <Flame size={12} fill="currentColor" /> Hot Lead System
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
                It doesn't just chat. <br/>
                <span className="text-blue-400">It closes deals.</span>
              </h2>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                Most chatbots are passive. Ours is proactive. It scores every conversation in real-time based on intent, budget, and urgency.
              </p>
              
              <div className="space-y-6">
                 <div className="flex gap-4">
                   <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xl">1</div>
                   <div>
                     <h4 className="font-bold text-lg">Qualifies Automatically</h4>
                     <p className="text-slate-400 text-sm">The AI identifies who is "just looking" vs who is ready to buy.</p>
                   </div>
                 </div>
                 <div className="flex gap-4">
                   <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-xl">2</div>
                   <div>
                     <h4 className="font-bold text-lg">Triggers "Hot Lead" Status</h4>
                     <p className="text-slate-400 text-sm">When score &gt; 80, the bot asks for name & phone number.</p>
                   </div>
                 </div>
                 <div className="flex gap-4">
                   <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xl">3</div>
                   <div>
                     <h4 className="font-bold text-lg">Notifies You Instantly</h4>
                     <p className="text-slate-400 text-sm">You get an SMS or Email immediately. You jump in and close.</p>
                   </div>
                 </div>
              </div>
            </div>

            <div className="relative">
               {/* Phone Mockup */}
               <div className="bg-slate-800 rounded-[2.5rem] p-4 border-8 border-slate-700 shadow-2xl max-w-sm mx-auto transform rotate-3 hover:rotate-0 transition duration-500">
                  <div className="bg-slate-900 rounded-[2rem] overflow-hidden h-[500px] flex flex-col relative">
                     {/* Notch */}
                     <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>
                     
                     {/* Lock Screen Notification */}
                     <div className="mt-16 mx-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-lg animate-pulse">
                           <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center"><Bot size={14} className="text-white"/></div>
                                <span className="text-xs font-bold text-white">BuildMyBot • Now</span>
                              </div>
                           </div>
                           <p className="text-white font-semibold text-sm">🔥 Hot Lead Detected!</p>
                           <p className="text-slate-300 text-xs mt-1">John Doe wants to buy the Enterprise plan. Phone: (555) 012-3456.</p>
                        </div>
                     </div>

                     {/* Chat Screen Background */}
                     <div className="mt-auto p-4 space-y-3">
                        <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-br-none text-xs self-end ml-12">I'm ready to move forward. Can we talk pricing?</div>
                        <div className="bg-slate-700 text-white p-3 rounded-2xl rounded-bl-none text-xs self-start mr-12">Absolutely! What's the best number to reach you at right now?</div>
                        <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-br-none text-xs self-end ml-12">555-012-3456</div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-slate-50">
        <div className="max-w-[90rem] mx-auto">
           <div className="text-center mb-16">
             <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Pricing that Scales with You</h2>
             <p className="text-lg text-slate-600">Start for free. Upgrade as you grow.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {Object.entries(PLANS).map(([key, plan]: [string, any]) => {
                const isEnterprise = key === PlanType.ENTERPRISE;
                const isProfessional = key === PlanType.PROFESSIONAL;

                return (
                  <div key={key} className={`p-8 rounded-2xl border flex flex-col transition-all hover:shadow-xl ${
                    isProfessional 
                      ? 'border-blue-900 shadow-xl ring-1 ring-blue-900 relative z-10 scale-105 bg-white' 
                      : isEnterprise
                        ? 'border-slate-800 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white'
                  }`}>
                    {isProfessional && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-900 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Most Popular</div>
                    )}
                    {isEnterprise && (
                      <div className="mb-2 inline-flex items-center gap-1 text-yellow-400 font-bold text-xs uppercase tracking-wide"><Crown size={12} fill="currentColor"/> Ultimate Power</div>
                    )}
                    
                    <h3 className={`text-lg font-bold ${isEnterprise ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                    <div className="mt-4 mb-6">
                      <span className={`text-4xl font-extrabold ${isEnterprise ? 'text-white' : 'text-slate-900'}`}>${plan.price}</span>
                      <span className={`${isEnterprise ? 'text-slate-400' : 'text-slate-500'}`}>/mo</span>
                    </div>
                    
                    <ul className="space-y-4 mb-8 flex-1">
                      <li className={`flex items-center gap-3 text-sm ${isEnterprise ? 'text-slate-300' : 'text-slate-700'}`}>
                        <CheckCircle size={16} className={`${isEnterprise ? 'text-yellow-400' : 'text-emerald-500'} shrink-0`}/> 
                        {plan.bots >= 9999 ? 'Unlimited' : plan.bots} Bot(s)
                      </li>
                      <li className={`flex items-center gap-3 text-sm ${isEnterprise ? 'text-slate-300' : 'text-slate-700'}`}>
                        <CheckCircle size={16} className={`${isEnterprise ? 'text-yellow-400' : 'text-emerald-500'} shrink-0`}/> 
                        <span className="font-bold">{plan.conversations.toLocaleString()}</span>&nbsp;Conversations
                      </li>
                      <li className={`flex items-center gap-3 text-sm ${isEnterprise ? 'text-slate-300' : 'text-slate-700'}`}>
                        <CheckCircle size={16} className={`${isEnterprise ? 'text-yellow-400' : 'text-emerald-500'} shrink-0`}/> 
                        {isEnterprise ? 'Enterprise Analytics' : 'Basic Analytics'}
                      </li>
                      {isEnterprise && (
                        <>
                           <li className="flex items-center gap-3 text-sm text-slate-300">
                             <CheckCircle size={16} className="text-yellow-400 shrink-0"/> White-label Ready
                           </li>
                           <li className="flex items-center gap-3 text-sm text-slate-300">
                             <CheckCircle size={16} className="text-yellow-400 shrink-0"/> SLA Support
                           </li>
                        </>
                      )}
                    </ul>
                    
                    <button onClick={onLogin} className={`w-full py-3 rounded-lg font-bold transition ${
                      isProfessional 
                        ? 'bg-blue-900 text-white hover:bg-blue-950' 
                        : isEnterprise
                          ? 'bg-white text-slate-900 hover:bg-slate-200'
                          : 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50'
                    }`}>
                      {isEnterprise ? 'Get Enterprise' : `Choose ${plan.name}`}
                    </button>
                  </div>
                );
              })}
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
           <div className="col-span-1 md:col-span-1">
             <div className="flex items-center gap-2 font-bold text-xl text-white mb-4">
                <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center text-white">
                  <Bot size={20} />
                </div>
                BuildMyBot
             </div>
             <p className="text-sm">The intelligent workforce for modern businesses.</p>
           </div>
           <div>
             <h4 className="text-white font-bold mb-4">Product</h4>
             <ul className="space-y-2 text-sm">
               <li><button onClick={() => openModal('features')} className="hover:text-white transition">Features</button></li>
               <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
               <li><button onClick={onLogin} className="hover:text-white transition">Login</button></li>
             </ul>
           </div>
           <div>
             <h4 className="text-white font-bold mb-4">Company</h4>
             <ul className="space-y-2 text-sm">
               <li><button onClick={() => openModal('about')} className="hover:text-white transition">About Us</button></li>
               <li><button onClick={() => openModal('contact')} className="hover:text-white transition">Contact</button></li>
               {onNavigateToPartner && (
                  <li><button onClick={onNavigateToPartner} className="hover:text-white transition font-bold text-blue-400">Partner Program</button></li>
               )}
             </ul>
           </div>
           <div>
             <h4 className="text-white font-bold mb-4">Legal</h4>
             <ul className="space-y-2 text-sm">
               <li><button onClick={() => openModal('privacy')} className="hover:text-white transition">Privacy Policy</button></li>
               <li><button onClick={() => openModal('terms')} className="hover:text-white transition">Terms of Service</button></li>
             </ul>
           </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-800 text-center text-xs flex justify-between items-center">
          <span>© 2024 BuildMyBot.app. All rights reserved.</span>
          <div className="flex items-center gap-4">
             {onAdminLogin && (
                <button onClick={onAdminLogin} className="opacity-10 hover:opacity-50 transition">Admin Portal</button>
             )}
             <span className="flex items-center gap-1 opacity-50"><Globe size={12}/> Vercel Deployed</span>
          </div>
        </div>
      </footer>
    </div>
  );
};