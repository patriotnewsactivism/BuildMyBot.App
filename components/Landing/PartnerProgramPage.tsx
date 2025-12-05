
import React, { useState } from 'react';
import { CheckCircle, DollarSign, TrendingUp, Users, ArrowRight, Calculator, Shield, Zap, Globe, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { RESELLER_TIERS } from '../../constants';

interface PartnerProps {
  onBack: () => void;
  onLogin: () => void;
  onSignup: () => void;
}

export const PartnerProgramPage: React.FC<PartnerProps> = ({ onBack, onLogin, onSignup }) => {
  // Calculator State
  const [clientCount, setClientCount] = useState(25);
  const [avgPrice, setAvgPrice] = useState(99);

  // Calculate earnings based on tiers
  const currentTier = RESELLER_TIERS.find(t => clientCount >= t.min && clientCount <= t.max) || RESELLER_TIERS[RESELLER_TIERS.length - 1];
  const monthlyRevenue = clientCount * avgPrice;
  const partnerCommission = monthlyRevenue * currentTier.commission;
  const annualIncome = partnerCommission * 12;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* Nav */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-md z-30 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-slate-900 cursor-pointer" onClick={onBack}>
            <ArrowLeft size={20} className="text-slate-500 hover:text-blue-900" />
            <span className="hidden md:inline">Back to Home</span>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={onLogin} className="text-sm font-medium text-slate-600 hover:text-blue-900">Log in</button>
             <button onClick={onSignup} className="px-5 py-2 bg-blue-900 text-white rounded-lg text-sm font-bold hover:bg-blue-950 transition shadow-lg shadow-blue-900/30">
               Apply Now
             </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/10 rounded-l-full blur-3xl"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/50 border border-blue-500/50 text-blue-300 text-xs font-bold uppercase tracking-wide mb-6">
             Partner Program
           </div>
           <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
             Build Your Own AI Agency. <br/>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Keep up to 50% Revenue.</span>
           </h1>
           <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
             White-label our technology. You sell the solution to local businesses, we handle the AI infrastructure. Zero coding required.
           </p>
           <button onClick={onSignup} className="px-8 py-4 bg-white text-slate-900 rounded-xl text-lg font-bold hover:bg-slate-100 transition shadow-xl flex items-center justify-center gap-2 mx-auto">
             Start Your Agency <ArrowRight size={20} />
           </button>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-12 bg-slate-900">
         <div className="max-w-6xl mx-auto px-6">
            <div className="relative rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
               <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10"></div>
               <div className="bg-[#0f172a] p-4 flex items-center gap-2 border-b border-slate-800">
                  <div className="flex gap-1.5">
                     <div className="w-3 h-3 rounded-full bg-red-500"></div>
                     <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                     <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="bg-slate-800 text-slate-400 text-xs px-3 py-1 rounded text-center w-64 mx-auto font-mono">
                     partner.buildmybot.app/dashboard
                  </div>
               </div>
               {/* Mock Dashboard UI */}
               <div className="bg-slate-50 p-8 grid grid-cols-1 md:grid-cols-4 gap-6 h-[400px]">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-1">
                     <p className="text-slate-500 text-xs uppercase font-bold mb-2">Total Revenue</p>
                     <p className="text-3xl font-bold text-slate-800">$12,450</p>
                     <div className="mt-4 h-2 w-full bg-slate-100 rounded-full"><div className="w-3/4 h-full bg-blue-900 rounded-full"></div></div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-1">
                     <p className="text-slate-500 text-xs uppercase font-bold mb-2">Active Clients</p>
                     <p className="text-3xl font-bold text-slate-800">42</p>
                     <div className="mt-4 flex -space-x-2">
                        {[1,2,3,4].map(i => <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>)}
                     </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-2">
                     <p className="text-slate-500 text-xs uppercase font-bold mb-4">Commission Payouts</p>
                     <div className="flex items-end gap-2 h-32">
                        {[40, 60, 45, 70, 85, 60, 95].map((h, i) => (
                           <div key={i} className="flex-1 bg-emerald-100 rounded-t-sm relative group">
                              <div className="absolute bottom-0 w-full bg-emerald-500 rounded-t-sm transition-all group-hover:bg-emerald-600" style={{height: `${h}%`}}></div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
               <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="bg-slate-900/80 backdrop-blur-sm p-6 rounded-2xl border border-white/10 text-center">
                     <h3 className="text-2xl font-bold text-white mb-2">Partner Dashboard</h3>
                     <p className="text-slate-300 mb-4">Track clients, commissions, and payouts in real-time.</p>
                     <button onClick={onSignup} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition">View Live Demo</button>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Transparency / Tiers Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Transparent Commission Structure</h2>
            <p className="text-lg text-slate-600">The more you sell, the more you keep. We are vested in your growth.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {RESELLER_TIERS.map((tier, idx) => (
              <div key={idx} className={`p-8 rounded-2xl border transition-all duration-300 ${
                tier.label === 'Platinum' ? 'bg-slate-900 text-white border-slate-800 shadow-xl scale-105' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <h3 className={`font-bold text-lg mb-2 ${tier.label === 'Platinum' ? 'text-blue-400' : 'text-slate-500'}`}>{tier.label} Partner</h3>
                <div className="text-4xl font-extrabold mb-1">{(tier.commission * 100)}%</div>
                <div className={`text-sm mb-6 ${tier.label === 'Platinum' ? 'text-slate-400' : 'text-slate-500'}`}>Commission</div>
                
                <div className={`py-2 px-3 rounded-lg text-xs font-mono mb-4 inline-block ${
                   tier.label === 'Platinum' ? 'bg-white/10' : 'bg-slate-100'
                }`}>
                  {tier.max > 100000 ? `${tier.min}+ Clients` : `${tier.min} - ${tier.max} Clients`}
                </div>

                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle size={14} className={tier.label === 'Platinum' ? 'text-emerald-400' : 'text-emerald-600'}/> White-label Dashboard</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className={tier.label === 'Platinum' ? 'text-emerald-400' : 'text-emerald-600'}/> Client Management</li>
                  {tier.commission >= 0.4 && (
                     <li className="flex items-center gap-2"><CheckCircle size={14} className={tier.label === 'Platinum' ? 'text-emerald-400' : 'text-emerald-600'}/> Dedicated Acct Manager</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings Calculator */}
      <section className="py-20 px-6 bg-slate-50 border-y border-slate-200">
         <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
               <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wide mb-6">
                    <Calculator size={14} /> Revenue Calculator
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-6">Calculate Your Potential</h2>
                  <p className="text-slate-600 mb-8">
                    See exactly how much recurring revenue you can generate. Drag the sliders to simulate your growth.
                  </p>
                  
                  <div className="space-y-8">
                    <div>
                       <div className="flex justify-between mb-2">
                         <label className="font-bold text-slate-700">Active Clients</label>
                         <span className="text-blue-900 font-bold bg-blue-50 px-3 py-1 rounded-lg">{clientCount}</span>
                       </div>
                       <input 
                         type="range" min="1" max="500" step="1" 
                         value={clientCount} onChange={(e) => setClientCount(parseInt(e.target.value))}
                         className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-900"
                       />
                       <div className="flex justify-between text-xs text-slate-400 mt-2">
                         <span>1 Client</span>
                         <span>500 Clients</span>
                       </div>
                    </div>

                    <div>
                       <div className="flex justify-between mb-2">
                         <label className="font-bold text-slate-700">Avg. Monthly Price You Charge</label>
                         <span className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-lg">${avgPrice}</span>
                       </div>
                       <input 
                         type="range" min="49" max="499" step="10" 
                         value={avgPrice} onChange={(e) => setAvgPrice(parseInt(e.target.value))}
                         className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                       />
                       <div className="flex justify-between text-xs text-slate-400 mt-2">
                         <span>$49/mo</span>
                         <span>$499/mo</span>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100 to-transparent rounded-bl-full opacity-50"></div>
                  
                  <div className="mb-8">
                     <p className="text-slate-500 font-medium mb-1">Your Commission Tier</p>
                     <div className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                        {currentTier.label} <span className="text-lg text-slate-400 font-normal">({(currentTier.commission * 100)}%)</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-slate-100">
                     <div>
                        <p className="text-slate-500 text-sm mb-1">Total Generated</p>
                        <p className="text-xl font-bold text-slate-900">${monthlyRevenue.toLocaleString()}<span className="text-xs text-slate-400 font-normal">/mo</span></p>
                     </div>
                     <div>
                        <p className="text-slate-500 text-sm mb-1">Platform Cost</p>
                        <p className="text-xl font-bold text-slate-400">${(monthlyRevenue - partnerCommission).toLocaleString()}<span className="text-xs text-slate-300 font-normal">/mo</span></p>
                     </div>
                  </div>

                  <div>
                     <p className="text-slate-600 font-bold mb-2">Your Take Home Income</p>
                     <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-5xl font-extrabold text-emerald-600">${partnerCommission.toLocaleString()}</span>
                        <span className="text-slate-500 font-medium">/ month</span>
                     </div>
                     <p className="text-sm text-slate-400">That's <span className="font-bold text-slate-600">${annualIncome.toLocaleString()}</span> per year.</p>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12 px-6 text-center">
         <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to launch?</h2>
         <p className="text-slate-500 mb-8">Join 1,000+ agencies building on BuildMyBot.</p>
         <button onClick={onSignup} className="px-8 py-3 bg-blue-900 text-white rounded-lg font-bold hover:bg-blue-950 shadow-lg">
            Create Partner Account
         </button>
         <div className="mt-8 pt-8 border-t border-slate-200 text-xs text-slate-400">
             © 2025 BuildMyBot.app. All rights reserved. • Houston, TX
         </div>
      </footer>
    </div>
  );
};
