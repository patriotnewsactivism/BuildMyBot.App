import React, { useState, useEffect, useRef } from 'react';
import { Bot, Zap, CheckCircle, Globe, ArrowRight, X, Play, LayoutDashboard, MessageSquare, Users, TrendingUp, Flame, Smartphone, Bell, Target, Briefcase, Instagram, DollarSign, Crown, Menu } from 'lucide-react';
import { PLANS } from '../../constants';
import { PlanType } from '../../types';
import { generateBotResponse } from '../../services/geminiService';

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
            title = 'Platform Features';
            content = (
                <ul className="space-y-3">
                    <li className="flex items-start gap-2"><CheckCircle size={16} className="text-emerald-500 mt-1"/> <strong>GPT-4o Intelligence:</strong> Understands nuance, sarcasm, and intent better than any other model.</li>
                    <li className="flex items-start gap-2"><CheckCircle size={16} className="text-emerald-500 mt-1"/> <strong>Hot Lead Detection:</strong> Automatically scores leads based on conversation quality.</li>
                    <li className="flex items-start gap-2"><CheckCircle size={16} className="text-emerald-500 mt-1"/> <strong>Instant Alerts:</strong> Get an SMS or Email the second a lead is qualified.</li>
                    <li className="flex items-start gap-2"><CheckCircle size={16} className="text-emerald-500 mt-1"/> <strong>Visual Builder:</strong> Drag-and-drop customization. No coding required.</li>
                </ul>
            );
            break;
        default:
            return null;
    }

    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in">
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
                      <div className="text-center text-[10px] text-slate-400 font-medium uppercase tracking-wider my-2">Powered by GPT-4o</div>
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
            <button onClick={() => openModal('features')} className="hover:text-blue-900 transition">Features</button>
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
             <button onClick={() => {openModal('features'); setMobileMenuOpen(false);}} className="text-left font-medium text-slate-600 py-2">Features</button>
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
             Stop trading time for money. The ultimate AI workforce that answers questions, books appointments, and identifies hot leads 24/7.
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
                   <div className="bg-white border border-slate-200 px-3 py-1 rounded text-[10px] text-slate-400 font-mono w-64 text-center">app.buildmybot.io/dashboard</div>
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
                         <div className="text-slate-400 px-3 py-2 rounded-lg text-sm flex items-center gap-3"><MessageSquare size={16}/> Conversations</div>
                         <div className="text-slate-400 px-3 py-2 rounded-lg text-sm flex items-center gap-3"><Users size={16}/> Lead CRM</div>
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

      {/* Value Prop: Industries */}
      <section id="industries" className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Who is this for?</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">BuildMyBot is the engine behind thousands of growing businesses.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-8 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-xl transition-all duration-300 border border-slate-100">
              <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center mb-6">
                <Instagram size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Influencers</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                You have thousands of DMs. Let AI engage your fans, answer FAQs, and promote your merch while you sleep.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-xl transition-all duration-300 border border-slate-100">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Briefcase size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Service Business</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Plumbers, Dentists, Lawyers. Stop playing phone tag. The bot books appointments and qualifies clients instantly.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-xl transition-all duration-300 border border-slate-100">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                <Target size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Lead Gen Experts</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Don't waste ad spend on slow follow-ups. The bot engages leads within seconds of a click, increasing conversion by 300%.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-xl transition-all duration-300 border border-slate-100">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <DollarSign size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Agencies</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                White-label our platform. Sell AI chatbots to your clients under your own brand and keep 100% of the markup.
              </p>
            </div>
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
                     <p className="text-slate-400 text-sm">When score > 80, the bot asks for name & phone number.</p>
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